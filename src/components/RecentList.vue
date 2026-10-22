<template>
  <div>
    <div class="text-h5 text-weight-regular">
      {{ pageTitle }}
    </div>

    <div>
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
      pageTitle: 'Recent Track',
      requestId: 0
    }
  },

  created() {
    this.requestRecentWorks()
  },

  activated() {
    this.requestRecentWorks()
  },

  sockets: {
    HISTORY_UPDATED (payload) {
      this.applyHistoryUpdate(payload)
    },

    // 断线期间可能漏掉事件，重连后全量校准一次
    connect () {
      this.requestRecentWorks()
    }
  },
  
  methods: {
    async requestRecentWorks() {
      const currentRequestId = ++this.requestId
      this.$axios.get('/api/history/recent')
        .then(res => {
          if (currentRequestId !== this.requestId) return
          this.recentworks = Array.isArray(res.data) ? res.data : []
        })
        .catch(console.error)
    },

    applyHistoryUpdate (payload) {
      const history = payload && payload.history
      if (!history || history.work_id === undefined) return

      const workId = Number(history.work_id)
      const fileIndex = Number(history.file_index)
      if (!Number.isFinite(workId) || !Number.isFinite(fileIndex)) return

      const limit = Math.max(1, Number(payload.limit) || 20)
      const updated = {
        ...history,
        work_id: workId,
        file_index: fileIndex
      }
      const shouldHydrate = this.recentworks.length === 0

      // 让仍在路上的 GET 结果失效，避免旧快照覆盖刚收到的实时数据
      this.requestId += 1
      this.recentworks = [
        updated,
        ...this.recentworks.filter(item => Number(item.work_id) !== workId)
      ].slice(0, limit)

      // 首次事件早于列表首屏请求返回时，补一次完整列表，避免只显示当前这一条
      if (shouldHydrate) this.requestRecentWorks()
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
