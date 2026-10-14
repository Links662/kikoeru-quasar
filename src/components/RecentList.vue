<template>
  <div>
    <div class="text-h5 text-weight-regular">
      {{ pageTitle }}
    </div>

    <div class="justify-center">
      <!-- 只横向滚动：overflow-auto 负责 x，overflow-hidden-y 压掉可能出现的竖向滚动条 -->
      <div class="q-pa-md overflow-auto overflow-hidden-y" @wheel.prevent="onHorizontalWheel">
        <div class="row q-col-gutter-x-md no-wrap">
          <div class="col-xl-2 col-lg-2 col-md-3 col-xs-6 col-sm-4" v-for="recentwork in recentworks"
            :key="recentwork.id">
            <RecentCard :recentwork="recentwork" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import RecentCard from 'components/RecentCard'

export default {
  name: 'RecentList',

  components: { RecentCard },

  data () {
    return {
      recentworks: [],
      pageTitle: 'Recent Track'
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
