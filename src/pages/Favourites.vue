<template>
  <q-page class="q-mx-md q-mt-md">
    <div class="text-h5 text-weight-regular q-mb-sm">
      {{ pageTitle }}
    </div>
    <div class="row wrap justify-between items-center q-mb-sm">
      <div class="col-auto gt-xs">
        <div class="app-control-group bg-white">
          <q-btn-toggle
            v-model="progressFilter"
            unelevated
            spread
            toggle-color="primary"
            color="white"
            text-color="grey-9"
            :options="progressOptions"
          />
        </div>
      </div>
      <div class="col-auto lt-sm">
        <q-select
          v-model="progressFilter"
          :options="progressOptions"
          emit-value
          map-options
          option-label="label"
          option-value="value"
          options-dense
          options-selected-class="text-primary"
          dense
          outlined
          rounded
          behavior="menu"
          aria-label="进度筛选"
          class="app-control-field progress-filter-select text-grey-9"
          :menu-offset="[0, 6]"
        />
      </div>
      <SortControl
        v-model="sortBy"
        :options="sortOptions"
        :direction="direction"
        class="col-auto q-ml-sm"
        @toggle-direction="switchSortMode"
      />
    </div>
    <div>
      <div>
        <div class="row justify-center text-grey" v-if="visibleWorks.length === 0">
          这里只显示已标记收听状态的作品。
        </div>
        <q-list bordered separator v-if="visibleWorks.length">
          <FavListItem v-for="work in visibleWorks" :key="work.id" :workid="work.id" :metadata="work"
            @deleteItem="removeFavItem"></FavListItem>
        </q-list>
        <div class="row justify-center q-my-sm" v-if="pagination.totalPages > 1">
          <q-pagination
            :model-value="pagination.currentPage"
            :max="pagination.totalPages"
            direction-links
            color="primary"
            input
            @update:model-value="changePage"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script>
import FavListItem from 'components/FavListItem'
import SortControl from 'components/SortControl'
import NotifyMixin from '../mixins/Notification.js'
import { peekUserWorkRecord } from '../services/userWorkRecord'

export default {
  name: 'Favourites',
  mixins: [NotifyMixin],
  components: {
    FavListItem,
    SortControl
  },

  computed: {
    direction () {
      return this.sortBy.sort === 'desc'
    },

    visibleWorks () {
      return this.works.filter((work) => {
        const record = peekUserWorkRecord(work.id)
        return record === null || record.progress === this.progressFilter
      })
    },
  },

  data() {
    const storedSort = localStorage.getItem("sortByFavourites");
    let sortOption = null;
    if (storedSort) {
      try {
        sortOption = JSON.parse(storedSort);
      } catch {
        localStorage.removeItem('sortByFavourites');
      }
    }
    else {
      sortOption = {
        label: '标记时间',
        order: 'updatedAt',
        sort: 'desc'
      }
    }
    return {
      pageTitle: '收听进度',
      progressFilter: 'marked',
      progressOptions: [
        { label: '想听', value: 'marked' },
        { label: '在听', value: 'listening' },
        { label: '听过', value: 'listened' },
        { label: '重听', value: 'replay' },
        { label: '搁置', value: 'postponed' }
      ],
      works: [],
      requestId: 0,
      pagination: { currentPage: 1, pageSize: 12, totalCount: 0, totalPages: 1 },
      sortBy: sortOption,
      sortOptions: [
        {
          label: '标记时间',
          order: 'updatedAt',
          sort: 'desc'
        },
        {
          label: '评价排序',
          order: 'rating',
          sort: 'desc'
        },
        {
          label: '发布时间',
          order: 'release',
          sort: 'desc'
        },
        {
          label: '销量排序',
          order: 'dl_count',
          sort: 'desc'
        }
      ]
    }
  },

  created() {
    this.requestWorksQueue()
  },

  watch: {
    sortBy(newSortOptionSetting) {
      localStorage.sortByFavourites = JSON.stringify(newSortOptionSetting);
      this.reset()
    },

    progressFilter(){
      this.reset()
    },
  },

  methods: {
    switchSortMode() {
      this.sortBy = {
        ...this.sortBy,
        sort: this.sortBy.sort === 'desc' ? 'asc' : 'desc'
      }
    },

    removeFavItem(workId){
      const index = this.works.findIndex(w => w.id === workId)
      if (index !== -1) {
        this.works.splice(index, 1)
        this.pagination.totalCount = Math.max(0, this.pagination.totalCount - 1)
        this.pagination.totalPages = Math.max(1, Math.ceil(this.pagination.totalCount / this.pagination.pageSize))

        if (this.works.length === 0 && this.pagination.currentPage > 1) {
          this.pagination.currentPage--
          this.requestWorksQueue()
        }
      }
    },

    changePage (page) {
      if (page === this.pagination.currentPage) return
      this.pagination.currentPage = page
      this.requestWorksQueue()
    },

    reset() {
      this.pagination.currentPage = 1
      this.works = []
      this.requestWorksQueue()
    },


    requestWorksQueue () {
      const currentRequestId = ++this.requestId
      const params = {
        order: this.sortBy.order,
        sort: this.sortBy.sort,
        page: this.pagination.currentPage
      }
      params.filter = this.progressFilter;
      return this.$axios.get('/api/review', { params })
        .then((response) => {
          if (currentRequestId !== this.requestId) return
          const works = response.data.works
          const pagination = response.data.pagination
          const totalCount = Number(pagination.totalCount) || 0
          this.works = works
          this.pagination.currentPage = pagination.currentPage
          this.pagination.pageSize = pagination.pageSize
          this.pagination.totalCount = totalCount
          this.pagination.totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize))
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
    },
  }
}

</script>

<style lang="scss" scoped>
.progress-filter-select {
  width: 112px;
  flex: 0 0 112px;
}
</style>
