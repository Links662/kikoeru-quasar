<template>
  <div>
    <div class="text-h5 text-weight-regular q-ma-md">
      {{pageTitle}}
    </div>

    <div :class="`row justify-center q-mx-md`">
      <q-infinite-scroll
      @load="onLoad"
      :offset="250"
      :disable="stopLoad"
      style="max-width: 1680px; overflow-x: scroll; padding: 15px;"
      class="col">
        <div class="row q-col-gutter-x-md q-col-gutter-y-lg no-wrap">
          <div class="col-md-2 col-xs-6 col-sm-4" v-for="recentwork in recentworks" :key="recentwork.id"  style="display: inline-block">
            <RecentCard :metadata="recentwork" class="fit"/>
          </div>
        </div>
      </q-infinite-scroll>
    </div>

    <!-- <div class="btn-right">
      <span style="display: inline; padding: 10px"> > </span>
    </div> -->
  </div>
</template>

<script>
import RecentCard from 'components/RecentCard'
import NotifyMixin from '../mixins/Notification.js'

export default {
  name: 'RecentList',

  mixins: [NotifyMixin],

  components: {
    RecentCard
  },

  data () {
    return {
      stopLoad: false,
      recentworks: [],
      pageTitle: '',
    }
  },

  created () {
    this.refreshPageTitle();
  },

  // keep-alive hooks
  // <keep-alive /> is set in MainLayout
  activated () {
    this.stopLoad = false
    this.requestRecentWorks()
  },

  deactivated () {
    this.stopLoad = true
  },

  methods: {
    onLoad () {
      this.requestRecentWorks()
    },

    requestRecentWorks () {
        this.$axios.get('/api/history/recent')
        .then((response) => {
            console.log(response)

            this.recentworks = response.data

            this.stopLoad = true
        })
        .catch((error) => {
            console.log(error)

            this.stopLoad = true
        })
    },

    refreshPageTitle () {
        this.pageTitle = '最近播放'
    },

    reset () {
      this.stopLoad = true
      this.refreshPageTitle()
      this.pagination = { currentPage:0, pageSize:12, totalCount:0 }
      this.requestWorksQueue()
        .then(() => {
          this.stopLoad = false
        })
    },
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
