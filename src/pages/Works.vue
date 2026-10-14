<template>
  <div class="q-mx-md q-mt-md">
    <!-- 窄屏：搜索条平时缩在蓝色导航栏后面（不占位），在列表顶部下拉才滑出来 -->
    <div
      v-if="isNarrowScreen"
      ref="searchBar"
      class="works-search-bar"
      :class="{ 'works-search-bar--shown': narrowSearchVisible }"
    >
      <q-input
        ref="searchInput"
        dense
        rounded
        outlined
        v-model="keyword"
        debounce="500"
        :placeholder="'搜索作品 / 社团 / 声优…'"
        class="works-search"
        @focus="searchFocused = true"
        @blur="handleSearchBlur"
        @keydown.esc="blurSearchInput"
        @keyup.enter="syncKeywordToRoute($event.target.value)"
      >
        <template v-slot:append>
          <q-icon v-if="keyword === ''" name="search" />
          <q-icon v-else name="clear" class="cursor-pointer" @click="keyword = ''" />
        </template>
      </q-input>
    </div>

    <RecentList />

    <div class="works-header-row q-my-sm">
      <div class="text-h5 text-weight-regular">
        {{ pageTitle }}
        <span v-show="pagination.totalCount">
          ({{ pagination.totalCount }})
        </span>
      </div>

      <!-- 宽屏：搜索框与标题同行靠右 -->
      <div v-if="wideSearchVisible" class="works-search-wrap">
        <q-input
          dense
          rounded
          outlined
          v-model="keyword"
          debounce="500"
          :placeholder="'搜索作品 / 社团 / 声优…'"
          class="works-search"
          @keyup.enter="syncKeywordToRoute($event.target.value)"
        >
          <template v-slot:append>
            <q-icon v-if="keyword === ''" name="search" />
            <q-icon v-else name="clear" class="cursor-pointer" @click="keyword = ''" />
          </template>
        </q-input>
      </div>
    </div>

    <div class="q-my-sm">
      <div v-if="works.length" class="row justify-between q-mb-sm">
        <!-- 排序选择框 -->
        <div class="row">
          <q-select dense rounded outlined behavior="menu" bg-color="white" transition-show="scale"
            transition-hide="scale" v-model="sortOption" :options="options" label="排序" class="q-mr-sm" />
          <q-btn dense rounded unelevated color="white" class="sort-btn" text-color="black"
            :icon="direction ? 'arrow_downward' : 'arrow_upward'" @click="switchSortMode" />
        </div>
        <!-- 分页控件上 -->
        <div class="row justify-center gt-xs">
          <q-pagination v-model="pagination.currentPage" :max="pagination.totalPages" :boundary-links="$q.screen.gt.sm" direction-links color="primary"
            input />
        </div>
        <div class="row items-center q-gutter-x-sm">
          <!-- 切换显示模式 -->
          <div class="col-auto">
            <q-btn-toggle dense rounded spread v-model="listMode" toggle-color="primary" color="white"
              text-color="primary" :options="[
                { icon: 'apps', value: 'detail' },
                { icon: 'list', value: 'list' }
              ]" />
          </div>
          <!-- 列表模式：标签开关 -->
          <div class="col-auto" v-if="listMode === 'list'">
            <q-btn-toggle dense rounded spread v-model="showLabel" toggle-color="primary" color="white"
              text-color="primary" :options="[
                { icon: 'label', value: true },
                { icon: 'label_off', value: false }
              ]" />
          </div>

          <!-- 详情模式：缩放开关 -->
          <div class="col-auto" v-if="listMode !== 'list'">
            <q-btn-toggle dense rounded spread v-model="detailMode" toggle-color="primary" color="white"
              text-color="primary" :options="[
                { icon: 'zoom_in', value: true },
                { icon: 'zoom_out', value: false }
              ]" />
          </div>
        </div>
      </div>

      <q-list v-if="listMode === 'list'" bordered separator class="shadow-2">
        <WorkListItem v-for="work in works" :key="work.id" :metadata="work" :showLabel="showLabel" />
      </q-list>

      <div v-else-if="listMode === 'detail'" class="row q-col-gutter-x-md q-col-gutter-y-md">
        <div :class="['col', columnClass]" v-for="work in works" :key="work.id">
          <WorkCard :metadata="work" :thumbnailMode="!detailMode" class="fit"/>
        </div>
      </div>
      <!-- 分页控件 -->
      <div class="row justify-center q-my-sm">
        <q-pagination v-model="pagination.currentPage" :max="pagination.totalPages" direction-links color="primary"
          input />
      </div>
    </div>
  </div>
</template>

<script>
import WorkCard from 'components/WorkCard'
import WorkListItem from 'components/WorkListItem'
import NotifyMixin from '../mixins/Notification.js'
import RecentList from 'components/RecentList'
import { mapState } from 'vuex'

export default {
  name: 'Works',

  mixins: [NotifyMixin],

  components: {
    WorkCard,
    WorkListItem,
    RecentList
  },

  data () {
    const storedSort = localStorage.getItem("sortOption");
    let sortOption = null;
    if (storedSort) {
      try {
        sortOption = JSON.parse(storedSort);
      } catch {
        localStorage.removeItem('sortOption');
      }
    }
    else {
      sortOption = {
        label: '加入时间',
        order: 'insert_time',
        sort: 'desc'
      }
    }
    return {
      listMode: 'detail',
      showLabel: true,
      detailMode: true,
      works: [],
      pageTitle: '',
      keyword: '',
      searchRevealed: false, // 手机上是否已下拉出搜索框
      searchFocused: false, // 搜索框是否正在输入
      pullStart: null, // 下拉手势起点
      pullSuppressed: false, // 本次触摸已经用于收起搜索框，不再参与下拉手势
      pagination: {
        currentPage: 1, // 当前页码
        totalPages: 1, // 总页数
        totalCount: 0, // 总数据量
        pageSize: 12 // 每页数量
      },
      seed: 7, // random sort
      sortOption: sortOption,
      options: [
        {
          label: '加入时间',
          order: 'insert_time',
          sort: 'desc'
        },
        {
          label: '发布时间',
          order: 'release',
          sort: 'desc'
        },
        {
          label: 'RJ号排序',
          order: 'id',
          sort: 'desc'
        },
        {
          label: 'R18排序',
          order: 'nsfw',
          sort: 'desc'
        },
        {
          label: '评价排序',
          order: 'rate_average_2dp',
          sort: 'desc'
        },
        {
          label: '销量排序',
          order: 'dl_count',
          sort: 'desc'
        },
      ]
    }
  },

  created () {
    this.refreshPageTitle();
    this.seed = Math.floor(Math.random() * 100);
    this.keyword = this.$route.query.keyword || '';
  },

  mounted() {
    this.pagination.currentPage = 1;
    this.focusSearchIfRequested()
    if (localStorage.getItem("showLabel") != null) {
      this.showLabel = (localStorage.showLabel === 'true');
    }
    if (localStorage.getItem("listMode") != null) {
      this.listMode = localStorage.listMode;
    }
    if (localStorage.getItem("detailMode") != null) {
      this.detailMode = (localStorage.detailMode === 'true');
    }
    window.addEventListener('keydown', this.handlePageKeyEvent);
    window.addEventListener('touchstart', this.handleSearchPullStart, { passive: true });
    window.addEventListener('touchmove', this.handleSearchPullMove, { passive: true });
    window.addEventListener('touchend', this.handleSearchPullEnd, { passive: true });
    // 点搜索条以外的任何地方都收起（capture：别的地方 stopPropagation 也拦不住）
    document.addEventListener('touchstart', this.handleOutsideSearchTap, { passive: true, capture: true });
    document.addEventListener('mousedown', this.handleOutsideSearchTap, true);
  },

  // keep-alive 复活时也要处理一次：从别的页面按 / 跳过来走的是这条路径
  activated () {
    this.focusSearchIfRequested()
  },

  beforeUnmount() {
    window.removeEventListener('keydown', this.handlePageKeyEvent);
    window.removeEventListener('touchstart', this.handleSearchPullStart);
    window.removeEventListener('touchmove', this.handleSearchPullMove);
    window.removeEventListener('touchend', this.handleSearchPullEnd);
    document.removeEventListener('touchstart', this.handleOutsideSearchTap, true);
    document.removeEventListener('mousedown', this.handleOutsideSearchTap, true);
  },

  computed: {
    ...mapState('WorkPanel', {
      workId: 'workId',
      panelWidth: 'panelWidth'
    }),

    url () {
      const query = this.$route.query
      let result = ""
      if (query.circleId) {
        result = `/api/circles/${this.$route.query.circleId}/works`
      } else if (query.tagId) {
        result = `/api/tags/${this.$route.query.tagId}/works`
      } else if (query.vaId) {
        result = `/api/vas/${this.$route.query.vaId}/works`
      } else if (query.keyword) {
        result = `/api/search/${query.keyword}`
      } else {
        result = '/api/works'
      }
      // console.log(`url recomputed ${result}`)
      return result
    },
    direction () {
      return this.sortOption.sort === 'desc'
    },

    // 详情面板打开后会顶开右侧内容，可用的宽度要减掉面板宽度（移动端面板是浮层，不占宽度）
    availableWidth () {
      const panelOpen = this.workId !== null && !this.isMobilePanel
      return this.$q.screen.width - (panelOpen ? this.panelWidth : 0)
    },

    // 按可用宽度套用与 Quasar 断点一致的规则，面板打开后列数会自动减少
    columnClass () {
      const width = this.availableWidth
      const detail = this.detailMode

      if (width < 600) return detail ? 'col-12' : 'col-6'
      if (width < 1024) return detail ? 'col-6' : 'col-4'
      if (width < 1440) return detail ? 'col-4' : 'col-3'
      if (width < 1920) return detail ? 'col-3' : 'col-2'
      return 'col-2'
    },

    isMobilePanel () {
      return this.$q.screen.lt.md
    },

    // 宽屏：搜索框常显，与标题同行
    wideSearchVisible () {
      return this.isNarrowScreen !== true
    },

    // 窄屏：默认收起，下拉（或有关键词）才露出，露出后钉在导航栏下面
    narrowSearchVisible () {
      return this.isNarrowScreen === true && (this.searchRevealed === true || this.keyword !== '')
    },

    isNarrowScreen () {
      return this.$q.screen.lt.sm
    },
  },

  watch: {
    // 页面内搜索：输入框 → 地址栏；地址栏 → 输入框（后退/前进、快捷键跳转）
    keyword (value) {
      this.syncKeywordToRoute(value)
    },

    '$route.query.keyword' (value) {
      const next = value || ''
      if (next !== this.keyword) {
        this.keyword = next
      }
    },

    '$route.query.focusSearch' (value) {
      this.focusSearchIfRequested(value)
    },

    url: {
      immediate: true,
      handler() {
        this.reset();
      }
    },

    'pagination.currentPage'(page) {
      this.handlePageChange(page);
    },

    sortOption (newSortOptionSetting) {
      localStorage.sortOption = JSON.stringify(newSortOptionSetting);
      this.seed = Math.floor(Math.random() * 100);
      this.reset();
    },

    showLabel (newLabelSetting) {
      localStorage.showLabel = newLabelSetting;
    },

    listMode (newListModeSetting) {
      localStorage.listMode = newListModeSetting;
    },

    detailMode(newModeSetting) {
      localStorage.detailMode = newModeSetting;
    },
  },

  methods: {
    // 输入框内容写回地址栏（replace：边输入边跳转时不铺满历史记录）
    syncKeywordToRoute (value) {
      const keyword = (value || '').trim()
      const current = this.$route.query.keyword || ''
      if (keyword === current) return

      // 搜索接口只认 keyword，切到搜索时把 circleId / tagId / vaId 这些过滤条件丢掉
      this.$router.replace({
        path: '/works',
        query: keyword === '' ? {} : { keyword }
      }).catch(() => {})
    },

    // 快捷键（/ 或 Ctrl/Cmd+K）跳过来时聚焦搜索框。
    // 首次挂载 / keep-alive 复活都要处理，所以挂载、激活和路由变化三处都调用它。
    focusSearchIfRequested (value) {
      if ((value === undefined ? this.$route.query.focusSearch : value) !== '1') return
      this.searchRevealed = true
      this.$nextTick(this.focusSearchInput)
    },

    // 聚焦并把临时参数从地址栏清掉
    focusSearchInput () {
      const input = this.$refs.searchInput
      if (input && typeof input.focus === 'function') {
        input.focus()
      }
      if (this.$route.query.focusSearch === undefined) return

      const query = { ...this.$route.query }
      delete query.focusSearch
      this.$router.replace({ path: this.$route.path, query }).catch(() => {})
    },

    // 手机端「在列表顶部下拉」把搜索框拉出来（类似 iOS 的搜索栏）
    handleSearchPullStart (event) {
      this.pullStart = null
      if (this.pullSuppressed === true) return // 这次触摸已经用来收起搜索框了
      if (this.$q.screen.lt.sm !== true) return // 宽屏常显，不需要手势
      if (this.$route.name !== 'works') return // keep-alive 期间在别的页面上下拉时不要改状态
      if (this.narrowSearchVisible === true) return // 已经露出来了
      if (window.scrollY > 0) return // 只在列表顶部响应
      if (this.workId !== null && this.isMobilePanel === true) return // 详情面板盖住页面时不响应
      const touch = event.touches[0]
      if (!touch) return
      this.pullStart = { x: touch.clientX, y: touch.clientY }
    },

    handleSearchPullMove (event) {
      if (!this.pullStart) return
      const touch = event.touches[0]
      if (!touch) return
      const dy = touch.clientY - this.pullStart.y
      const dx = touch.clientX - this.pullStart.x
      if (dy < 30) return
      if (Math.abs(dx) > Math.abs(dy)) return // 横向滑动让给里面的横滑列表
      this.pullStart = null
      this.searchRevealed = true
    },

    handleSearchPullEnd () {
      this.pullStart = null
      this.pullSuppressed = false
    },

    // 点到搜索条以外的地方：只要还没输入内容就把拉出来的搜索框收回去。
    // 下拉露出搜索框时并不聚焦输入框，光靠输入框的 blur 收不回去，所以在这里兜底。
    handleOutsideSearchTap (event) {
      if (this.isNarrowScreen !== true) return
      if (this.narrowSearchVisible !== true) return
      if (this.keyword !== '') return // 空着才收；有关键词时钉住，方便边看结果边改

      const bar = this.$refs.searchBar
      const target = event.target
      if (bar && target && target.nodeType && bar.contains(target)) return

      this.searchRevealed = false
      this.searchFocused = false
      // 同一次触摸紧接着的下拉不再算“拉出搜索”，免得刚收起又弹出来
      if (event.type === 'touchstart') this.pullSuppressed = true
    },

    // 空着不输入又失焦时收回去；有关键词时保持钉住，方便边看结果边改词
    handleSearchBlur () {
      this.searchFocused = false
      if (this.isNarrowScreen !== true) return
      if (this.keyword !== '') return
      this.searchRevealed = false
    },

    // Esc：先落焦点，收起与否交给 handleSearchBlur 判断
    blurSearchInput () {
      const input = this.$refs.searchInput
      if (input && typeof input.blur === 'function') {
        input.blur()
      } else {
        this.handleSearchBlur()
      }
    },

    switchSortMode() {
      this.sortOption = {
        ...this.sortOption,
        sort: this.sortOption.sort === 'desc' ? 'asc' : 'desc'
      }
    },
    requestWorksQueue() {
      const params = {
        order: this.sortOption.order,
        sort: this.sortOption.sort,
        page: this.pagination.currentPage,
        pageSize: this.pagination.pageSize, // 后端分页，每页多少条
        seed: this.seed
      };
      return this.$axios.get(this.url, { params })
        .then((response) => {
          // console.log("API 响应数据:", response.data); // 确保数据正确
          const works = response.data.works;
          this.works = works; // 直接覆盖，不再追加
          this.pagination.totalCount = response.data.pagination.totalCount;
          this.pagination.pageSize = response.data.pagination.pageSize;
          this.pagination.totalPages = Math.ceil(this.pagination.totalCount / this.pagination.pageSize);
          this.pagination.currentPage = response.data.pagination.currentPage;
        })
        .catch((error) => {
          this.handleRequestError(error);
        });
    },

    // **分页变化**
    handlePageChange(page) {
      console.log("当前页码:", page); // 确保页码有更新
      this.pagination.currentPage = page || 1;
      this.requestWorksQueue();
    },
    handleRequestError(error) {
      if (error.response) {
        if (error.response.status !== 401) {
          this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`);
        }
      } else {
        this.showErrNotif(error.message || error);
      }
    },
    refreshPageTitle () {
      if (this.$route.query.circleId || this.$route.query.tagId || this.$route.query.vaId) {
        let url = '', restrict = ''
        if (this.$route.query.circleId) {
          restrict = 'circles'
          url = `/api/${restrict}/${this.$route.query.circleId}`
        } else if (this.$route.query.tagId) {
          restrict = 'tags'
          url = `/api/${restrict}/${this.$route.query.tagId}`
        } else {
          restrict = 'vas'
          url = `/api/${restrict}/${this.$route.query.vaId}`
        }

        this.$axios.get(url)
          .then((response) => {
            const name = response.data.name
            let pageTitle

            switch (restrict) {
              case 'tags':
                pageTitle = 'Works of tag: '
                break
              case 'vas':
                pageTitle = 'Works of vas: '
                break
              case 'circles':
                pageTitle = 'Works of circles: '
                break
            }
            pageTitle += name || ''

            this.pageTitle = pageTitle
          })
          .catch((error) => {
            if (error.response) {
              // 请求已发出，但服务器响应的状态码不在 2xx 范围内
              if (error.response.status !== 401) {
                this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
              }
            } else {
              this.showErrNotif(error.message || error)
            }
          })
      } else if (this.$route.query.keyword) {
        this.pageTitle = `Search by ${this.$route.query.keyword}`
      } else {
        this.pageTitle = 'All works'
      }
    },

    reset () {
      this.refreshPageTitle()
      this.pagination.currentPage = 1
      this.pagination.pageSize = 12
      this.requestWorksQueue()
    },

    handlePageKeyEvent(e) {
      if (e.repeat) return;
      // 移动端详情面板会盖住作品列表，此时左右方向键不应该翻页
      if (this.$q.screen.lt.md && this.$store.state.WorkPanel.workId !== null) return;
      const now = Date.now();
      if (this._lastKeyTime && (now - this._lastKeyTime < 300)) {
        return;
      }
      this._lastKeyTime = now; // 记录本次触发时间
      const activeEl = document.activeElement && document.activeElement.tagName
        ? document.activeElement.tagName.toLowerCase()
        : '';

      if (['input', 'textarea'].includes(activeEl)) return;
      const { currentPage, totalPages } = this.pagination;

      if (e.key === 'ArrowLeft' && currentPage > 1) {
        this.pagination.currentPage--;
      }
      else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        this.pagination.currentPage++;
      }
    },
  }
}
</script>

<style lang="scss" scoped>
// 页面头部：标题与搜索框同一行；窄屏时搜索框换行并铺满整行
.works-header-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  row-gap: 8px;
}

// 宽屏的搜索框外层（与标题同行，宽度固定）
.works-search-wrap {
  width: 320px;
}

// 窄屏的搜索条：天然位置就在导航栏下沿，收起时向上缩到蓝色导航栏背后、
// 并且用负 margin 不占位（页面就像没它一样）；下拉（或有关键词）时从栏下滑出来
.works-search-bar {
  position: sticky;
  top: max(var(--app-header-height, 50px), 50px);
  z-index: 1000;
  pointer-events: none;

  // 通栏：抵消页面左右 16px 边距；上边把页面 q-mt-md 的 16px 一起抵消，
  // 让它天然就贴在导航栏下沿；下边负值让收起时不占位（页面看起来像没它）
  height: 56px;
  margin: -16px -16px -40px;
  padding: 8px 16px;
  background: #eee;
  transform: translateY(-100%);
  transition: transform 0.22s ease, margin-bottom 0.22s ease;
}

.works-search-bar--shown {
  pointer-events: auto;
  margin-bottom: 8px;
  transform: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.works-search {
  width: 100%;
}

</style>
