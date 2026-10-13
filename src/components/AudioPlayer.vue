<template>
  <div>
    <!-- 播放器 -->
    <q-slide-transition>
      <q-card square v-show="currentPlayingFile.hash && !hide"
        class="fixed-bottom-right bg-white text-black audio-player" @mousewheel.prevent @touchmove.prevent>
        <!-- 音声封面 -->
        <div class="bg-dark row items-center albumart">
          <q-img contain transition="fade" :src="coverUrl" :ratio="4 / 3" />
          <q-btn dense round size="md" color="white" text-color="dark" icon="keyboard_arrow_down" @click="toggleHide()"
            class="absolute-top-left q-ma-sm" />
          <q-btn dense round size="md" color="white" text-color="dark" icon="info_outline"
            class="absolute-top-right q-ma-sm" @click="openWorkDetail()" />
        </div>

        <!-- 当前播放列表：内嵌在封面与播放控件之间，按可用高度微调（至少三行） -->
        <div class="current-play-list bg-white" v-show="showCurrentPlayList">
          <!-- 音频文件列表 -->
          <q-list class="scroll fit" @mousewheel.stop @touchmove.stop>
            <draggable handle=".handle" :disabled="useArrowReorder" v-model="queueCopy"
              @change="val => onMoved(val.moved)">
              <q-item clickable v-ripple v-for="(track, index) in queueCopy" :key="index" :active="queueIndex === index"
                active-class="text-white bg-teal" class="non-selectable q-py-none q-px-sm"
                @click="onClickTrack(index)">
                <!-- 鼠标设备：拖拽手柄；触摸设备的排序入口是下面的箭头 -->
                <q-item-section side class="handle" v-if="!useArrowReorder">
                  <q-icon name="reorder" :color="queueIndex === index ? 'white' : 'dark'" />
                </q-item-section>

                <!-- 触摸设备：上下箭头竖排（横排太占宽度），点一下把这条曲目挪一位 -->
                <q-item-section side v-else class="queue-arrows">
                  <q-btn dense flat size="sm" padding="2px 0" icon="arrow_upward"
                    :color="queueIndex === index ? 'white' : 'dark'" :disable="index === 0"
                    @click.stop="moveTrack(index, -1)" />
                  <q-btn dense flat size="sm" padding="2px 0" icon="arrow_downward" class="q-mt-xs"
                    :color="queueIndex === index ? 'white' : 'dark'" :disable="index === queueCopy.length - 1"
                    @click.stop="moveTrack(index, 1)" />
                </q-item-section>

                <q-item-section avatar>
                  <!-- 列表项封面：Quasar 的尺寸档位 lg = 38px -->
                  <q-avatar size="lg" rounded class="col-auto">
                    <q-img transition="fade" :src="samCoverUrl(track.hash)" class="fit" />
                  </q-avatar>
                </q-item-section>

                <q-item-section>
                  <q-item-label lines="1">{{ track.title }}</q-item-label>
                  <q-item-label caption lines="1">{{ track.album }}</q-item-label>
                </q-item-section>

                <q-item-section side>
                  <q-btn dense flat size="sm" padding="2px 0" icon="clear"
                    :color="queueIndex === index ? 'white' : 'red'" @click.stop="removeFromQueue(index)" />
                </q-item-section>
              </q-item>
            </draggable>
          </q-list>
        </div>

        <!-- 进度条：数据来自 store，播放引擎已不依赖本组件存在 -->
        <div class="row items-center q-mx-sm q-my-sm">
          <div class="col-auto">{{ formatSeconds(currentTime) }}</div>
          <q-slider
            class="col q-mx-sm"
            :value="seekValue"
            :min="0"
            :max="sliderMax"
            :step="1"
            :disable="!currentPlayingFile.hash"
            :label-value="formatSeconds(seekValue)"
            label
            thumb-size="12px"
            color="primary"
            @input="onSeekInput"
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
        <div class="row justify-around" style="height: 65px">
          <!-- 短按：展开/收起播放列表；长按 5 秒：清空播放列表 -->
          <q-btn flat dense size="md" :icon="isPressing('queue') ? 'delete_forever' : 'queue_music'"
            :color="isPressing('queue') ? 'negative' : (showCurrentPlayList ? 'primary' : undefined)"
            @click="onPressClick('queue')" @mousedown="startPress('queue')" @touchstart="startPress('queue')"
            @mouseleave="cancelPress" @contextmenu.prevent
            style="width: 55px" class="col-auto non-selectable" />
          <!-- 短按：上一首；长按：后退 -->
          <q-btn flat dense size="lg" :icon="isPressing('previous') ? rewindIcon : 'skip_previous'"
            @click="onPressClick('previous')" @mousedown="startPress('previous')"
            @touchstart="startPress('previous')" @mouseleave="cancelPress"
            style="width: 55px" class="col-auto non-selectable" />
          <q-btn flat dense size="28px" :icon="playingIcon" @click="togglePlaying()" style="width: 65px"
            class="col-auto" />
          <!-- 短按：下一首；长按：前进 -->
          <q-btn flat dense size="lg" :icon="isPressing('next') ? forwardIcon : 'skip_next'"
            @click="onPressClick('next')" @mousedown="startPress('next')" @touchstart="startPress('next')"
            @mouseleave="cancelPress" style="width: 55px" class="col-auto non-selectable" />
          <q-btn flat dense size="md" :icon="playModeIcon" @click="changePlayMode()" style="width: 55px"
            class="col-auto" />
        </div>

        <!-- 音量控件 -->
        <!-- HTML5 volume in iOS is read-only -->
        <div class="row items-center q-mx-lg" style="height: 50px" v-if="!$q.platform.is.ios">
          <q-icon name="volume_down" size="sm" class="col-auto" />
          <vue-slider v-model="volume" :min="0" :max="1" :interval="0.01" :dragOnClick="true" :contained="true"
            tooltip="none" class="col" />
          <q-icon name="volume_up" size="sm" class="col-auto" />
        </div>
      </q-card>
    </q-slide-transition>
  </div>
</template>

<script>
import draggable from 'vuedraggable'
import { mapState, mapGetters, mapMutations } from 'vuex'

// 长按手势时长表：fire 到点触发动作，feedback 到点进入长按反馈（按钮图标变化），
// repeat 表示继续按住时按该间隔反复触发
const LONG_PRESS = {
  queue: { fire: 2000, feedback: 500 }, // 长按清空播放列表
  previous: { fire: 1000, feedback: 200, repeat: 1000 }, // 长按后退，按住不放持续后退
  next: { fire: 1000, feedback: 200, repeat: 1000 } // 长按前进，按住不放持续前进
}

export default {
  name: 'AudioPlayer',

  components: {
    draggable
  },

  data() {
    return {
      showCurrentPlayList: false,
      queueCopy: [],
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

  beforeDestroy() {
    this.cancelPress()
    clearTimeout(this.seekingTimer)
  },

  watch: {
    queue(val) {
      this.queueCopy = val.concat()
      // 在删除最后一个 track 时关闭当前播放列表
      if (this.queueCopy.length === 0) {
        this.showCurrentPlayList = false
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

    // 触摸优先的设备（手机 / 平板）点不到拖拽手柄，改用上下箭头排序；
    // 判断依据是「主指针」是不是粗指针，这样带触摸屏的笔记本仍然保留拖拽
    useArrowReorder() {
      if (typeof window.matchMedia === 'function') {
        const coarse = window.matchMedia('(pointer: coarse)').matches
        const fine = window.matchMedia('(pointer: fine)').matches

        // 浏览器认识 pointer 媒体特性时只会命中一个，不认识时两个都是 false
        if (coarse !== fine) return coarse
      }

      // 退路：老浏览器（或 SSR）按 Quasar 的触摸探测决定
      return this.$q.platform.has.touch
    },

    playModeIcon() {
      switch (this.playMode.name) {
        case "all repeat":
          return "repeat"
        case "repeat once":
          return "repeat_one"
        case "shuffle":
          return "shuffle"
        default:
          return "playlist_play"
      }
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
      'playMode',
      'rewindSeekTime',
      'forwardSeekTime'
    ]),

    ...mapGetters('AudioPlayer', [
      'currentPlayingFile'
    ]),
  },

  methods: {
    ...mapMutations('AudioPlayer', {
      toggleHide: 'TOGGLE_HIDE',
      togglePlaying: 'TOGGLE_PLAYING',
      nextTrack: 'NEXT_TRACK',
      previousTrack: 'PREVIOUS_TRACK',
      changePlayMode: 'CHANGE_PLAY_MODE',
      rewind: 'SET_REWIND',
      forward: 'SET_FORWARD',
      setTrack: 'SET_TRACK',
      setQueue: 'SET_QUEUE',
      removeFromQueue: 'REMOVE_FROM_QUEUE',
      emptyQueue: 'EMPTY_QUEUE',
      setVolume: 'SET_VOLUME',
      setSeekTime: 'SET_SEEKTIME',
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
        this.showCurrentPlayList = !this.showCurrentPlayList
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

    onMoved(moved) {
      let index = null
      if (moved.oldIndex === this.queueIndex) {
        index = moved.newIndex
      } else if (moved.oldIndex < this.queueIndex && moved.newIndex >= this.queueIndex) {
        index = this.queueIndex - 1
      } else if (moved.oldIndex > this.queueIndex && moved.newIndex <= this.queueIndex) {
        index = this.queueIndex + 1
      } else {
        index = this.queueIndex
      }

      this.setQueue({
        queue: this.queueCopy.concat(),
        index: index,
        resetPlaying: false
      })
    },

    /**
     * 触摸设备：点上/下箭头把某条曲目挪一位。
     * 先就地换位，再复用 onMoved，让「正在播放的那条」的索引跟着一起挪。
     */
    moveTrack(index, offset) {
      const newIndex = index + offset

      if (newIndex < 0 || newIndex >= this.queueCopy.length) return

      const queue = this.queueCopy.concat()
      queue.splice(newIndex, 0, queue.splice(index, 1)[0])
      this.queueCopy = queue

      this.onMoved({ oldIndex: index, newIndex })
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
  flex: 0 1 auto;
  min-height: 80px;
  overflow: hidden;

  // 宽度 < $breakpoint-xs-max (599px)
  @media (max-width: $breakpoint-xs-max) {
    width: 100%;
    flex: 1 1 auto;
  }
}

// 当前播放列表的行高：沿用 Quasar q-item 的 min-height，三行刚好放下三条曲目
$queue-row: 48px;

// 内嵌在播放器里的当前播放列表：按可用高度微调，最少三行
.current-play-list {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  min-height: 3 * $queue-row;
  max-height: 45vh;
  overflow: hidden;
}

// 视口太矮，连「封面 + 三行」都放不下时，列表改为盖在封面下沿
@media (max-height: 470px) {
  .current-play-list {
    flex: 0 0 auto;
    height: 3 * $queue-row;
    margin-top: -3 * $queue-row;
  }
}
</style>
