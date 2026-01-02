<template>
  <div>
    <!-- 标题 -->
    <div class="text-h5 text-weight-regular q-mx-md q-mt-md">
      {{ pageTitle }}
    </div>

    <div class="row justify-center q-mx-md">
      <div class="col q-pa-md" style="overflow-x: auto;" @wheel.prevent="onHorizontalWheel">
        <div class="row q-col-gutter-x-md no-wrap">
          <div class="col-xl-2 col-lg-2 col-md-3 col-xs-6 col-sm-4" v-for="recentwork in recentworks"
            :key="recentwork.id">
            <RecentCard :metadata="recentwork" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import RecentCard from 'components/RecentCard'
// import NotifyMixin from '../mixins/Notification.js'

export default {
  name: 'RecentList',

  components: { RecentCard },

  data () {
    return {
      recentworks: [],
      pageTitle: '最近播放'
    }
  },

  created() {
    this.requestRecentWorks()
  },

  activated() {
    this.requestRecentWorks()
  },
  
  methods: {
    async requestRecentWorks() {
      this.$axios.get('/api/history/recent')
        .then(res => {
          this.recentworks = res.data
        })
        .catch(console.error)
    },

    onClickClearButton () {
      this.$axios.get('/api/history/deleteRecent')
        .then(() => {
          this.recentworks = []
        })
    },

    onHorizontalWheel(e) {
      e.currentTarget.scrollLeft += e.deltaY * 0.8
    }
  }
}

</script>

<style lang="scss" scoped>

</style>
