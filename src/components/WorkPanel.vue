<template>
  <div class="column no-wrap fit bg-white relative-position">
    <!-- 悬浮返回按钮（顶部不再占用工具条） -->
    <q-btn
      class="work-panel-back absolute-top-right q-ma-sm"
      round
      color="primary"
      text-color="white"
      :icon="backIcon"
      @click="$emit('close')"
    >
      <q-tooltip>返回作品列表</q-tooltip>
    </q-btn>

    <!-- 详情 + 文件树，独立滚动 -->
    <div class="col scroll work-panel-scroll">
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
    },

    backIcon: {
      type: String,
      default: 'arrow_back'
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

  created () {
    this.requestData()
  },

  methods: {
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
// 悬浮的返回按钮，始终停留在面板右上角
.work-panel-back {
  z-index: 5;
  opacity: 0.9;

  &:hover,
  &:focus {
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
