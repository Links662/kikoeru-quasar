<template>
  <vue-plyr ref="plyr"
    :emit="['loadedmetadata', 'canplay', 'timeupdate', 'ended', 'seeked', 'playing', 'waiting', 'pause']"
    @loadedmetadata="resumePlayHistory()" @canplay="onCanplay()" @timeupdate="onTimeupdate()" @ended="onEnded()"
    @seeked="onSeeked()" @playing="onPlaying()" @waiting="onWaiting()" @pause="onPause()">
    <audio crossorigin="anonymous" >
      <source v-if="source" :src="source" />
    </audio>
  </vue-plyr>
</template>

<script>
import Lyric from 'lrc-file-parser'
import { mapState, mapGetters, mapMutations } from 'vuex'
import NotifyMixin from '../mixins/Notification.js'

export default {
  name: 'AudioElement',
  mixins: [NotifyMixin],

  data() {
    return {
      lrcObj: null,
      lrcAvailable: false,
      // 应用期望播放的源 / 媒体元素已就绪的源（绝对 URL）
      desiredSource: '',
      readySource: '',
      // 用于确认“意图是播放但元素停了”是外部暂停，还是换源/跳转造成的瞬时抖动
      pauseIntentTimer: null,
      // 上一次写入历史的文件快照，切歌时用来把上一首的进度落库
      lastHistoryFile: null,
    }
  },

  computed: {
    player () {
      return this.$refs.plyr.player
    },

    source() {
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      return this.currentPlayingFile.mediaStreamUrl ? `${this.currentPlayingFile.mediaStreamUrl}?token=${token}` : "";
    },

    ...mapState('AudioPlayer', [
      'playing',
      'elementPlaying',
      'queue',
      'queueIndex',
      'playMode',
      'muted',
      'volume',
      'sleepTime',
      'sleepMode',
      'rewindSeekTime',
      'forwardSeekTime',
      'seekTime',
    ]),

    ...mapGetters('AudioPlayer', [
      'currentPlayingFile'
    ])
  },

  watch: {
    playing (flag) {
      // 播放状态由应用意图驱动：只有媒体元素已经加载了当前的源才直接播放，
      // 否则交给 onCanplay 启动，避免在 media.load() 之前对旧媒体调用 play()
      if (flag) {
        this.playIfReady()
      } else {
        this.player.pause()
        // 元素本来就已经暂停时不会再派发 pause 事件，这里按元素状态补采样一次事实
        this.refreshElementPlaying()
      }
    },

    // watch source -> media.load() -> canPlay -> player.play()
    source (url) {
      // 换源前先把上一首的进度落库（此刻 player.currentTime 仍属于上一首）
      this.flushPreviousHistory()
      this.lastHistoryFile = { ...this.currentPlayingFile }

      this.desiredSource = this.resolveUrl(url)
      // 新源就绪前不允许自动播放
      this.readySource = ''
      // 新曲从 0 开始计时，否则会等到超过上一首的进度 +30s 才写历史
      this.lastHistoryUpdateTime = 0

      if (url) {
        // 加载新音频/视频文件
        this.player.media.load();
        this.loadLrcFile();
      }
    },

    muted (flag) {
      // 切换静音状态
      this.player.muted = flag
    },

    volume (val) {
      // 屏蔽非法数值
      if (val < 0 || val > 1) {
        return
      }

      // 调节音量
      this.player.volume = val
    },

    seekTime(time) {
      if (time >= 0) {
        this.player.currentTime = time;
        this.SET_SEEKTIME(-1);

        // 部分浏览器（iOS）跳转时会自行暂停，按用户意图继续播放
        if (this.playing) {
          this.playSafely()
        }
      }
    },
  },

  methods: {
    /**
     * 当 外部暂停（线控暂停、软件切换）、用户控制暂停、seek 时会触发本事件
     * 注意：其中只有前两种代表用户的真实意图，换源/跳转/缓冲产生的暂停不能改写播放状态
     */
    onPause() {
      // 事实：元素确实停了（只记录事实，不碰意图）
      this.SET_ELEMENT_PLAYING(false)

      // 换源过程中的暂停（新源还没就绪）不是用户意图，忽略
      if (this.readySource !== this.desiredSource) return
      // 跳转过程中的暂停是瞬时状态（plyr 会在松手后恢复播放），忽略
      if (this.player.seeking) return

      if (!this.playing) {
        // 意图本来就是暂停：两个字段一致，只补一次进度
        this.savePlayHistory()
        return
      }

      // 意图仍是播放，但事实是停了：延迟确认是外部暂停还是瞬时抖动
      this.schedulePauseIntentCheck()
    },
    /**
     * 当播放器真正开始播放时会触发本事件
     */
    onPlaying() {
      // 事实：元素真的开始出声了
      this.SET_ELEMENT_PLAYING(true)
      this.playLrc(true)
      // 事实与意图不一致，且不是我们发起的：外部控制（线控、锁屏、播放器自行恢复），采纳为意图
      if (!this.playing) {
        this.PLAY()
      }
    },
    /**
     * 当播放器缓冲区空，被迫暂停加载时会触发本事件
     */
    onWaiting() {
      // 缓冲时元素并没有被暂停（paused 仍为 false），所以事实和意图都不变，等 playing / canplay 事件
      this.playLrc(false)
    },
    ...mapMutations('AudioPlayer', [
      'SET_DURATION',
      'SET_CURRENT_TIME',
      'SET_SEEKTIME',
      'PAUSE',
      'PLAY',
      'SET_TRACK',
      'NEXT_TRACK',
      'SET_CURRENT_LYRIC',
      'SET_VOLUME',
      'CLEAR_SLEEP_MODE',
      'SET_ELEMENT_PLAYING',
    ]),

    resolveUrl(url) {
      if (!url) return ''

      try {
        // currentSrc 同样是绝对 URL，两者必须用同一种形式比较
        return new URL(url, window.location.href).href
      } catch (e) {
        return url
      }
    },

    /**
     * 只有媒体元素已经加载了当前的源，才允许直接播放。
     * 切歌时媒体元素上还挂着上一首（duration/readyState 都是旧的），
     * 这时 play() 会被随后的 media.load() 打断，导致状态被引擎的 pause 事件改写。
     */
    playIfReady() {
      if (!this.desiredSource || this.readySource !== this.desiredSource) return

      this.playSafely()
    },

    /**
     * play() 返回 promise，被换源/跳转打断时会 reject（"interrupted by a new load request"），
     * 这里吞掉它，避免控制台刷屏
     */
    playSafely() {
      let promise = null

      try {
        promise = this.player.play()
      } catch (e) {
        return
      }

      if (promise && typeof promise.catch === 'function') {
        promise.catch((err) => {
          // 被换源/跳转打断属于正常竞争，意图不变
          if (err && err.name === 'AbortError') return
          if (this.player.seeking) return

          // 播放请求被拒绝（例如自动播放被拦）：重新采样事实，事实与意图不符时让意图回落到事实
          this.refreshElementPlaying()
          if (this.playing && !this.elementPlaying && this.readySource === this.desiredSource) {
            this.PAUSE()
          }
        })
      }
    },

    /** 按媒体元素当前状态重新采样事实（不改变意图） */
    refreshElementPlaying() {
      const media = this.player && this.player.media
      if (!media) return

      // 播放结束后部分浏览器不会把 paused 置回 true，但“播完了”当然不算在播
      this.SET_ELEMENT_PLAYING(!media.paused && !media.ended)
    },

    /**
     * 延迟确认暂停意图：正在跳转、正在换源、或者已经自行恢复播放，都不算外部暂停
     */
    schedulePauseIntentCheck() {
      clearTimeout(this.pauseIntentTimer)
      this.pauseIntentTimer = setTimeout(() => {
        this.pauseIntentTimer = null

        if (!this.playing) return
        if (this.player.seeking) return
        if (this.elementPlaying) return
        if (this.readySource !== this.desiredSource) return

        // 用户意图是播放但元素确实停了 → 外部暂停（线控/锁屏/软件切换）
        this.PAUSE()
        this.playLrc(false)
        this.savePlayHistory()
      }, 250)
    },

    savePlayHistory() {
      const time = this.player.currentTime
      this.lastHistoryUpdateTime = time
      this.updatePlayHistory(time, this.player.duration)
    },

    /**
     * 切歌/清空队列前，把上一首的进度写到上一首名下。
     * 之前是在 pause 事件里写，写到的是“新曲 + 旧进度”，会污染新曲的续播位置
     */
    flushPreviousHistory() {
      const previous = this.lastHistoryFile

      if (!previous || !previous.hash) return

      this.updatePlayHistory(this.player.currentTime, this.player.duration, previous)
    },

    onCanplay () {
      // 缓冲至可播放状态时触发 (只有缓冲至可播放状态, 才能获取媒体文件的播放时长)
      this.SET_DURATION(this.player.duration)

      // 记录已就绪的源，之后 playing 变化才允许直接 play()
      this.readySource = this.player.media.currentSrc || this.desiredSource

      // 播放
      if (this.playing && this.player.currentTime !== this.player.duration) {
        this.playSafely()
      }
    },

    onTimeupdate () {
      // 当目前的播放位置已更改时触发
      this.SET_CURRENT_TIME(this.player.currentTime)
      if (this.sleepMode && this.sleepTime) {
        const currentTime = new Date()
        const currentHourStr = currentTime.getHours().toString().padStart(2, '0')
        const currentMinuteStr = currentTime.getMinutes().toString().padStart(2, '0')
        const sleepHourStr = this.sleepTime.match(/\d+/g)[0]
        const sleepMinuteStr = this.sleepTime.match(/\d+/g)[1]
        if (currentHourStr === sleepHourStr && currentMinuteStr === sleepMinuteStr) {
          this.PAUSE()
          this.CLEAR_SLEEP_MODE()
          // Persist sleep mode settings
          this.$q.sessionStorage.set('sleepTime', null)
          this.$q.sessionStorage.set('sleepMode', false)
        }
      }

      // 更新历史记录
      const UPDATE_INTERVAL = 30
      if (this.lastHistoryUpdateTime == null) {
        this.savePlayHistory()
      } else if (this.player.currentTime > this.lastHistoryUpdateTime + UPDATE_INTERVAL) {
        this.savePlayHistory()
      }

    },

    onEnded () {
      this.dontResume = true
      // 元素已经播完，重新采样事实（意图由下面的播放模式决定）
      this.refreshElementPlaying()
      // 当前文件播放结束时触发
      switch (this.playMode.name) {
        case "all repeat":
          // 循环播放
          if (this.queueIndex === this.queue.length - 1) {
            this.SET_TRACK(0)
          } else {
            this.NEXT_TRACK()
          }
          break
        case "repeat once":
          // 单曲循环
          this.player.currentTime = 0
          this.playSafely()
          this.PLAY()
          break
        case "shuffle": {
          // 随机播放
          const index = Math.floor(Math.random()*this.queue.length)
          this.SET_TRACK(index)
          if (index === this.queueIndex) {
            this.player.currentTime = 0
          }
          break
        }
        default:
          // 顺序播放
          if (this.queueIndex === this.queue.length - 1) {
            this.PAUSE()
          } else {
            this.NEXT_TRACK()
          }
      }
    },

    onSeeked() {
    },

    playLrc (playStatus) {
      if (this.lrcAvailable) {
        if (playStatus) {
          this.lrcObj.play(this.player.currentTime * 1000);
        } else {
          this.lrcObj.pause();
        }
      }
    },

    initLrcObj () {
        this.lrcObj = new Lyric({
          onPlay: (line, text) => {
            this.SET_CURRENT_LYRIC(text);
          },
        })
    },

    loadLrcFile () {
      const token = this.$q.localStorage.getItem('jwt-token') || '';
      const fileHash = this.queue[this.queueIndex].hash;
      const url = `/api/media/check-lrc/${fileHash}?token=${token}`;

      this.$axios.get(url)
        .then((response) => {
          if (response.data.result) {
            // 有lrc歌词文件
            this.lrcAvailable = true;
            console.log('读入歌词');
            const lrcUrl = `/api/media/stream/${response.data.hash}?token=${token}`;
            this.$axios.get(lrcUrl)
              .then(response => {
                console.log('歌词读入成功');
                this.lrcObj.setLyric(response.data);
                this.lrcObj.play(this.player.currentTime * 1000);
              });
          } else {
            // 无歌词文件
            this.lrcAvailable = false;
            this.lrcObj.setLyric('');
            this.SET_CURRENT_LYRIC('');
          }
        })
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status !== 401) {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`);
            }
          } else {
            this.showErrNotif(error.message || error);
          }
        })
    },

    updatePlayHistory(currentTime = 0, totalTime = 0, file = this.currentPlayingFile) {
      if (!file || !file.hash) return

      const fileName = file.title
      const workID = file.hash.split('/')[0]
      const fileIndex = file.hash.split('/')[1]

      let payload = {
        "work_id": parseInt(workID),
        "file_index": parseInt(fileIndex),
        "file_name": fileName,
        "play_time": currentTime,
        "total_time": totalTime
      }

      // 历史写入失败不应影响播放，也不要让未处理的 rejection 刷屏
      this.$axios.put('/api/history', payload).catch(() => {})
    },

    resumePlayHistory() {
      if (this.dontResume) {
        this.dontResume = false
        return
      }

      const workID = this.currentPlayingFile.hash.split('/')[0]
      const fileIndex = this.currentPlayingFile.hash.split('/')[1]

      if (workID == null || fileIndex == null) return

      this.$axios.get('/api/history/getByWorkIdIndex', {
        params: {
          work_id: workID,
          file_index: fileIndex
        }
      })
      .then((response) => {
        if (!response.data) return

        let continueTime = Number(response.data.play_time)
        let totalTime = Number(response.data.total_time)

        // 非法值直接放弃续播，避免 currentTime 被写成 NaN 抛错
        if (!Number.isFinite(continueTime) || !Number.isFinite(totalTime)) return
        if (continueTime <= 0) return
        if (totalTime <= continueTime) return

        this.player.currentTime = Math.floor(continueTime);

        function formatSeconds (seconds) {
          let h = Math.floor(seconds / 3600) < 10
            ? '0' + Math.floor(seconds / 3600)
            : Math.floor(seconds / 3600)

          let m = Math.floor((seconds / 60 % 60)) < 10
            ? '0' + Math.floor((seconds / 60 % 60))
            : Math.floor((seconds / 60 % 60))

          let s = Math.floor((seconds % 60)) < 10
            ? '0' + Math.floor((seconds % 60))
            : Math.floor((seconds % 60))

          return h === "00"
            ? m + ":" + s
            : h + ":" + m + ":" + s
        }

        this.showSuccNotif(`继续从${formatSeconds(continueTime)}开始播放`)
      })
      .catch((err) => {
        console.log(err)
      })

    }

  },

  mounted () {
    // 初始化音量
    this.SET_VOLUME(this.player.volume);
    this.initLrcObj();
    // 初始化事实字段
    this.refreshElementPlaying();
    if (this.playing) {
      this.loadLrcFile();
    }
  },

  beforeDestroy () {
    clearTimeout(this.pauseIntentTimer)
  }
}
</script>
