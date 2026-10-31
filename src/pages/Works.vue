<template>
  <q-page class="q-px-md q-pt-md">
    <!-- 窄屏：搜索条平时缩在蓝色导航栏后面（不占位），在列表顶部下拉才滑出来 -->
    <div
      v-if="isNarrowScreen"
      ref="searchBar"
      class="works-search-bar bg-grey-3 q-px-md q-py-sm"
      :class="{ 'works-search-bar--shown': narrowSearchVisible }"
    >
      <SearchInput
        ref="searchInput"
        v-model="keyword"
        debounce="500"
        placeholder="搜索作品 / 社团 / 声优…"
        class="full-width"
        @blur="handleSearchBlur"
        @keydown.esc="blurSearchInput"
        @keyup.enter="syncKeywordToRoute($event.target.value)"
      />
    </div>

    <RecentList />

    <div class="row no-wrap items-center justify-between q-my-sm">
      <div class="works-title col text-h5 text-weight-regular">
        {{ pageTitle }}
        <span v-show="pagination.totalCount">
          ({{ pagination.totalCount }})
        </span>
      </div>

      <!-- 宽屏：搜索框与标题同行靠右 -->
      <div v-if="wideSearchVisible" class="works-search-wrap col-auto q-ml-md">
        <SearchInput
          v-model="keyword"
          debounce="500"
          placeholder="搜索作品 / 社团 / 声优…"
          class="full-width"
          @keyup.enter="syncKeywordToRoute($event.target.value)"
        />
      </div>
    </div>

    <div v-if="conditionChips.length" class="work-condition-bar row wrap items-center q-gutter-xs q-mb-sm">
      <q-chip
        v-for="condition in conditionChips"
        :key="condition.key"
        removable
        dense
        square
        color="primary"
        text-color="white"
        :icon="condition.icon"
        @remove="removeCondition(condition)"
      >
        {{ condition.label }}
      </q-chip>
      <div class="row items-center justify-end q-ml-auto">
        <q-btn
          flat
          dense
          no-caps
          color="primary"
          icon="filter_alt_off"
          label="清除条件"
          @click="clearConditions"
        />
      </div>
    </div>

    <div class="q-my-sm">
      <div v-if="works.length || hasActiveFilters" class="work-toolbar row items-center q-mb-sm">
        <!-- 排序字段与方向切换 -->
        <SortControl
          v-model="sortOption"
          :options="options"
          :direction="direction"
          class="col"
          @toggle-direction="switchSortMode"
        />

        <template v-if="!isNarrowScreen">
          <!-- 作品筛选 -->
          <div class="app-control-group bg-white">
            <q-btn-group dense unelevated aria-label="作品筛选">
              <q-btn
                dense
                icon="no_adult_content"
                aria-label="全年龄"
                :aria-pressed="filters.allAges"
                :color="filters.allAges ? 'primary' : 'white'"
                :text-color="filters.allAges ? 'white' : 'grey-9'"
                @click="filters.allAges = !filters.allAges"
              >
              </q-btn>
              <q-btn
                dense
                icon="subtitles"
                aria-label="中文字幕"
                :aria-pressed="filters.subtitle"
                :color="filters.subtitle ? 'primary' : 'white'"
                :text-color="filters.subtitle ? 'white' : 'grey-9'"
                @click="filters.subtitle = !filters.subtitle"
              >
              </q-btn>
            </q-btn-group>
          </div>

          <!-- 切换显示模式 -->
          <div class="work-toolbar__display col-auto row items-center justify-end">
            <div class="app-control-group bg-white">
              <q-btn-toggle dense unelevated spread class="col-auto"
                v-model="listMode" toggle-color="primary" color="white"
                text-color="grey-9" :options="[
                  { icon: 'apps', value: 'detail', attrs: { 'aria-label': '详细模式' } },
                  { icon: 'list', value: 'list', attrs: { 'aria-label': '列表模式' } }
                ]" />
            </div>
            <!-- 列表模式：标签开关 -->
            <div v-if="listMode === 'list'" class="app-control-group bg-white">
              <q-btn-toggle dense unelevated spread class="col-auto"
                v-model="showLabel" toggle-color="primary" color="white"
                text-color="grey-9" :options="[
                  { icon: 'label', value: true, attrs: { 'aria-label': '显示标签' } },
                  { icon: 'label_off', value: false, attrs: { 'aria-label': '隐藏标签' } }
                ]" />
            </div>

            <!-- 详情模式：缩放开关 -->
            <div v-if="listMode !== 'list'" class="app-control-group bg-white">
              <q-btn-toggle dense unelevated spread class="col-auto"
                v-model="detailMode" toggle-color="primary" color="white"
                text-color="grey-9" :options="[
                  { icon: 'zoom_in', value: true, attrs: { 'aria-label': '放大封面' } },
                  { icon: 'zoom_out', value: false, attrs: { 'aria-label': '缩小封面' } }
                ]" />
            </div>
          </div>
        </template>

        <q-btn
          v-else
          dense
          unelevated
          no-caps
          color="white"
          text-color="grey-9"
          class="app-control-button q-ml-auto"
          aria-controls="work-settings-panel"
          :aria-expanded="settingsOpen"
          :aria-label="settingsOpen ? '收起筛选与显示' : '展开筛选与显示'"
          @click="settingsOpen = !settingsOpen"
        >
          <q-icon :name="settingsOpen ? 'expand_less' : 'tune'" />
          <span class="q-ml-xs">筛选与显示</span>
          <q-badge v-if="activeFilterCount" color="primary" class="q-ml-xs">
            {{ activeFilterCount }}
          </q-badge>
        </q-btn>

      </div>

      <q-slide-transition>
        <q-card
          v-if="isNarrowScreen && settingsOpen"
          id="work-settings-panel"
          flat
          bordered
          class="work-settings-panel q-mb-sm"
        >
          <q-list dense separator>
            <q-item>
              <q-item-section>
                <q-item-label>作品筛选</q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="row items-center q-gutter-x-xs">
                  <q-checkbox
                    v-model="filters.allAges"
                    dense
                    color="primary"
                    label="全年龄"
                  />
                  <q-checkbox
                    v-model="filters.subtitle"
                    dense
                    color="primary"
                    label="中文字幕"
                  />
                </div>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label>显示方式</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn-toggle
                  v-model="listMode"
                  dense
                  unelevated
                  toggle-color="primary"
                  color="grey-2"
                  text-color="grey-9"
                  :options="[
                    { label: '详细', value: 'detail' },
                    { label: '列表', value: 'list' }
                  ]"
                />
              </q-item-section>
            </q-item>
            <q-item v-if="listMode !== 'list'">
              <q-item-section>
                <q-item-label>封面大小</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn-toggle
                  v-model="detailMode"
                  dense
                  unelevated
                  toggle-color="primary"
                  color="grey-2"
                  text-color="grey-9"
                  :options="[
                    { label: '放大', value: true },
                    { label: '缩小', value: false }
                  ]"
                />
              </q-item-section>
            </q-item>
            <q-item v-if="listMode === 'list'">
              <q-item-section>
                <q-item-label>显示作品标签</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn-toggle
                  v-model="showLabel"
                  dense
                  unelevated
                  toggle-color="primary"
                  color="grey-2"
                  text-color="grey-9"
                  :options="[
                    { label: '显示', value: true },
                    { label: '隐藏', value: false }
                  ]"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </q-slide-transition>

      <q-list v-if="listMode === 'list'" bordered separator>
        <WorkListItem v-for="work in works" :key="work.id" :metadata="work" :showLabel="showLabel" />
      </q-list>

      <div v-else-if="listMode === 'detail'" class="row q-col-gutter-x-sm q-col-gutter-y-sm">
        <div :class="['col', columnClass]" v-for="work in works" :key="work.id">
          <WorkCard :metadata="work" :thumbnailMode="!detailMode" class="fit"/>
        </div>
      </div>

      <div
        v-if="!works.length && hasActiveFilters"
        class="works-empty text-center text-grey q-my-lg"
      >
        没有符合当前筛选条件的作品
        <div class="q-mt-sm">
          <q-btn flat dense no-caps color="primary" label="清除筛选" @click="clearFilters" />
        </div>
      </div>
      <!-- 分页控件 -->
      <div class="row justify-center q-my-sm">
        <q-pagination v-model="pagination.currentPage" :max="pagination.totalPages" direction-links color="primary"
          input />
      </div>
    </div>
  </q-page>
</template>

<script>
import WorkCard from 'components/WorkCard'
import WorkListItem from 'components/WorkListItem'
import NotifyMixin from '../mixins/Notification.js'
import RecentList from 'components/RecentList'
import SearchInput from 'components/SearchInput'
import SortControl from 'components/SortControl'
import { mapState } from 'vuex'
import {
  clearWorkConditions,
  getWorkConditionParams,
  hasWorkConditions,
  readWorkConditions,
  removeWorkCondition,
  setWorkKeywordResult
} from '../utils/workQuery'

const SORT_OPTIONS = [
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
    label: '评价排序',
    order: 'rate_average_2dp',
    sort: 'desc'
  },
  {
    label: '销量排序',
    order: 'dl_count',
    sort: 'desc'
  }
]

const DEFAULT_SORT_OPTION = SORT_OPTIONS[0]
const DEFAULT_FILTERS = { allAges: false, subtitle: false }

const readStoredSortOption = () => {
  const stored = localStorage.getItem('sortOption')
  if (!stored) return { ...DEFAULT_SORT_OPTION }

  try {
    const parsed = JSON.parse(stored)
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_SORT_OPTION }

    // 忽略不在当前排序白名单中的本地状态。
    const option = SORT_OPTIONS.find(item => item.order === parsed.order)
    if (!option) return { ...DEFAULT_SORT_OPTION }

    return {
      ...option,
      sort: parsed.sort === 'asc' ? 'asc' : 'desc'
    }
  } catch {
    localStorage.removeItem('sortOption')
    return { ...DEFAULT_SORT_OPTION }
  }
}

const readStoredFilters = () => {
  const stored = localStorage.getItem('workFilters')
  if (!stored) return { ...DEFAULT_FILTERS }

  try {
    const parsed = JSON.parse(stored)
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_FILTERS }

    return {
      allAges: parsed.allAges === true,
      subtitle: parsed.subtitle === true
    }
  } catch {
    localStorage.removeItem('workFilters')
    return { ...DEFAULT_FILTERS }
  }
}

export default {
  name: 'Works',

  mixins: [NotifyMixin],

  components: {
    WorkCard,
    WorkListItem,
    RecentList,
    SearchInput,
    SortControl
  },

  data () {
    return {
      listMode: 'detail',
      showLabel: true,
      detailMode: true,
      settingsOpen: false,
      works: [],
      pageTitle: '',
      keyword: '',
      searchRevealed: false, // 手机上是否已下拉出搜索框
      pullStart: null, // 下拉手势起点
      pullSuppressed: false, // 本次触摸已经用于收起搜索框，不再参与下拉手势
      pagination: {
        currentPage: 1, // 当前页码
        totalPages: 1, // 总页数
        totalCount: 0, // 总数据量
        pageSize: 12 // 每页数量
      },
      seed: 7, // random sort
      sortOption: readStoredSortOption(),
      options: SORT_OPTIONS,
      filters: readStoredFilters(),
      conditionLabels: {
        circle: {},
        tag: {},
        va: {}
      },
      requestId: 0,
      conditionLabelRequestId: 0
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

    workConditions () {
      return readWorkConditions(this.$route.query)
    },

    conditionRequestKey () {
      return JSON.stringify(getWorkConditionParams(this.workConditions))
    },

    conditionChips () {
      const conditions = this.workConditions
      const typeConfig = [
        { type: 'circle', ids: conditions.circleIds, icon: 'group' },
        { type: 'tag', ids: conditions.tagIds, icon: 'label' },
        { type: 'va', ids: conditions.vaIds, icon: 'record_voice_over' }
      ]
      const chips = []

      typeConfig.forEach(({ type, ids, icon }) => {
        ids.forEach(id => {
          chips.push({
            type,
            id,
            key: `${type}:${id}`,
            icon,
            label: this.conditionLabels[type][id] || `#${id}`
          })
        })
      })

      if (conditions.keyword) {
        chips.push({
          type: 'keyword',
          id: conditions.keyword,
          key: 'keyword',
          icon: 'search',
          label: conditions.keyword
        })
      }

      return chips
    },
    direction () {
      return this.sortOption.sort === 'desc'
    },

    hasActiveFilters () {
      return hasWorkConditions(this.workConditions) ||
        this.filters.allAges === true ||
        this.filters.subtitle === true
    },

    activeFilterCount () {
      return Number(this.filters.allAges === true) +
        Number(this.filters.subtitle === true)
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

    isNarrowScreen (narrow) {
      if (narrow !== true) this.settingsOpen = false
    },

    conditionRequestKey: {
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

    filters: {
      deep: true,
      handler (newFilters) {
        localStorage.workFilters = JSON.stringify(newFilters);
        this.reset();
      }
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

    // 详情面板里的评分、收听状态和短评改动后，关闭面板时刷新当前页，
    // 让卡片上的“我的记录”摘要与刚保存的内容保持一致。
    workId (newWorkId, oldWorkId) {
      if (oldWorkId !== null && newWorkId === null && this.$route.name === 'works') {
        this.requestWorksQueue()
      }
    },
  },

  methods: {
    // 输入框内容写回地址栏（replace：边输入边跳转时不铺满历史记录）
    syncKeywordToRoute (value) {
      const keyword = (value || '').trim()
      const current = this.$route.query.keyword || ''
      if (keyword === current) return

      const result = setWorkKeywordResult(this.$route.query, keyword)
      if (!result.allowed) {
        this.keyword = current
        this.showWarnNotif(result.message)
        return
      }

      this.$router.replace({
        path: '/works',
        query: result.query
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
      // 同一次触摸紧接着的下拉不再算“拉出搜索”，免得刚收起又弹出来
      if (event.type === 'touchstart') this.pullSuppressed = true
    },

    // 空着不输入又失焦时收回去；有关键词时保持钉住，方便边看结果边改词
    handleSearchBlur () {
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

    clearFilters () {
            this.filters = { ...DEFAULT_FILTERS }
      this.$router.push({
        path: '/works',
        query: clearWorkConditions(this.$route.query)
            }).catch(() => {})
    },

    removeCondition (condition) {
      this.$router.push({
        path: '/works',
        query: removeWorkCondition(this.$route.query, condition.type, condition.id)
      }).catch(() => {})
    },

    clearConditions () {
            this.$router.push({
        path: '/works',
        query: clearWorkConditions(this.$route.query)
            }).catch(() => {})
    },

    requestWorksQueue() {
      const currentRequestId = ++this.requestId
      const params = {
        order: this.sortOption.order,
        sort: this.sortOption.sort,
        page: this.pagination.currentPage,
        pageSize: this.pagination.pageSize, // 后端分页，每页多少条
        seed: this.seed
      };

      if (this.filters.allAges === true) params.nsfw = false
      if (this.filters.subtitle === true) params.subtitle = true

      Object.assign(params, getWorkConditionParams(this.workConditions))

      return this.$axios.get('/api/works', { params })
        .then((response) => {
          if (currentRequestId !== this.requestId) return

          const pagination = response.data.pagination
          const totalCount = Number(pagination.totalCount) || 0
          this.works = response.data.works; // 直接覆盖，不再追加
          this.pagination.totalCount = totalCount;
          this.pagination.pageSize = pagination.pageSize;
          this.pagination.totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
          this.pagination.currentPage = pagination.currentPage;
        })
        .catch((error) => {
          if (currentRequestId !== this.requestId) return
          this.handleRequestError(error);
        });
    },

    handlePageChange(page) {
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
      this.pageTitle = hasWorkConditions(this.workConditions) ? '筛选作品' : '全部作品'
    },

    refreshConditionLabels () {
      const conditions = this.workConditions
      const currentRequestId = ++this.conditionLabelRequestId
      const hasEntityConditions = conditions.circleIds.length ||
        conditions.tagIds.length ||
        conditions.vaIds.length

      if (!hasEntityConditions) {
        this.conditionLabels = { circle: {}, tag: {}, va: {} }
        return
      }

      this.$axios.get('/api/work-filter-labels', {
        params: getWorkConditionParams(conditions)
      })
        .then(response => {
          if (currentRequestId !== this.conditionLabelRequestId) return

          const toLabelMap = items => items.reduce((result, item) => {
            result[String(item.id)] = item.name
            return result
          }, {})

          this.conditionLabels = {
            circle: toLabelMap(response.data.circles || []),
            tag: toLabelMap(response.data.tags || []),
            va: toLabelMap(response.data.vas || [])
          }
        })
        .catch(error => {
          if (currentRequestId !== this.conditionLabelRequestId) return
          this.handleRequestError(error)
        })
    },

    reset () {
      this.refreshPageTitle()
      this.refreshConditionLabels()
      this.pagination.pageSize = 12
      if (this.pagination.currentPage !== 1) {
        this.pagination.currentPage = 1
        return
      }
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
// 标题：允许被压窄（auto 的最小宽度会把搜索框顶下去）；真遇到断不开的长词，
// 宁可词内断行，也别让整行往右溢出
.works-title {
  overflow-wrap: anywhere;
}

.works-search-wrap {
  width: 260px;
  min-width: 180px;
}

.work-toolbar {
  gap: 4px;
}

// 排序控件保留紧凑的最小宽度，避免极窄屏把字段文字挤到溢出。
.work-toolbar :deep(.sort-control) {
  min-width: 120px;
}

// 显示控件组放不下时自然换到下一行，并继续靠右；不再固定在 sm 断点换行。
.work-toolbar__display {
  margin-left: auto;
  gap: 4px;
}

.work-settings-panel {
  border-radius: $cover-card-border-radius;
  overflow: hidden;
}

.work-condition-bar :deep(.q-chip) {
  max-width: 100%;
}

.work-condition-bar :deep(.q-chip__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 窄屏的搜索条：天然位置就在导航栏下沿，收起时向上缩到蓝色导航栏背后、
// 并且用负 margin 不占位（页面就像没它一样）；下拉（或有关键词）时从栏下滑出来
.works-search-bar {
  position: sticky;
  top: max(var(--app-header-height, 50px), 50px);
  z-index: 1000;
  pointer-events: none;

  // 通栏：抵消页面左右 16px 边距；上边把页面 q-pt-md 的 16px 一起抵消，
  // 让它天然就贴在导航栏下沿；下边负值让收起时不占位（页面看起来像没它）
  height: $toolbar-control-height + 16px;
  margin: -16px -16px calc(-1 * #{$toolbar-control-height});
  transform: translateY(-100%);
  transition: transform 0.22s ease, margin-bottom 0.22s ease;
}

.works-search-bar--shown {
  pointer-events: auto;
  margin-bottom: 8px;
  transform: none;
  border-bottom: 1px solid $separator-color;
}

</style>
