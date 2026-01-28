<template>
  <div>
    <WorkDetails :metadata="metadata" @reset="requestData()" />
    <WorkTree :tree="tree" :metadata="metadata" :editable="false" />
  </div>
</template>

<script>
import WorkDetails from 'components/WorkDetails'
import WorkTree from 'components/WorkTree'
import NotifyMixin from '../mixins/Notification.js'

export default {
  name: 'Work',

  mixins: [NotifyMixin],

  components: {
    WorkDetails,
    WorkTree
  },

  data () {
    return {
      workid: this.$route.params.id,
      metadata: {
        id: parseInt(this.$route.params.id),
        circle: {}
      },
      tree: []
    }
  },

  watch: {
    $route (to) {
      this.workid = to.params.id;
      this.requestData();
    }
  },

  created () {
    this.requestData()
  },

  methods: {
    async requestData() {
      try {
        // 第一个请求：获取 metadata
        const metadataResponse = await this.$axios.get(`/api/work/${this.workid}`);
        this.metadata = metadataResponse.data;

        // 第二个请求：获取 tracks (在第一个请求成功后执行)
        const tracksResponse = await this.$axios.get(`/api/tracks/${this.workid}`);
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
