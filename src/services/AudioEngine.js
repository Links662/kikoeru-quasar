import axios from 'axios'
import Lyric from 'lrc-file-parser'
import { LocalStorage, SessionStorage } from 'quasar'

// 播放进度写库间隔（秒）
const HISTORY_UPDATE_INTERVAL = 30
// 外部暂停的确认延迟（毫秒）
const PAUSE_INTENT_DELAY = 250

function formatSeconds (seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds / 60) % 60)
  const s = Math.floor(seconds % 60)
  const pad = (value) => (value < 10 ? `0${value}` : `${value}`)

  return h === 0
    ? `${pad(m)}:${pad(s)}`
    : `${h}:${pad(m)}:${pad(s)}`
}

let engineInstance = null

export function setAudioEngine (engine) {
  engineInstance = engine
}

// 播放引擎单例。尚未初始化时返回 null
export function audioEngine () {
  return engineInstance
}

/**
 * 播放引擎
 *
 * 与 Vue 组件、路由、布局的生命周期完全解耦：
 * <audio> 元素在应用启动时创建并挂到 document.body，之后只由 Vuex store 驱动，
 * 不会随页面组件销毁。因此切换路由、切换 layout（例如进入 /admin 设置页）都不会打断播放。
 *
 * 数据流：
 *   UI 组件 --commit mutation--> store --watch--> 引擎（操作媒体元素）
 *   媒体元素 --事件--> 引擎 --commit mutation--> store --> UI 组件
 *
 * 停止播放只应该由语义动作触发（用户点暂停、队列清空、登出等认证边界），
 * 而不是由"某个组件恰好被销毁"这种副作用触发。
 */
export default class AudioEngine {
  constructor ({ store, notify }) {
    this.store = store
    this.notify = notify || {}

    this.media = null
    this.lrc = null

    this.watchers = []
    this.mediaHandlers = []

    this.pauseIntentTimer = null
    this.sleepTimer = null

    // 应用期望播放的源 / 媒体元素已就绪的源（均为绝对 URL）
    this.desiredSource = ''
    this.readySource = ''

    // 上一次写入历史的文件快照，切歌时用来把上一首的进度落库
    this.lastHistoryFile = null
    this.lastHistoryUpdateTime = 0
    this.dontResume = false
    // 正在进行程序性停止（登出），期间忽略 pause 事件
    this.stopping = false
  }

  get state () {
    return this.store.state.AudioPlayer
  }

  get currentTrack () {
    return this.store.getters['AudioPlayer/currentTrack']
  }

  get currentWork () {
    return this.store.getters['AudioPlayer/currentWork']
  }

  get token () {
    return LocalStorage.getItem('jwt-token') || ''
  }

  get coverUrl () {
    const id = this.currentWork.id
    return id ? `/api/cover/${id}?token=${this.token}` : ''
  }

  // NSFW 模式（MainLayout 里切换、CSS 里生效的同一个本地偏好）
  get nsfwMode () {
    return LocalStorage.getItem('nsfwMode') === 'true'
  }

  commit (type, payload) {
    this.store.commit(`AudioPlayer/${type}`, payload)
  }

  // ------------------------------------------------------------------
  // 生命周期
  // ------------------------------------------------------------------

  init () {
    if (this.media !== null) return this

    const media = new Audio()
    media.setAttribute('crossorigin', 'anonymous')
    // 引擎元素必须留在文档里，脱离文档的媒体元素在各浏览器上行为不一致
    media.style.display = 'none'
    const host = document.body || document.documentElement
    host.appendChild(media)

    this.media = media
    this.bindMediaEvents()
    this.bindStore()
    this.initLrc()
    this.applyStoredAudioState()

    return this
  }

  // 正常运行时引擎与页面同生命周期，这个方法是给页面卸载/测试用的
  destroy () {
    this.clearPauseIntentTimer()
    this.clearSleepTimer()

    this.watchers.forEach((unwatch) => unwatch())
    this.watchers = []

    if (this.media !== null) {
      this.mediaHandlers.forEach(([event, handler]) => {
        this.media.removeEventListener(event, handler)
      })
      this.mediaHandlers = []
      this.media.pause()
      this.media.removeAttribute('src')
      this.media.load()
      if (this.media.parentNode) {
        this.media.parentNode.removeChild(this.media)
      }
      this.media = null
    }
  }

  bindMediaEvents () {
    this.mediaHandlers = [
      ['loadedmetadata', () => this.resumePlayHistory()],
      ['canplay', () => this.onCanplay()],
      ['timeupdate', () => this.onTimeupdate()],
      ['ended', () => this.onEnded()],
      ['playing', () => this.onPlaying()],
      ['waiting', () => this.onWaiting()],
      ['seeked', () => this.onSeeked()],
      ['pause', () => this.onPause()]
    ]

    this.mediaHandlers.forEach(([event, handler]) => {
      this.media.addEventListener(event, handler)
    })
  }

  bindStore () {
    const watch = (getter, handler) => this.store.watch(getter, handler)

    this.watchers = [
      watch(state => state.AudioPlayer.playing, flag => this.onPlayingIntent(flag)),
      watch((state, getters) => getters['AudioPlayer/currentTrack'].mediaStreamUrl, () => this.onSourceChanged()),
      watch(state => state.AudioPlayer.muted, flag => { this.media.muted = Boolean(flag) }),
      watch(state => state.AudioPlayer.volume, value => this.applyVolume(value)),
      watch(state => state.AudioPlayer.seekTime, time => this.onSeekRequest(time)),
      watch(state => state.AudioPlayer.sleepMode, () => this.scheduleSleepTimer()),
      watch(state => state.AudioPlayer.sleepTime, () => this.scheduleSleepTimer())
    ]
  }

  applyStoredAudioState () {
    this.media.muted = Boolean(this.state.muted)
    // 与旧实现保持一致：启动时以媒体元素的默认音量为准
    this.commit('SET_VOLUME', this.media.volume)
    this.refreshElementPlaying()
  }

  // ------------------------------------------------------------------
  // store -> 媒体元素
  // ------------------------------------------------------------------

  onPlayingIntent (flag) {
    if (flag === true) {
      this.playIfReady()
      return
    }

    this.media.pause()
    // 元素本来就已经暂停时不会再派发 pause 事件，这里按元素状态补采样一次
    this.refreshElementPlaying()
  }

  applyVolume (value) {
    // 屏蔽非法数值
    if (value < 0 || value > 1) return

    this.media.volume = value
  }

  onSeekRequest (time) {
    if (time >= 0) {
      this.media.currentTime = time
      this.commit('SET_SEEKTIME', -1)

      // 部分浏览器（iOS）跳转时会自行暂停，按用户意图继续播放
      if (this.state.playing) {
        this.playSafely()
      }
    }
  }

  // 换源：watch source -> media.load() -> canplay -> play()
  onSourceChanged () {
    const url = this.resolveSource()

    // 换源前先把上一首的进度落库（此时 currentTime 仍属于上一首）。
    // 快照只记曲目自己的字段：写历史时 work_id 仍从 hash 里取，
    // 因为此刻 store 里可能已经换成了新队列（新作品）
    this.flushPreviousHistory()
    this.lastHistoryFile = { hash: this.currentTrack.hash, title: this.currentTrack.title }

    this.desiredSource = url
    // 新源就绪前不允许自动播放
    this.readySource = ''
    // 新曲目从 0 开始计时，否则要等超过上一首的进度才写历史
    this.lastHistoryUpdateTime = 0

    if (url === '') {
      this.media.pause()
      this.media.removeAttribute('src')
      this.media.load()
      this.refreshElementPlaying()

      // 没有曲目了，歌词也一起清掉（歌词按钮会跟着变灰、面板会收起）
      this.commit('SET_LYRIC_AVAILABLE', false)
      this.commit('SET_LYRIC_LOADING', false)
      this.commit('SET_CURRENT_LYRIC', '')
      if (this.lrc) this.lrc.setLyric('')

      return
    }

    this.media.src = url
    // 加载新的音频文件
    this.media.load()
    this.loadLrcFile()
  }

  resolveSource () {
    const url = this.currentTrack.mediaStreamUrl
    if (!url) return ''

    const withToken = `${url}?token=${this.token}`

    try {
      // currentSrc 始终是绝对 URL，两者必须用同一种形式比较
      return new URL(withToken, window.location.href).href
    } catch (e) {
      return withToken
    }
  }

  // ------------------------------------------------------------------
  // 媒体元素 -> store
  // ------------------------------------------------------------------

  /**
   * 外部暂停（线控暂停、软件切换）、用户主动暂停、seek 都会触发本事件。
   * 注意：其中只有前两种代表用户的真实意图，换源/跳转/缓冲产生的暂停不能改写播放状态。
   */
  onPause () {
    // 事实：元素确实停了（只记录事实，不碰意图）
    this.commit('SET_ELEMENT_PLAYING', false)

    // 歌词挂在库自己的定时器上，元素停了它也会继续往前走，
    // 所以这里必须显式停一下，否则暂停后歌词还在自己滚
    this.playLrc(false)

    // 程序性停止（登出）导致的暂停，不作为用户意图处理
    if (this.stopping === true) return
    // 换源过程中的暂停（新源还没就绪）不是用户意图，忽略
    if (this.readySource !== this.desiredSource) return
    // 跳转过程中的暂停是瞬时状态，忽略
    if (this.media.seeking === true) return

    if (this.state.playing !== true) {
      // 意图本来就是暂停：两个字段一致，只补一次进度
      this.savePlayHistory()
      return
    }

    // 意图仍是播放，但事实是停了：延迟确认是外部暂停还是瞬时抖动
    this.schedulePauseIntentCheck()
  }

  onPlaying () {
    // 事实：元素真的开始出声了
    this.commit('SET_ELEMENT_PLAYING', true)
    this.playLrc(true)

    // 事实与意图不一致，且不是我们发起的：外部控制（线控、锁屏、播放器自行恢复），采纳为意图
    if (this.state.playing !== true) {
      this.commit('PLAY')
    }
  }

  onWaiting () {
    // 缓冲时元素并没有被暂停（paused 仍为 false），事实和意图都不变，等 playing / canplay 事件
    this.playLrc(false)
  }

  /**
   * 跳转完成后，歌词的计时基准还停在跳转前的位置（库内部按自己的时钟往前走），
   * 不重新 play() 一次的话，显示的会一直是被跳过的那一句。
   */
  onSeeked () {
    if (this.state.lyricAvailable !== true) return
    if (this.state.playing !== true) return

    this.lrc.play(this.media.currentTime * 1000)
  }

  onCanplay () {
    // 缓冲至可播放状态时触发，此时才能拿到媒体文件的播放时长
    this.commit('SET_DURATION', this.media.duration)

    // 记录已就绪的源，之后 playing 变化才允许直接 play()
    this.readySource = this.media.currentSrc || this.desiredSource

    if (this.state.playing === true && this.media.currentTime !== this.media.duration) {
      this.playSafely()
    }

    this.setMediaSession()
  }

  onTimeupdate () {
    // 当前播放位置已更新
    this.commit('SET_CURRENT_TIME', this.media.currentTime)

    // 更新历史记录（睡眠定时器由 setTimeout 负责，不再依赖本事件）
    if (this.lastHistoryUpdateTime === null) {
      this.savePlayHistory()
    } else if (this.media.currentTime > this.lastHistoryUpdateTime + HISTORY_UPDATE_INTERVAL) {
      this.savePlayHistory()
    }
  }

  onEnded () {
    this.dontResume = true
    // 元素已经播完，重新采样事实（意图由下面的判断决定）
    this.refreshElementPlaying()

    // 只有顺序播放：队列里还有下一首就续上，最后一首播完就停在原地
    if (this.state.queueIndex === this.state.queue.length - 1) {
      this.commit('PAUSE')
    } else {
      this.commit('NEXT_TRACK')
    }
  }

  // ------------------------------------------------------------------
  // 播放控制
  // ------------------------------------------------------------------

  /**
   * 只有媒体元素已经加载了当前的源，才允许直接播放。
   * 切歌时元素上还挂着上一首（duration/readyState 都是旧的），
   * 这时 play() 会被随后的 load() 打断，导致状态被引擎的 pause 事件改写。
   */
  playIfReady () {
    if (this.desiredSource === '' || this.readySource !== this.desiredSource) return

    this.playSafely()
  }

  /**
   * play() 返回 promise，被换源/跳转打断时会 reject（"interrupted by a new load request"），
   * 这里吞掉它，避免控制台刷屏。
   */
  playSafely () {
    let promise = null

    try {
      promise = this.media.play()
    } catch (e) {
      return
    }

    if (promise && typeof promise.catch === 'function') {
      promise.catch((err) => {
        // 被换源/跳转打断属于正常竞争，意图不变
        if (err && err.name === 'AbortError') return
        if (this.media === null || this.media.seeking === true) return

        // 播放请求被拒绝（例如自动播放被拦）：重新采样事实，事实与意图不符时让意图回落到事实
        this.refreshElementPlaying()
        if (this.state.playing === true && this.state.elementPlaying === false &&
          this.readySource === this.desiredSource) {
          this.commit('PAUSE')
        }
      })
    }
  }

  // 按媒体元素当前状态重新采样事实（不改变意图）
  refreshElementPlaying () {
    if (this.media === null) return

    // 播放结束后部分浏览器不会把 paused 置回 true，但"播完了"当然不算在播
    this.commit('SET_ELEMENT_PLAYING', this.media.paused === false && this.media.ended === false)
  }

  /**
   * 延迟确认暂停意图：正在跳转、正在换源、或者已经自行恢复播放，都不算外部暂停。
   */
  schedulePauseIntentCheck () {
    this.clearPauseIntentTimer()

    this.pauseIntentTimer = setTimeout(() => {
      this.pauseIntentTimer = null

      if (this.media === null) return
      if (this.state.playing !== true) return
      if (this.media.seeking === true) return
      if (this.state.elementPlaying === true) return
      if (this.readySource !== this.desiredSource) return

      // 用户意图是播放但元素确实停了 -> 外部暂停（线控/锁屏/软件切换）
      this.commit('PAUSE')
      this.savePlayHistory()
    }, PAUSE_INTENT_DELAY)
  }

  clearPauseIntentTimer () {
    if (this.pauseIntentTimer !== null) {
      clearTimeout(this.pauseIntentTimer)
      this.pauseIntentTimer = null
    }
  }

  /**
   * 认证边界（登出、token 失效被踢回登录页）：停播、清空状态、断开已加载的音频流。
   */
  stop () {
    this.stopping = true
    this.clearPauseIntentTimer()
    this.clearSleepTimer()

    this.media.pause()
    this.desiredSource = ''
    this.readySource = ''
    this.lastHistoryFile = null
    this.lastHistoryUpdateTime = 0
    this.dontResume = false
    this.commit('SET_LYRIC_AVAILABLE', false)
    this.commit('SET_LYRIC_LOADING', false)
    if (this.lrc) {
      this.lrc.setLyric('')
    }

    // 释放已经加载/缓冲的音频数据
    this.media.removeAttribute('src')
    this.media.load()

    this.clearPersistedSleepTimer()
    this.commit('RESET')
    this.refreshElementPlaying()
    this.stopping = false
  }

  // ------------------------------------------------------------------
  // 睡眠定时器
  // ------------------------------------------------------------------

  /**
   * 到点暂停播放。
   * 旧实现挂在 timeupdate 上比对系统时钟，暂停中或后台标签页里根本不会触发；
   * 这里改成真正的定时器。
   */
  scheduleSleepTimer () {
    this.clearSleepTimer()

    const { sleepMode, sleepTime } = this.state
    if (sleepMode !== true || !sleepTime) return

    const delay = this.msUntil(sleepTime)
    if (delay === null) return

    this.sleepTimer = setTimeout(() => {
      this.sleepTimer = null

      this.commit('PAUSE')
      this.commit('CLEAR_SLEEP_MODE')
      this.clearPersistedSleepTimer()

      if (this.notify.success) {
        this.notify.success('睡眠定时已到，已暂停播放')
      }
    }, delay)
  }

  clearSleepTimer () {
    if (this.sleepTimer !== null) {
      clearTimeout(this.sleepTimer)
      this.sleepTimer = null
    }
  }

  // "HH:mm" -> 距离下一次该时刻的毫秒数（已经过了就算明天）
  msUntil (sleepTime) {
    const matched = /^(\d{1,2}):(\d{1,2})$/.exec(String(sleepTime).trim())
    if (matched === null) return null

    const now = new Date()
    const target = new Date(now)
    target.setSeconds(0, 0)
    target.setHours(Number(matched[1]), Number(matched[2]))

    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1)
    }

    return target.getTime() - now.getTime()
  }

  clearPersistedSleepTimer () {
    try {
      SessionStorage.set('sleepTime', null)
      SessionStorage.set('sleepMode', false)
    } catch (e) {
      // Web Storage API 不可用时忽略
    }
  }

  // ------------------------------------------------------------------
  // 歌词
  // ------------------------------------------------------------------

  initLrc () {
    this.lrc = new Lyric({
      onPlay: (line, text) => {
        this.commit('SET_CURRENT_LYRIC', text)
      }
    })
  }

  playLrc (playStatus) {
    // 有没有歌词文件统一以 store 为准（歌词按钮也读同一个字段）
    if (this.state.lyricAvailable !== true) return

    if (playStatus === true) {
      this.lrc.play(this.media.currentTime * 1000)
    } else {
      this.lrc.pause()
    }
  }

  loadLrcFile () {
    const hash = this.currentTrack.hash
    if (!hash) return

    // 新曲目有没有歌词还没定：先把上一首的歌词清掉，别让旧歌词挂在界面上。
    // 这里故意不动 lyricAvailable —— 它在结果回来之前保持上一首的值，
    // 于是歌词按钮不会在每次切歌时闪一下灰（loading 才是"还在查"的标记）
    this.commit('SET_LYRIC_LOADING', true)
    this.commit('SET_CURRENT_LYRIC', '')
    this.lrc.setLyric('')

    const url = `/api/media/check-lrc/${hash}?token=${this.token}`

    axios.get(url)
      .then((response) => {
        if (response.data.result) {
          // 有 lrc 歌词文件
          this.commit('SET_LYRIC_AVAILABLE', true)
          const lrcUrl = `/api/media/stream/${response.data.hash}?token=${this.token}`
          axios.get(lrcUrl)
            .then(res => {
              this.lrc.setLyric(res.data)
              // 歌词文件回来时音频可能已经暂停了，这时只装歌词、别把歌词时钟也跑起来
              this.playLrc(this.state.elementPlaying === true)
            })
            .catch(() => {})
        } else {
          // 无歌词文件
          this.commit('SET_LYRIC_AVAILABLE', false)
          this.lrc.setLyric('')
        }
      })
      .catch((error) => {
        if (error.response) {
          if (error.response.status !== 401) {
            this.showError(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          }
        } else {
          this.showError(error.message || error)
        }
      })
      .finally(() => {
        this.commit('SET_LYRIC_LOADING', false)
      })
  }

  // ------------------------------------------------------------------
  // 播放历史
  // ------------------------------------------------------------------

  savePlayHistory () {
    if (this.media === null) return

    const time = this.media.currentTime
    this.lastHistoryUpdateTime = time
    this.updatePlayHistory(time, this.media.duration)
  }

  /**
   * 切歌/清空队列前，把上一首的进度写到上一首名下。
   * 之前是在 pause 事件里写，写到的是"新曲 + 旧进度"，会污染新曲的续播位置。
   */
  flushPreviousHistory () {
    const previous = this.lastHistoryFile

    if (!previous || !previous.hash || this.media === null) return

    this.updatePlayHistory(this.media.currentTime, this.media.duration, previous)
  }

  // file 是曲目（或切歌时留下的快照）：work_id / file_index 从 hash 里取，
  // 因为 hash 是曲目自带的身份，不依赖 store 里当前是哪个队列
  updatePlayHistory (currentTime = 0, totalTime = 0, file = this.currentTrack) {
    if (!file || !file.hash) return

    const fileName = file.title
    const workID = file.hash.split('/')[0]
    const fileIndex = file.hash.split('/')[1]

    const payload = {
      work_id: parseInt(workID),
      file_index: parseInt(fileIndex),
      file_name: fileName,
      play_time: currentTime,
      total_time: totalTime
    }

    // 历史写入失败不应影响播放，也不要让未处理的 rejection 刷屏
    axios.put('/api/history', payload).catch(() => {})
  }

  resumePlayHistory () {
    if (this.dontResume === true) {
      this.dontResume = false
      return
    }

    const hash = this.currentTrack.hash
    if (!hash) return

    const workID = hash.split('/')[0]
    const fileIndex = hash.split('/')[1]

    if (workID == null || fileIndex == null) return

    axios.get('/api/history/getByWorkIdIndex', {
      params: {
        work_id: workID,
        file_index: fileIndex
      }
    })
      .then((response) => {
        if (!response.data) return
        // 请求期间可能已经切歌，避免把上一首的进度写到别的曲目上
        if (this.currentTrack.hash !== hash) return

        const continueTime = Number(response.data.play_time)
        const totalTime = Number(response.data.total_time)

        // 非法值直接放弃续播，避免 currentTime 被写成 NaN 抛错
        if (!Number.isFinite(continueTime) || !Number.isFinite(totalTime)) return
        if (continueTime <= 0) return
        if (totalTime <= continueTime) return

        this.media.currentTime = Math.floor(continueTime)

        if (this.notify.success) {
          this.notify.success(`继续从${formatSeconds(continueTime)}开始播放`)
        }
      })
      .catch((error) => {
        console.log(error)
      })
  }

  // ------------------------------------------------------------------
  // 系统媒体控制（锁屏、通知栏、线控）
  // ------------------------------------------------------------------

  setMediaSession () {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return

    const track = this.currentTrack
    const work = this.currentWork
    if (!track.hash) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || '',
      album: work.album || '',
      artist: work.artist || '',
      // 锁屏 / 通知栏的封面不吃 CSS，只能整个不给
      artwork: this.nsfwMode && work.nsfw === true
        ? []
        : [
          {
            src: this.coverUrl,
            sizes: '128x128',
            type: 'image/jpeg'
          }
        ]
    })

    const mediaSession = navigator.mediaSession

    mediaSession.setActionHandler('play', () => {
      this.commit('PLAY')
    })

    mediaSession.setActionHandler('pause', () => {
      this.commit('PAUSE')
    })

    // 播放列表语义（关键）
    mediaSession.setActionHandler('nexttrack', () => {
      this.commit('NEXT_TRACK')
    })

    mediaSession.setActionHandler('previoustrack', () => {
      this.commit('PREVIOUS_TRACK')
    })

    mediaSession.setActionHandler('seekto', (details) => {
      this.commit('SET_SEEKTIME', details.seekTime)
    })

    // 明确禁用快进行为
    mediaSession.setActionHandler('seekforward', null)
    mediaSession.setActionHandler('seekbackward', null)
    mediaSession.setActionHandler('stop', null)
  }

  showError (message) {
    if (this.notify.error) {
      this.notify.error(message)
    }
  }
}
