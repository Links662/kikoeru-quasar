<template>
    <q-card
      id="draggable"
      @mousedown="onCursorDown"
      @mouseup="onCursorUp"
      @touchstart="onCursorDown"
      @touchend="onCursorUp"
    >
        <div id="lyricsBar" class="text-center text-h6 text-bold ellipsis-2-lines text-purple q-mb-md absolute-bottom">
            <span id="lyric">
              {{currentLyric}}
            </span>
        </div>
    </q-card>
</template>

<script>
import { mapState } from 'vuex'

const onCursorMove = (that) => (ev) => {
  if (!that.beTouched || !that.draggable) { return }

  // ev.preventDefault()
  const touch = that.getTouch(ev)

  // 计算 element 新位置坐标
  const eleX = touch.clientX - that.startX
  const eleY = touch.clientY - that.startY

  that.draggable.style.left = eleX + 'px'
  that.draggable.style.top = eleY + 'px'

}

export default {
  name: 'LyricsBar',

  computed: {
    ...mapState('AudioPlayer', [
      'currentLyric'
    ]),

    draggable() {
      return document.getElementById('draggable')
    }
  },

  data () {
    return {
      beTouched: false,
      onMove: null,

      // 鼠标按下时的位置
      startX: 0,
      startY: 0
    }
  },

  methods: {
    /**
     * @param {TouchEvent|MouseEvent} ev
     */
    getTouch(ev) {
      return ev.touches ? ev.touches[0] : ev;
    },

    onCursorDown(ev) {
      ev.preventDefault()
      this.beTouched = true

      // 移动端使用 ev.touches[0]
      const touch = this.getTouch(ev)
      this.startX = touch.clientX - this.draggable.offsetLeft
      this.startY = touch.clientY - this.draggable.offsetTop
    },

    onCursorUp(ev) {
      ev.preventDefault()
      this.beTouched = false
    }
  },

  mounted() {
    // 保留函数引用，组件销毁时才能摘掉监听，否则每次重新挂载都会泄漏一组全局监听
    this.onMove = onCursorMove(this)
    window.addEventListener('mousemove', this.onMove, false)
    window.addEventListener('touchmove', this.onMove, false)
  },

  beforeUnmount() {
    window.removeEventListener('mousemove', this.onMove, false)
    window.removeEventListener('touchmove', this.onMove, false)
    this.onMove = null
  }
}
</script>

<style lang="scss">
  #lyricsBar {
    background-color: rgba($grey-4, $alpha: 0.6);
    min-width: 1vw;
    position: absolute;
  }
</style>
