<template>
  <q-page class="q-px-md q-pt-md q-pb-md">
    <div class="text-h5 text-weight-regular q-mb-sm">
      All {{ restrict }}
    </div>

    <q-table class="list-table" :rows="filteredItems" :columns="columns" row-key="id" flat bordered wrap-cells
      :loading="loading" v-model:pagination="pagination" :rows-per-page-options="[25, 50, 100, 0]"
      :visible-columns="visibleColumns" :no-data-label="keyword ? '没有匹配的结果' : '暂时没有数据'"
      @row-click="openWorks">
      <!-- 搜索、计数、分页都放在表格顶部，避免和右下角的“回到顶部”按钮重叠 -->
      <template v-slot:top>
        <div class="row items-center full-width">
          <div class="col-12 col-sm-auto">
            <q-input dense rounded outlined v-model="keyword" class="list-search"
              :placeholder="`Search for a ${restrict}...`">
              <template v-slot:append>
                <q-icon v-if="keyword === ''" name="search" />
                <q-icon v-else name="clear" class="cursor-pointer" @click="keyword = ''" />
              </template>
            </q-input>
          </div>
          <div class="col-auto q-ml-md text-grey-8">{{ rangeLabel }}</div>
          <q-space />
          <div class="col-auto">
            <q-select dense borderless options-dense emit-value map-options
              :options="rowsPerPageOptions" v-model="pagination.rowsPerPage" @update:model-value="pagination.page = 1" />
          </div>
        </div>
      </template>

      <!-- 分页放到底部正中（左右方向键也可翻页，见 handlePageKeyEvent） -->
      <template v-slot:bottom>
        <div class="row items-center justify-center full-width">
          <q-pagination v-model="pagination.page" :max="pagesNumber" boundary-numbers
            :max-pages="$q.screen.lt.sm ? 3 : 7" color="primary" />
        </div>
      </template>

      <template v-slot:body-cell-index="props">
        <q-td :props="props" class="text-grey-6">{{ props.rowIndex + 1 }}</q-td>
      </template>

      <!-- Quasar 对右对齐的列会把排序箭头放在文字前面，这里统一放到文字后面 -->
      <template v-slot:header-cell-count="props">
        <q-th :props="props" class="sortable" @click="props.sort('count')">
          <span>作品数</span>
          <q-icon name="arrow_upward" size="xs" class="q-table__sort-icon q-table__sort-icon--left" />
        </q-th>
      </template>

      <template v-slot:body-cell-favourite="props">
        <q-td :props="props" class="text-center">
          <q-icon :name="props.row.favourite ? 'star' : 'star_border'"
            :color="props.row.favourite ? 'amber' : 'grey-6'" size="sm" class="cursor-pointer"
            @click.stop.prevent="toggleFavourite(props.row)" />
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
          <div class="rj-chips">
            <router-link v-for="id in props.row.recentWorks" :key="id" class="rj-chip" :to="`/work/${id}`"
              :title="`打开 ${rjLabel(id)}`" @click.stop>
              {{ rjLabel(id) }}
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

export default {
  name: 'List',

  mixins: [NotifyMixin],

  props: {
    restrict: {
      type: String
    }
  },

  data () {
    return {
      items: [],
      keyword: '',
      loading: false,
      // 默认按收藏列降序，收藏项置顶；点表头可切换其它排序
      pagination: {
        sortBy: 'favourite',
        descending: true,
        page: 1,
        rowsPerPage: 50
      },
      rowsPerPageOptions: [
        { label: '25 条/页', value: 25 },
        { label: '50 条/页', value: 50 },
        { label: '100 条/页', value: 100 },
        { label: '全部', value: 0 }
      ],
      columns: [
        { name: 'index', label: '#', align: 'right', headerStyle: 'width: 56px' },
        { name: 'favourite', label: '收藏', field: 'favourite', align: 'center', sortable: true, headerStyle: 'width: 96px' },
        { name: 'name', label: '名称', field: 'name', align: 'left', sortable: true, headerStyle: 'width: 22%' },
        { name: 'recent', label: '近期发售', align: 'left' },
        // 排序箭头自己画（见 header-cell-count），所以这里不开 sortable
        { name: 'count', label: '作品数', field: 'count', align: 'right', headerStyle: 'width: 112px', classes: 'text-weight-medium' }
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
    window.removeEventListener('keydown', this.handlePageKeyEvent)
  },

  computed: {
    url () {
      return `/api/${this.restrict}/`
    },

    queryField () {
      switch (this.restrict) {
        case 'circles':
          return 'circleId'
        case 'tags':
          return 'tagId'
        case 'vas':
          return 'vaId'
        default:
          return 'circleId'
      }
    },

    filteredItems () {
      return this.items.filter(item => item.name.toLowerCase().indexOf(this.keyword.toLowerCase()) !== -1)
    },

    rangeLabel () {
      const total = this.filteredItems.length
      if (total === 0) {
        return this.keyword ? '没有匹配的结果' : '暂时没有数据'
      }
      const { page, rowsPerPage } = this.pagination
      if (!rowsPerPage) {
        return `共 ${total} 项`
      }
      const start = (page - 1) * rowsPerPage + 1
      const end = Math.min(page * rowsPerPage, total)
      return `${start}-${end} / 共 ${total} 项`
    },

    pagesNumber () {
      const { rowsPerPage } = this.pagination
      return rowsPerPage
        ? Math.max(1, Math.ceil(this.filteredItems.length / rowsPerPage))
        : 1
    },

    // 窄屏上 RJ 标签会折成很多行把行高撑开，直接不显示这一列
    visibleColumns () {
      return this.$q.screen.lt.sm ? ['index', 'favourite', 'name', 'count'] : void 0
    }
  },

  watch: {
    url () {
      this.requestList()
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
        this.pagination.page--
      } else if (e.key === 'ArrowRight' && this.pagination.page < this.pagesNumber) {
        this.pagination.page++
      }
    },

    // 作品 id 的 RJ 展示文本统一由中立的格式化工具生成
    rjLabel (id) {
      return formatRJLabel(id)
    },

    // 表格行与名称链接共用，保留可中键新开标签页的链接
    worksLink (item) {
      return { path: '/works', query: { [this.queryField]: item.id } }
    },

    openWorks (evt, row) {
      this.$router.push(this.worksLink(row))
    },

    requestList () {
      this.loading = true
      this.$axios.get(this.url)
        .then((response) => {
          this.items = response.data.concat()
          this.loading = false
        })
        .catch((error) => {
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

    toggleFavourite (item) {
      // 乐观更新：先改本地状态，请求失败时回滚
      const previous = item.favourite ? 1 : 0
      const favourite = previous ? 0 : 1
      item.favourite = favourite

      this.$axios.put(`/api/${this.restrict}/${item.id}/favourite`, { favourite: !!favourite })
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

/* 窄屏上让列宽跟着内容走，否则"作品数"列会被压成一条缝 */
@media (max-width: $breakpoint-xs-max) {
  .list-table :deep(.q-table) {
    table-layout: auto;
  }
}

.list-table :deep(.q-table thead th) {
  font-size: 14px;
  font-weight: 600;
  color: #424242;
}

.list-table :deep(.q-table tbody td) {
  font-size: 15px;
  height: 40px;
}

.list-table :deep(.q-table__top) {
  padding: 6px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, .12);
}

/* 表格顶栏里的搜索框 */
.list-search {
  width: 300px;
}

@media (max-width: $breakpoint-xs-max) {
  .list-search {
    width: 100%;
  }
}

/* “近期发售”列的 RJ 号标签：主题色淡底 + 主题色文字（Quasar 默认 primary #027be3） */
.rj-chips {
  display: flex;
  flex-wrap: wrap;
  margin: -2px;
}

.rj-chip {
  margin: 2px;
  padding: 0 7px;
  border-radius: 9px;
  background: rgba(2, 123, 227, .12);
  color: #027be3;
  font-size: 12px;
  line-height: 18px;
  text-decoration: none;
  white-space: nowrap;
}

.rj-chip:hover {
  background: rgba(2, 123, 227, .24);
  color: #01579b;
}
</style>
