<template>
  <div class="column no-wrap fit bg-white">
    <!-- 返回作品列表 -->
    <div class="row items-center no-wrap bg-grey-2 q-pr-sm">
      <q-btn flat dense round :icon="backIcon" @click="$emit('close')">
        <q-tooltip>返回作品列表</q-tooltip>
      </q-btn>

      <div class="col q-ml-sm ellipsis text-subtitle1 text-weight-medium">
        {{ metadata.title || `RJ${rjcode}` }}
      </div>
    </div>

    <q-separator />

    <!-- 详情 + 文件树，独立滚动 -->
    <div class="col scroll">
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

  computed: {
    rjcode () {
      const workid = this.workid
      return workid >= 1000000
        ? (`00000000${workid}`).slice(-8)
        : (`000000${workid}`).slice(-6)
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
