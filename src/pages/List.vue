<template>
  <q-page class="q-px-md q-pt-md q-pb-md">
    <div class="row no-wrap items-center justify-between q-mb-sm">
      <div class="list-title col text-h5 text-weight-regular">
        分类浏览
      </div>
      <div v-if="!isNarrowScreen" class="list-search-wrap col-auto q-ml-md">
        <SearchInput
          v-model="keyword"
          debounce="500"
          :placeholder="searchPlaceholder"
          class="full-width"
        />
      </div>
    </div>

    <q-tabs
      align="left"
      no-caps
      inline-label
      active-color="primary"
      indicator-color="primary"
      class="q-mb-sm"
      aria-label="分类类型"
    >
      <q-route-tab
        v-for="tab in labelTabs"
        :key="tab.type"
        :name="tab.type"
        :label="tab.label"
        :icon="tab.icon"
        :to="tab.path"
        exact
      />
    </q-tabs>

    <div v-if="isNarrowScreen" class="q-mb-sm">
      <SearchInput
        v-model="keyword"
        debounce="500"
        :placeholder="searchPlaceholder"
        class="full-width"
      />
    </div>

    <q-table class="list-table" :rows="items" :columns="columns" row-key="id" flat bordered dense wrap-cells
      :loading="loading" :pagination="pagination" :rows-per-page-options="[]"
      :visible-columns="visibleColumns" :no-data-label="keyword ? '没有匹配的结果' : '暂时没有数据'"
      table-header-class="app-text"
      @request="onTableRequest"
      @row-click="openWorks">
      <template v-slot:no-data="{ message }">
        <template v-if="!requestPending">
          <q-icon class="q-table__bottom-nodata-icon" name="warning" />
          {{ message }}
        </template>
      </template>

      <!-- 分页放到底部正中（左右方向键也可翻页，见 handlePageKeyEvent） -->
      <template v-slot:bottom>
        <div class="row items-center justify-center full-width">
          <q-pagination :model-value="pagination.page" :max="pagesNumber" direction-links color="primary" input
            @update:model-value="changePage" />
        </div>
      </template>

      <template v-slot:body-cell-index="props">
        <q-td :props="props" class="app-text-secondary">
          {{ (pagination.page - 1) * pageSize + props.rowIndex + 1 }}
        </q-td>
      </template>

      <!-- 排序箭头放在文字后面 -->
      <template v-slot:header-cell-count="props">
        <q-th
          :props="props"
          class="sortable"
          role="button"
          tabindex="0"
          aria-label="按作品数排序"
          @click="props.sort('count')"
          @keydown.enter.prevent="props.sort('count')"
          @keydown.space.prevent="props.sort('count')"
        >
          <span>作品数</span>
          <q-icon name="arrow_upward" size="xs" class="q-table__sort-icon q-table__sort-icon--left" />
        </q-th>
      </template>

      <template v-slot:body-cell-favourite="props">
        <q-td :props="props" class="text-center">
          <q-btn
            flat
            round
            dense
            :icon="props.row.favourite ? 'star' : 'star_border'"
            :color="props.row.favourite ? 'amber' : 'app-text-secondary'"
            :aria-label="props.row.favourite ? '取消收藏' : '收藏'"
            @click.stop.prevent="toggleFavourite(props.row)"
          />
        </q-td>
      </template>

      <template v-slot:body-cell-name="props">
        <q-td :props="props">
          <router-link class="text-primary" :to="worksLink(props.row)" :title="props.row.name" @click.stop>
            {{ props.row.name }}
          </router-link>
        </q-td>
      </template>

      <!-- 名称已经是链接，这里只列最近发售的 RJ 号（点开即作品详情面板） -->
      <template v-slot:body-cell-recent="props">
        <q-td :props="props">
          <div class="row q-gutter-xs">
            <router-link v-for="id in props.row.recentWorks" :key="id" :to="`/work/${id}`"
              :title="`打开 ${rjLabel(id)}`" @click.stop>
              <q-badge rounded outline color="primary">{{ rjLabel(id) }}</q-badge>
            </router-link>
          </div>
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script>
import NotifyMixin from '../mixins/Notification.js'
import { formatRJLabel } from '../utils/rjCode'
import { workConditionLink } from '../utils/workQuery'
import SearchInput from 'components/SearchInput'

const labelTabs = [
  { type: 'circle', label: '社团', icon: 'group', path: '/circles' },
  { type: 'tag', label: '标签', icon: 'label', path: '/tags' },
  { type: 'va', label: '声优', icon: 'mic', path: '/vas' }
]

export default {
  name: 'List',

  mixins: [NotifyMixin],

  components: {
    SearchInput
  },

  props: {
    conditionType: {
      type: String
    }
  },

  data () {
    return {
      items: [],
      keyword: '',
      loading: false,
      requestPending: false,
      loadingTimer: null,
      listRequestId: 0,
      requestScheduled: false,
      labelTabs,
      // 默认按收藏列降序，收藏项置顶；点表头可切换其它排序
      pagination: {
        sortBy: 'favourite',
        descending: true,
        page: 1,
        rowsPerPage: 0,
        rowsNumber: 0
      },
      pageSize: 50,
      columns: [
        { name: 'index', label: '#', align: 'right', headerStyle: 'width: 56px' },
        { name: 'favourite', label: '收藏', field: 'favourite', align: 'center', sortable: true, headerStyle: 'width: 96px' },
        { name: 'name', label: '名称', field: 'name', align: 'left', sortable: true, headerStyle: 'width: 22%' },
        { name: 'recent', label: '近期发售', align: 'left' },
        { name: 'count', label: '作品数', field: 'count', align: 'right', sortable: true, headerStyle: 'width: 112px', classes: 'text-weight-medium' }
      ]
    }
  },

  created () {
    this.requestList()
  },

  mounted () {
    // 与主界面（Works 页）一致：左右方向键翻页
    window.addEventListener('keydown', this.handlePageKeyEvent)
  },

  beforeUnmount () {
    clearTimeout(this.loadingTimer)
    window.removeEventListener('keydown', this.handlePageKeyEvent)
  },

  computed: {
    searchPlaceholder () {
      const placeholders = {
        circle: '搜索社团名称…',
        tag: '搜索标签名称…',
        va: '搜索声优名称…'
      }
      return placeholders[this.conditionType] || '搜索名称…'
    },

    apiField () {
      return `${this.conditionType}s`
    },

    url () {
      return `/api/${this.apiField}/`
    },

    pagesNumber () {
      return Math.max(1, Math.ceil(this.pagination.rowsNumber / this.pageSize))
    },

    // 窄屏上 RJ 标签会折成很多行把行高撑开，直接不显示这一列
    visibleColumns () {
      return this.$q.screen.lt.sm ? ['index', 'favourite', 'name', 'count'] : void 0
    },

    isNarrowScreen () {
      return this.$q.screen.lt.sm
    }
  },

  watch: {
    keyword () {
      this.pagination.page = 1
      this.scheduleRequestList()
    },

    conditionType (value, previous) {
      if (value === previous) return
      this.pagination.page = 1
      this.keyword = ''
      this.scheduleRequestList()
    }
  },

  methods: {
    // 复制 Works.vue 的翻页按键逻辑：节流 300ms、输入框内不响应、移动端面板打开时不翻页
    handlePageKeyEvent (e) {
      if (e.repeat) return
      if (this.$q.screen.lt.md && this.$store.state.WorkPanel.workId !== null) return
      const now = Date.now()
      if (this._lastKeyTime && (now - this._lastKeyTime < 300)) {
        return
      }
      this._lastKeyTime = now
      const activeEl = document.activeElement && document.activeElement.tagName
        ? document.activeElement.tagName.toLowerCase()
        : ''

      if (['input', 'textarea'].includes(activeEl)) return

      if (e.key === 'ArrowLeft' && this.pagination.page > 1) {
        this.changePage(this.pagination.page - 1)
      } else if (e.key === 'ArrowRight' && this.pagination.page < this.pagesNumber) {
        this.changePage(this.pagination.page + 1)
      }
    },

    // 作品 id 的 RJ 展示文本统一由中立的格式化工具生成
    rjLabel (id) {
      return formatRJLabel(id)
    },

    // 表格行与名称链接共用，保留可中键新开标签页的链接
    worksLink (item) {
      return workConditionLink(this.$route, this.conditionType, item.id)
    },

    openWorks (evt, row) {
      this.$router.push(this.worksLink(row))
    },

    requestList () {
      const requestId = ++this.listRequestId
      this.requestPending = true
      clearTimeout(this.loadingTimer)
      // 快速请求不展示进度，避免 loading 只闪一下；较慢请求仍能及时反馈。
      this.loadingTimer = setTimeout(() => {
        if (requestId === this.listRequestId) {
          this.loading = true
        }
      }, 200)
      const params = {
        page: this.pagination.page,
        keyword: this.keyword,
        sortBy: this.pagination.sortBy || 'favourite',
        sort: this.pagination.descending ? 'desc' : 'asc'
      }
      this.$axios.get(this.url, { params })
        .then((response) => {
          if (requestId !== this.listRequestId) return
          clearTimeout(this.loadingTimer)
          this.requestPending = false
          const { items, pagination } = response.data
          this.items = Array.isArray(items) ? items : []
          this.pagination.page = pagination.currentPage
          this.pageSize = pagination.pageSize
          this.pagination.rowsNumber = pagination.totalCount
          this.loading = false
        })
        .catch((error) => {
          if (requestId !== this.listRequestId) return
          clearTimeout(this.loadingTimer)
          this.requestPending = false
          this.loading = false
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status !== 401) {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    scheduleRequestList () {
      if (this.requestScheduled) return
      this.requestScheduled = true
      this.$nextTick(() => {
        this.requestScheduled = false
        this.requestList()
      })
    },

    onTableRequest ({ pagination }) {
      this.pagination = {
        ...this.pagination,
        ...pagination,
        rowsPerPage: 0
      }
      this.requestList()
    },

    changePage (page) {
      if (!page || page === this.pagination.page) return
      this.pagination.page = page
      this.requestList()
    },

    toggleFavourite (item) {
      // 乐观更新：先改本地状态，请求失败时回滚
      const previous = item.favourite ? 1 : 0
      const favourite = previous ? 0 : 1
      item.favourite = favourite

      this.$axios.put(`/api/${this.apiField}/${item.id}/favourite`, { favourite: !!favourite })
        .then(() => {
          this.showSuccNotif(favourite ? `${item.name} 已收藏` : `${item.name} 已取消收藏`)
        })
        .catch((error) => {
          item.favourite = previous
          if (error.response) {
            if (error.response.status !== 401) {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },
  }
}
</script>

<style lang="scss" scoped>

/* Quasar 表格默认 th 12px / td 13px、行高 48px，这里整体放大并压低行高 */
.list-table :deep(.q-table) {
  table-layout: fixed;
}

/* 窄屏上让列宽跟着内容走，避免固定列宽把内容挤成一条缝。 */
@media (max-width: $breakpoint-xs-max) {
  .list-table :deep(.q-table) {
    table-layout: auto;
  }
}

.list-table :deep(.q-table thead th) {
  font-size: 14px;
  font-weight: 600;
}

.list-table :deep(.q-table thead tr),
.list-table :deep(.q-table tbody td) {
  height: 40px;
}

.list-table :deep(.q-table tbody td) {
  font-size: 15px;
}

.list-title {
  overflow-wrap: anywhere;
}

.list-search-wrap {
  width: 260px;
  min-width: 180px;
}

</style>
