<template>
  <div>
    <!-- 播放器 -->
    <q-slide-transition>
      <q-card square v-show="currentPlayingFile.hash && !hide"
        class="fixed-bottom-right bg-white text-black audio-player" @wheel.prevent @touchmove.prevent>
        <!-- 音声封面 -->
        <div class="bg-dark row items-center albumart">
          <q-img fit="contain" :src="coverUrl" :img-class="currentPlayingFile.nsfw ? 'cover-mask' : ''" :ratio="4 / 3" />

          <!-- 歌词：只有当前这一句，压在封面下沿，从下往上弹出来。
               播放列表展开时它就在列表上方，两块可以同时开着 -->
          <transition name="lyrics-pop">
            <div v-if="lyricsOpen" class="lyrics-view absolute-bottom row items-center justify-center">
              <div class="lyrics-view__line text-center text-h6 text-bold text-purple ellipsis-2-lines">
                {{ currentLyric }}
              </div>
            </div>
          </transition>

          <q-btn dense round size="md" color="white" text-color="dark" icon="keyboard_arrow_down" @click="toggleHide()"
            class="absolute-top-left q-ma-sm" />
          <q-btn dense round size="md" color="white" text-color="dark" icon="info_outline"
            class="absolute-top-right q-ma-sm" @click="openWorkDetail()" />
        </div>

        <!-- 当前播放列表：每页固定 4 行 + 一条分页条，所有操作都是直接点击（播放 / 上下挪位 / 移除） -->
        <div class="current-play-list bg-white" v-show="queueOpen">
          <!-- 只渲染当前页的 4 行，列表本身不滚动，因此没有滚轮和手势要处理 -->
          <q-list class="queue-list">
            <q-item clickable v-ripple v-for="row in pageTracks" :key="row.index"
              :active="queueIndex === row.index" active-class="text-white bg-teal"
              class="queue-item non-selectable q-py-none q-px-sm"
              @click="onClickTrack(row.index)">
              <!-- 上/下箭头：点一下把这条曲目挪一位（拖动已取消，鼠标和触摸都走这里） -->
              <q-item-section side class="queue-arrows">
                <q-btn flat icon="arrow_upward" aria-label="上移"
                  :color="queueIndex === row.index ? 'white' : 'dark'"
                  :disable="row.index === 0" @click.stop="moveTrack(row.index, -1)" />
                <q-btn flat icon="arrow_downward" aria-label="下移"
                  :color="queueIndex === row.index ? 'white' : 'dark'"
                  :disable="row.index === queue.length - 1" @click.stop="moveTrack(row.index, 1)" />
              </q-item-section>

              <q-item-section avatar>
                <q-img :src="samCoverUrl(row.track.hash)" :img-class="row.track.nsfw ? 'cover-mask' : ''" class="rounded-borders queue-item__cover" />
              </q-item-section>

              <q-item-section>
                <q-item-label lines="2" :title="row.track.title" class="queue-item__title">
                  {{ shortTitle(row.track.title) }}
                </q-item-label>
              </q-item-section>

              <q-item-section side class="queue-remove">
                <q-btn flat round icon="clear"
                  :color="queueIndex === row.index ? 'white' : 'red'" @click.stop="removeFromQueue(row.index)" />
              </q-item-section>
            </q-item>
          </q-list>

          <div class="queue-pager">
            <q-pagination :model-value="page + 1" :max="pageCount"
              :max-pages="5" :boundary-numbers="false" direction-links ellipses padding="0"
              color="grey-8" active-color="teal" active-text-color="white" active-design="unelevated"
              @update:model-value="goPage($event - 1)" />
          </div>
        </div>

        <!-- 进度条：数据来自 store，播放引擎已不依赖本组件存在 -->
        <div class="row items-center q-mx-sm q-my-sm">
          <div class="col-auto">{{ formatSeconds(currentTime) }}</div>
          <q-slider
            class="col q-mx-sm"
            :model-value="seekValue"
            :min="0"
            :max="sliderMax"
            :step="1"
            :disable="!currentPlayingFile.hash"
            :label-value="formatSeconds(seekValue)"
            label
            thumb-size="12px"
            color="primary"
            @update:model-value="onSeekInput"
            @change="onSeekChange"
          />
          <div class="col-auto">{{ formatSeconds(duration) }}</div>
        </div>

        <!-- Place holder for iOS -->
        <div class="q-pt-xs" v-if="$q.platform.is.ios" />

        <q-item class="text-center non-selectable q-py-sm q-px-md">
          <q-item-section>
            <q-item-label lines="2" class="text-bold">{{ currentPlayingFile.title }}</q-item-label>
            <q-item-label caption lines="1">{{ currentPlayingFile.album }}</q-item-label>
          </q-item-section>
        </q-item>

        <!-- Place holder for iOS -->
        <div class="q-pt-sm" v-if="$q.platform.is.ios" />

        <!-- 播放按钮控件 -->
        <div class="row justify-around control-row">
          <!-- 短按：展开/收起播放列表；长按 5 秒：清空播放列表 -->
          <q-btn flat dense size="md" :icon="isPressing('queue') ? 'delete_forever' : 'queue_music'"
            :color="isPressing('queue') ? 'negative' : (queueOpen ? 'primary' : undefined)"
            @click="onPressClick('queue')" @mousedown="startPress('queue')" @touchstart="startPress('queue')"
            @mouseleave="cancelPress" @contextmenu.prevent
            class="col-auto non-selectable control-btn" />
          <!-- 短按：上一首；长按：后退 -->
          <q-btn flat dense size="lg" :icon="isPressing('previous') ? rewindIcon : 'skip_previous'"
            @click="onPressClick('previous')" @mousedown="startPress('previous')"
            @touchstart="startPress('previous')" @mouseleave="cancelPress"
            class="col-auto non-selectable control-btn" />
          <q-btn flat dense size="28px" :icon="playingIcon" @click="togglePlaying()"
            class="col-auto control-btn control-btn--play" />
          <!-- 短按：下一首；长按：前进 -->
          <q-btn flat dense size="lg" :icon="isPressing('next') ? forwardIcon : 'skip_next'"
            @click="onPressClick('next')" @mousedown="startPress('next')" @touchstart="startPress('next')"
            @mouseleave="cancelPress" class="col-auto non-selectable control-btn" />
          <!-- 歌词开关：没有歌词文件时置灰不可点。和播放列表互不影响，两者可同时开着 -->
          <q-btn flat dense size="md" icon="lyrics" :disable="!hasLyric"
            :color="lyricsOpen ? 'primary' : undefined" @click="toggleLyrics()"
            class="col-auto non-selectable control-btn" aria-label="歌词" />
        </div>

        <!-- 音量控件：与进度条统一使用 Quasar q-slider，样式/主题色一致 -->
        <!-- HTML5 volume in iOS is read-only -->
        <div class="row items-center justify-center q-mx-sm volume-row" v-if="!$q.platform.is.ios">
          <q-icon name="volume_down" size="sm" class="col-auto" />
          <q-slider v-model="volume" class="col q-mx-sm volume-slider" :min="0" :max="1"
            :step="0.01" thumb-size="12px" color="primary" />
          <q-icon name="volume_up" size="sm" class="col-auto" />
        </div>
      </q-card>
    </q-slide-transition>
  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'

// 当前播放列表每页固定显示的行数
const QUEUE_PAGE_SIZE = 4

// 长按手势时长表：fire 到点触发动作，feedback 到点进入长按反馈（按钮图标变化），
// repeat 表示继续按住时按该间隔反复触发
const LONG_PRESS = {
  queue: { fire: 2000, feedback: 500 }, // 长按清空播放列表
  previous: { fire: 1000, feedback: 200, repeat: 1000 }, // 长按后退，按住不放持续后退
  next: { fire: 1000, feedback: 200, repeat: 1000 } // 长按前进，按住不放持续前进
}

export default {
  name: 'AudioPlayer',

  data() {
    return {
      page: 0, // 当前页（每页 QUEUE_PAGE_SIZE 行）
      // 进度条：拖动时只更新本地值，松手（change）才真正 seek
      seekValue: 0,
      seeking: false,
      seekingTimer: null,
      pressHeld: false, // 正有一次按住（到松手为止，期间忽略其他按钮）
      pressKey: null, // 当前按住的按钮
      pressActive: false, // 已进入长按反馈，按钮图标据此变化
      pressFeedbackTimer: null,
      pressTimer: null,
      pressRepeatTimer: null,
      pressDone: false, // 本次长按已触发，用于吞掉随后的 click
    }
  },

  beforeUnmount() {
    this.cancelPress()
    clearTimeout(this.seekingTimer)
  },

  watch: {
    // 队列是原地增删的（ADD_TO_QUEUE 用 push、REMOVE_FROM_QUEUE 用 splice），
    // 引用不变，所以只能靠 deep 感知
    queue: {
      deep: true,
      handler (queue) {
        // 删掉最后一条时收起列表
        if (queue.length === 0) {
          if (this.queueOpen === true) this.setQueueOpen(false)
          this.page = 0
          return
        }

        // 队列变短后当前页可能越界
        if (this.page > this.pageCount - 1) {
          this.page = this.pageCount - 1
        }
      }
    },

    // 正在播放的那条换了（点播 / 上下曲 / 自动切歌）→ 它不在当前页时翻过去
    queueIndex (index) {
      const start = this.page * QUEUE_PAGE_SIZE
      if (index < start || index >= start + QUEUE_PAGE_SIZE) {
        this.page = Math.floor(index / QUEUE_PAGE_SIZE)
      }
    },

    // 展开列表时定位到正在播放的那一页
    queueOpen (open) {
      if (open !== true) return
      this.page = this.queue.length === 0 ? 0 : Math.floor(this.queueIndex / QUEUE_PAGE_SIZE)
    },

    // 新曲目确实没有歌词时（不是"还在查"）把歌词收起来，按钮同时变灰。
    // "想要歌词"这个意愿不动，所以下一首有歌词时会自己弹回来
    lyricUnavailable (missing) {
      if (missing === true && this.lyricsOpen === true) {
        this.setLyricsOpen(false)
      }
    },

    // 又换到有歌词的曲目：如果用户还开着歌词，就自动展开
    hasLyric (hasLyric) {
      if (hasLyric === true && this.lyricsWanted === true && this.lyricsOpen !== true) {
        this.setLyricsOpen(true)
      }
    },

    // 播放进度 -> 进度条；正在拖动时不打断用户
    currentTime(value) {
      if (this.seeking === false) {
        this.seekValue = Math.floor(value)
      }
    },
  },

  computed: {
    coverUrl() {
      // 从 LocalStorage 中读取 token
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      const hash = this.currentPlayingFile.hash
      return hash ? `/api/cover/${hash.split('/')[0]}?token=${token}` : ""
    },

    // 进度条上限：duration 未就绪时给一个安全值，避免 q-slider 的 min 等于 max
    sliderMax() {
      const duration = this.duration
      return Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : 1
    },

    workDetailUrl() {
      const hash = this.currentPlayingFile.hash
      return hash ? `/work/${hash.split('/')[0]}` : ""
    },

    volume: {
      get() {
        return this.$store.state.AudioPlayer.volume
      },
      set(val) {
        this.setVolume(val)
      }
    },

    queue() {
      return this.$store.state.AudioPlayer.queue
    },

    // 总页数（队列为空时也保证是 1，翻页按钮的边界就不用再判空）
    pageCount() {
      return Math.max(1, Math.ceil(this.queue.length / QUEUE_PAGE_SIZE))
    },

    // 当前页的行：带上它在整个队列里的下标，播放 / 删除 / 高亮都要用绝对下标
    pageTracks() {
      const start = this.page * QUEUE_PAGE_SIZE
      return this.queue
        .slice(start, start + QUEUE_PAGE_SIZE)
        .map((track, offset) => ({ track, index: start + offset }))
    },

    // 歌词查完了、而这首确实没有：用来把面板收起来
    lyricUnavailable() {
      return this.hasLyric !== true && this.lyricLoading !== true
    },

    playingIcon() {
      return this.playing ? "pause" : "play_arrow"
    },

    rewindIcon() {
      switch (this.rewindSeekTime) {
        case 5:
          return 'replay_5'
        case 10:
          return 'replay_10'
        case 30:
          return 'replay_30'
        default:
          return 'replay_5'
      }
    },

    forwardIcon() {
      switch (this.forwardSeekTime) {
        case 5:
          return 'forward_5'
        case 10:
          return 'forward_10'
        case 30:
          return 'forward_30'
        default:
          return 'forward_5'
      }
    },

    ...mapState('AudioPlayer', [
      'playing',
      'hide',
      'currentTime',
      'duration',
      'queueIndex',
      'queueOpen',
      'lyricsOpen',
      'currentLyric',
      'lyricLoading',
      'lyricsWanted',
      'rewindSeekTime',
      'forwardSeekTime'
    ]),

    ...mapGetters('AudioPlayer', [
      'currentPlayingFile',
      'hasLyric'
    ]),
  },

  methods: {
    ...mapMutations('AudioPlayer', {
      toggleHide: 'TOGGLE_HIDE',
      togglePlaying: 'TOGGLE_PLAYING',
      nextTrack: 'NEXT_TRACK',
      previousTrack: 'PREVIOUS_TRACK',
      rewind: 'SET_REWIND',
      forward: 'SET_FORWARD',
      setTrack: 'SET_TRACK',
      setQueue: 'SET_QUEUE',
      removeFromQueue: 'REMOVE_FROM_QUEUE',
      emptyQueue: 'EMPTY_QUEUE',
      setVolume: 'SET_VOLUME',
      setSeekTime: 'SET_SEEKTIME',
      setQueueOpen: 'SET_QUEUE_OPEN',
      setLyricsOpen: 'SET_LYRICS_OPEN',
      toggleQueue: 'TOGGLE_QUEUE',
      toggleLyrics: 'TOGGLE_LYRICS',
    }),

    // 拖动中：只更新本地值，避免和 timeupdate 打架
    onSeekInput(value) {
      this.seeking = true
      this.seekValue = value

      // 兜底：手势被打断时收不到 change，3 秒后恢复跟随播放进度
      clearTimeout(this.seekingTimer)
      this.seekingTimer = setTimeout(() => {
        this.seekingTimer = null
        this.seeking = false
      }, 3000)
    },

    // 松手（change）：把跳转意图交给播放引擎
    onSeekChange(value) {
      clearTimeout(this.seekingTimer)
      this.seekingTimer = null
      this.seeking = false
      this.seekValue = value
      this.setSeekTime(value)
    },

    formatSeconds(seconds) {
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
    },

    samCoverUrl(hash) {
      // 从 LocalStorage 中读取 token
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      return hash ? `/api/cover/${hash.split('/')[0]}?type=sam&token=${token}` : ""
    },

    // 点整行 = 播放这一条
    onClickTrack(index) {
      this.setTrack(index)
    },

    /**
     * 长按手势：按住超过 LONG_PRESS[key].fire 就触发对应动作。
     * 松手可能发生在按钮之外（清空播放列表后没有在播曲目，整个播放器会隐藏），
     * 所以松手监听挂在 window 上，保证能收尾。
     */
    startPress(key) {
      // 计时器触发后会被置空，所以互斥要用 pressHeld 而不是 pressTimer
      if (this.pressHeld === true) return

      const conf = LONG_PRESS[key]

      this.pressHeld = true
      this.pressKey = key
      this.pressDone = false

      // 按住一小会儿才换图标，避免普通点击时闪一下
      this.pressFeedbackTimer = setTimeout(() => {
        this.pressFeedbackTimer = null
        this.pressActive = true
      }, conf.feedback)

      this.pressTimer = setTimeout(() => {
        this.pressTimer = null
        this.pressDone = true
        this.fireLongPress(key)

        // 继续按住就按固定间隔反复快进/快退
        if (conf.repeat !== void 0) {
          this.pressRepeatTimer = setInterval(() => {
            this.fireLongPress(key)
          }, conf.repeat)
        }
      }, conf.fire)

      window.addEventListener('mouseup', this.cancelPress)
      window.addEventListener('touchend', this.cancelPress)
      window.addEventListener('touchcancel', this.cancelPress)
    },

    fireLongPress(key) {
      if (key === 'queue') {
        this.emptyQueue()
      } else if (key === 'previous') {
        this.rewind()
      } else if (key === 'next') {
        this.forward()
      }
    },

    cancelPress() {
      if (this.pressFeedbackTimer !== null) {
        clearTimeout(this.pressFeedbackTimer)
        this.pressFeedbackTimer = null
      }

      if (this.pressTimer !== null) {
        clearTimeout(this.pressTimer)
        this.pressTimer = null
      }

      if (this.pressRepeatTimer !== null) {
        clearInterval(this.pressRepeatTimer)
        this.pressRepeatTimer = null
      }

      window.removeEventListener('mouseup', this.cancelPress)
      window.removeEventListener('touchend', this.cancelPress)
      window.removeEventListener('touchcancel', this.cancelPress)

      this.pressHeld = false
      this.pressActive = false
      this.pressKey = null
    },

    // 长按已触发时浏览器补发的 click 要吞掉，否则会再走一次短按动作
    onPressClick(key) {
      if (this.pressDone === true) {
        this.pressDone = false
        return
      }

      if (key === 'queue') {
        this.toggleQueue()
      } else if (key === 'previous') {
        this.previousTrack()
      } else if (key === 'next') {
        this.nextTrack()
      }
    },

    // 模板里用：判断某个按钮是否处于长按反馈中
    isPressing(key) {
      return this.pressActive === true && this.pressKey === key
    },

    /**
     * 点上/下箭头把某条曲目挪一位。拖动已取消，鼠标和触摸都走这里。
     * 正在播放的那条跟着自己的曲目走（只换下标，不换曲目），所以播放不中断。
     */
    moveTrack(index, offset) {
      const newIndex = index + offset
      if (newIndex < 0 || newIndex >= this.queue.length) return

      const queue = this.queue.concat()
      queue.splice(newIndex, 0, queue.splice(index, 1)[0])

      let playingIndex = this.queueIndex
      if (index === playingIndex) {
        playingIndex = newIndex
      } else if (index < playingIndex && newIndex >= playingIndex) {
        playingIndex -= 1
      } else if (index > playingIndex && newIndex <= playingIndex) {
        playingIndex += 1
      }

      this.setQueue({ queue, index: playingIndex, resetPlaying: false })

      // 挪过页边界时跟着它走，否则这条会从当前页消失
      const targetPage = Math.floor(newIndex / QUEUE_PAGE_SIZE)
      if (targetPage !== this.page) this.page = targetPage
    },

    // 翻页：只改当前页，不动队列
    goPage(target) {
      this.page = Math.min(Math.max(target, 0), this.pageCount - 1)
    },

    // 列表里显示的标题：去掉音频扩展名。它是文件管理信息，占着宽度，
    // 还容易把断行点挤到很难看的位置；完整文件名留在 title 属性里
    shortTitle(title) {
      return String(title || '').replace(/\.(mp3|wav|flac|m4a|aac|ogg|opus|wma)$/i, '')
    },

    openWorkDetail() {
      // /work/:id 会被路由守卫改成打开详情面板，所以这里比较的是面板当前打开的作品
      const workid = this.workDetailUrl
        ? Number(this.workDetailUrl.split('/').pop())
        : null

      if (workid !== null && this.$store.state.WorkPanel.workId !== workid) {
        // 被守卫取消的导航会 reject，这里吞掉它
        this.$router.push(this.workDetailUrl).catch(() => {})
      }
      if (this.$q.screen.lt.sm) {
        this.toggleHide()
      }
    }
  }
}
</script>


<style lang="scss" scoped>
.audio-player {
  // 竖直排布：封面 / 播放列表 / 播放控件；列表展开时由封面收缩让出空间
  display: flex;
  flex-direction: column;

  // 除封面外都保持自身高度，不参与压缩
  > * {
    flex: 0 0 auto;
  }

  // 宽度 > $breakpoint-sm-min
  @media (min-width: $breakpoint-sm-min) {
    width: 330px;
    margin: 0px 10px 10px 0px;
    max-height: calc(100vh - 20px);
  }

  // 宽度 < $breakpoint-xs-max (599px)
  @media (max-width: $breakpoint-xs-max) {
    width: 100%;
    height: 100%;
  }
}

// 封面：空间不足时收缩；移动端吃掉剩余高度
.audio-player > .albumart {
  position: relative; // 歌词面板按封面区定位（absolute-full）
  flex: 0 1 auto;
  min-height: 80px;
  overflow: hidden;

  // 宽度 < $breakpoint-xs-max (599px)
  @media (max-width: $breakpoint-xs-max) {
    width: 100%;
    flex: 1 1 auto;
  }
}

// 歌词：压在封面下沿的一条，高度跟着内容走。
// 底色比收起态那条实一点：它压在各种封面上，要保证紫字看得清
.lyrics-view {
  padding: 3px 12px;
  background-color: rgba($grey-4, $alpha: 0.7);
  overflow: hidden;
}

.lyrics-view__line {
  width: 100%;
  // text-h6 自带 2rem（32px）行高，单行歌词上下会显得很空，这里收紧到 1.3
  line-height: 1.3;
}

// 从封面下沿往上弹
.lyrics-pop-enter-active,
.lyrics-pop-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.lyrics-pop-enter-from,
.lyrics-pop-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

// 播放控件区：一排按钮（含播放键）与音量条的高度、宽度都固定，
// 封面收缩让出空间时按钮不会跟着跳动
$control-row-height: 65px;
$control-btn-width: 55px;
$play-btn-width: 65px;
$volume-row-height: 50px;
$volume-slider-width: 200px;

.control-row {
  height: $control-row-height;
}

.control-btn {
  width: $control-btn-width;

  &--play {
    width: $play-btn-width;
  }
}

.volume-row {
  height: $volume-row-height;
}

.volume-slider {
  max-width: $volume-slider-width;
}

// 行高沿用 Quasar q-item 的 min-height；一页固定 4 行，另加一条分页条。
// 分页条高度按 QPagination 里按钮的 min-height（2.572em × 14px ≈ 36px）给，
// 否则原生控件会被裁掉
$queue-row: 48px;
$queue-cover: 40px; // 行内封面：和收起态播放条同款，卡在 48px 行高里
$queue-page-rows: 4;
$queue-pager: 36px;
$queue-body: $queue-row * $queue-page-rows;
$queue-block: $queue-body + $queue-pager;

// 内嵌在播放器里的当前播放列表：高度固定成「4 行 + 分页条」，永远不出滚动条
.current-play-list {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  height: $queue-block;
  overflow: hidden;
  // 和下面的播放控件（进度条起）用一条淡分割线隔开
  border-bottom: 1px solid $separator-color;
}

// 列表本体：只放一页的行，固定高度，不滚动
.queue-list {
  height: $queue-body;
  overflow: hidden;
  // 和下面的分页条之间也隔一条
  border-bottom: 1px solid $separator-color;
}

// 行首箭头 / 行尾删除：尺寸全部自己定。
// q-btn 的 size 是「放大」用的（内联 font-size，图标 = 1.715em × 字号），
// 原来的 size="sm" 把图标撑到 41px、按钮 41×45，横竖都占地方。
// 套在 .queue-item 里是为了盖过 Quasar 给 __section--side 的 16px 内边距。
.queue-item {
  // 固定行高，保证一页 4 行的高度是确定的（队列不足 4 条时下面留白）
  height: $queue-row;

  // 封面：正方形 + rounded-borders，和收起态播放条一致（原来是 38px 圆角头像）
  .queue-item__cover {
    width: $queue-cover;
    height: $queue-cover;
  }

  // 两行标题：字号压到 13px、行高 1.35，两行 ≈ 35px。
  // 默认的 14px/1.5 两行几乎顶满 48px 行高，看着挤
  .queue-item__title {
    font-size: 13px;
    line-height: 1.35;
  }

  .queue-arrows,
  .queue-remove {
    .q-btn {
      min-width: 0;
      min-height: 0;
      padding: 0;
      line-height: 1;
    }
  }

  // 行首：两枚箭头竖着塞进 48px 的行高，与封面之间留 6px
  .queue-arrows {
    gap: 2px;
    padding-right: 6px;

    .q-btn {
      width: 22px;
      height: 22px;
      font-size: 12px; // 图标 1.715em ≈ 20.6px
    }
  }

  // 行尾：删除按钮与标题之间留 6px
  .queue-remove {
    padding-left: 6px;

    .q-btn {
      width: 24px;
      height: 24px;
      font-size: 13px; // 图标 1.715em ≈ 22.3px
    }
  }
}

// 分页条：只有原生分页控件，居中一行。
// 注意不要在这里给 .q-btn 定死宽高，QPagination 的按钮是 2.572em 高的
.queue-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  height: $queue-pager;
}

// 视口太矮，连「封面 + 4 行」都放不下时，列表改为盖在封面下沿
@media (max-height: 560px) {
  .current-play-list {
    margin-top: -$queue-block;
  }
}
</style>
