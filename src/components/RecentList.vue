<template>
  <div>
    <div class="text-h5 text-weight-regular">
      {{ pageTitle }}
    </div>

    <div class="justify-center">
      <!-- 只横向滚动：overflow-auto 负责 x，overflow-hidden-y 压掉可能出现的竖向滚动条 -->
      <div class="recent-scroll q-pa-md overflow-auto overflow-hidden-y" @wheel.prevent="onHorizontalWheel">
        <div class="row q-col-gutter-x-md no-wrap">
          <div class="col-xl-2 col-lg-2 col-md-3 col-xs-6 col-sm-4" v-for="recentwork in recentworks"
            :key="recentwork.work_id">
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

<style lang="scss" scoped>
  // 最近播放这排的横向滚动条：Quasar 的 .overflow-auto 只管 overflow，
  // 不碰滚动条外观，所以这里一直是浏览器原生那条（Windows 上十几像素高、方块形状）。
  // 下面把它调细：细滑块 + 透明轨道 + 圆角。两套属性要同时写，各引擎认各自的：
  //   - scrollbar-width / scrollbar-color：Firefox 与 Chrome 121+；
  //     注意 Chrome 一旦认了这两个属性，就会忽略下面的 ::-webkit-scrollbar
  //   - ::-webkit-scrollbar：旧版 Chrome / Edge、Safari、Android WebView
  .recent-scroll {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.28) transparent;

    &::-webkit-scrollbar {
      height: 6px; // 横向滚动条的“粗细”就是它的高度
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 3px;
      background: rgba(0, 0, 0, 0.28);
    }

    &::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.45);
    }
  }
</style>
