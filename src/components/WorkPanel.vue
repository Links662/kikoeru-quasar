<template>
  <div class="column no-wrap fit bg-white relative-position">
    <!-- 右侧贴边把手：点一下收起面板；鼠标悬停 / 键盘聚焦时展宽并变主色 -->
    <button
      class="panel-grip"
      type="button"
      aria-label="收起作品详情"
      @click="$emit('close')"
      @wheel="onGripWheel"
    >
      <span class="panel-grip__bar">
        <q-icon name="chevron_left" size="12px" />
      </span>

      <!-- 触屏点按会闪一下 tooltip，所以只在鼠标设备上挂 -->
      <q-tooltip v-if="!hasTouch" anchor="center right" self="center left" :offset="[8, 0]">
        收起详情
      </q-tooltip>
    </button>

    <!-- 详情 + 文件树，独立滚动 -->
    <div ref="scrollBody" class="col scroll work-panel-scroll">
      <WorkDetails :metadata="metadata" @reset="requestData()" />
      <WorkTree :tree="tree" :metadata="metadata" :editable="false" />
    </div>
  </div>
</template>

<script>
import WorkDetails from 'components/WorkDetails'
import WorkTree from 'components/WorkTree'
import NotifyMixin from '../mixins/Notification.js'

export default {
  name: 'WorkPanel',

  mixins: [NotifyMixin],

  components: {
    WorkDetails,
    WorkTree
  },

  props: {
    workid: {
      type: Number,
      required: true
    }
  },

  data () {
    return {
      metadata: {
        id: this.workid,
        circle: {}
      },
      tree: []
    }
  },

  watch: {
    workid () {
      this.reset()
    }
  },

  computed: {
    // 触屏设备没有 hover，要靠按下态来表达，tooltip 也只在鼠标设备上挂
    hasTouch () {
      return this.$q.platform.has.touch === true
    }
  },

  created () {
    this.requestData()
  },

  methods: {
    // 把手盖在滚动区上面，滚轮落在它身上时手动转发给面板，右边缘不会变成滚动死区
    onGripWheel (event) {
      const body = this.$refs.scrollBody
      if (!body) return

      const step = event.deltaMode === 1 ? 16 : (event.deltaMode === 2 ? body.clientHeight : 1)
      body.scrollTop += event.deltaY * step
    },

    reset () {
      this.metadata = {
        id: this.workid,
        circle: {}
      }
      this.tree = []
      this.requestData()
    },

    async requestData () {
      const workid = this.workid

      try {
        // 第一个请求：获取 metadata
        const metadataResponse = await this.$axios.get(`/api/work/${workid}`)
        if (workid !== this.workid) return // 期间已经切到别的作品，丢弃这次结果
        this.metadata = metadataResponse.data

        // 第二个请求：获取 tracks（在第一个请求成功后执行）
        const tracksResponse = await this.$axios.get(`/api/tracks/${workid}`)
        if (workid !== this.workid) return
        this.tree = tracksResponse.data
      } catch (error) {
        if (error.response) {
          // 请求已发出，但服务器响应的状态码不在 2xx 范围内
          this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`);
        } else {
          this.showErrNotif(error.message || error);
        }
      }
    },
  }
}
</script>

<style lang="scss" scoped>
// 右侧贴边把手：可见的是一条细杆，实际命中区比它宽，避免只有几像素难点
.panel-grip {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  width: 16px;
  padding: 0;
  border: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  // 把手自己不能成为选择起点：否则按住它拖动会在面板里拉出一段选区
  user-select: none;
  -webkit-user-select: none;

  &__bar {
    position: relative;
    display: block;
    flex: 0 0 auto; // 展开时向左长出容器，不要被 16px 的命中区压回去
    width: 6px;
    height: 96px;
    border-radius: 999px 0 0 999px;
    background: rgba(0, 0, 0, .16);
    transition: width .18s ease, background-color .18s ease;
  }

  .q-icon {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    color: #fff;
    opacity: 0;
    transition: opacity .18s ease;
  }

  &:hover &__bar,
  &:focus-visible &__bar {
    width: 12px;
    background: $primary;
  }

  &:hover .q-icon,
  &:focus-visible .q-icon {
    opacity: 1;
  }

  &:focus-visible {
    outline: none; // 焦点态由把手自身的展开+主色表达
  }
}

// 触屏没有 hover：把手常驻略粗一点，按下时才展开变主色
@media (hover: none) {
  .panel-grip__bar {
    width: 6px;
    background: rgba(0, 0, 0, .18);
  }

  .panel-grip:active .panel-grip__bar {
    width: 12px;
    background: $primary;
  }

  .panel-grip:active .q-icon {
    opacity: 1;
  }
}

// 隐藏滚动条，但保留滚动能力
.work-panel-scroll {
  scrollbar-width: none; // Firefox
  -ms-overflow-style: none; // 旧版 Edge / IE
  overscroll-behavior: contain; // 滚到边界后不要带着背后的页面一起滚

  &::-webkit-scrollbar {
    display: none; // Chrome / Safari / 新版 Edge
  }
}
</style>
