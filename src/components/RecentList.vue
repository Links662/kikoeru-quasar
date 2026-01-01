<template>
  <div>
    <div class="text-h5 text-weight-regular q-ma-md">
      {{ pageTitle }}
      <q-btn
        color="red"
        size="xs"
        label="清除"
        class="q-ml-sm"
        @click="onClickClearButton"
      />
    </div>

    <div class="row justify-center q-mx-md">
      <!-- 横向滚动容器 -->
      <div
        class="col"
        style="overflow-x: auto; padding: 15px;"
        @wheel.prevent="onHorizontalWheel"
      >
        <div class="row q-col-gutter-x-md q-col-gutter-y-lg no-wrap">
          <div
            class="col-xl-2 col-lg-2 col-md-3 col-xs-6 col-sm-4"
            v-for="recentwork in recentworks"
            :key="recentwork.id"
            style="flex: 0 0 auto"
          >
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
  .list {
    // 宽度 >= $breakpoint-sm-min
    @media (min-width: $breakpoint-sm-min) {
      padding: 0px 20px;
    }
  }

  .work-card {
    // 宽度 > $breakpoint-xl-min
    @media (min-width: $breakpoint-md-min) {
      width: 560px;
    }
  }

  .btn-right {
    float: right;
    font-size:32px;
    position: relative;
    top: -75px;
    background: rgba(71, 71, 71, 0.548);
    cursor: hand;
    z-index: 1000;
  }
</style>
