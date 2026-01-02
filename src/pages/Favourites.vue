<template>
  <q-page padding>
    <div class="fit row wrap justify-between items-center q-px-sm">
      <div class="col-auto gt-xs">
        <q-btn-toggle v-model="progressFilter" toggle-color="primary" color="white" text-color="black" rounded
          :options="progressOptions" />
      </div>
      <div class="col-4 lt-sm">
        <q-select dense rounded outlined behavior="menu" v-model="progressFilter" :options="progressOptions"
          option-label="label" option-value="value" emit-value map-options label="进度筛选" bg-color="white" />
      </div>
      <div class="col-auto row items-start q-ml-sm">
        <q-select dense rounded outlined behavior="menu" v-model="sortBy" :options="sortOptions" bg-color="white"
          class="q-mx-sm" />
        <q-btn dense rounded unelevated color="white" class="sort-btn" text-color="black"
          :icon="direction ? 'arrow_downward' : 'arrow_upward'" @click="switchSortMode" />
      </div>
    </div>
    <div class="q-px-sm q-py-sm">
      <q-infinite-scroll @load="onLoad" :offset="500" :disable="stopLoad" ref="scroll">
        <div class="row justify-center text-grey" v-if="works.length === 0">在作品界面上点击星标、标记进度，标记的音声就会出现在这里啦</div>
        <q-list bordered separator class="shadow-2" v-if="works.length">
          <FavListItem v-for="work in works" :key="work.id" :workid="work.id" :metadata="work"
            @deleteItem="removeFavItem"></FavListItem>
        </q-list>
        <template v-slot:loading>
          <div class="row justify-center q-my-md">
            <q-spinner-dots color="primary" size="40px" />
          </div>
        </template>
      </q-infinite-scroll>
    </div>
  </q-page>
</template>

<script>
import FavListItem from 'components/FavListItem'
import NotifyMixin from '../mixins/Notification.js'

export default {
  name: 'Favourites',
  mixins: [NotifyMixin],
  components: {
    FavListItem
  },

  computed: {
    direction () {
      return this.sortBy.sort === 'desc'
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
        order: 'updated_at',
        sort: 'desc'
      }
    }
    return {
      progressFilter: 'marked',
      progressOptions: [
        { label: '想听', value: 'marked' },
        { label: '在听', value: 'listening' },
        { label: '听过', value: 'listened' },
        { label: '重听', value: 'replay' },
        { label: '搁置', value: 'postponed' }
      ],
      works: [],
      stopLoad: false,
      requestId: 0,
      pagination: { currentPage:0, pageSize:12, totalCount:0 },
      sortBy: sortOption,
      sortOptions: [
        {
          label: '标记时间',
          order: 'updated_at',
          sort: 'desc'
        },
        {
          label: '评价排序',
          order: 'userRating',
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
  },

  mounted() {
  },

  watch: {
    sortBy(newSortOptionSetting) {
      localStorage.sortByFavourites = JSON.stringify(newSortOptionSetting);
      this.requestId++
      this.pagination.currentPage = 0
    },

    progressFilter(){
      this.requestId++
      this.pagination.currentPage = 0
    },

    'pagination.currentPage'() {
      if (this.pagination.currentPage === 0) {
        this.reset();
      }
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
      }
    },

    onLoad (index, done) {
      this.requestWorksQueue()
        .finally(() => {
          done()
        })
    },

    reset() {
      this.stopLoad = true
      this.works = []

      this.$nextTick(() => {
        this.stopLoad = false
        this.$refs.scroll.reset()
        this.$refs.scroll.resume()
      })
    },


    requestWorksQueue () {
      const currentRequestId = this.requestId
      const params = {
        order: this.sortBy.order,
        sort: this.sortBy.sort,
        page: this.pagination.currentPage + 1
      }
      params.filter = this.progressFilter;
      return this.$axios.get('/api/review', { params })
        .then((response) => {
          if (currentRequestId !== this.requestId) return
          const works = response.data.works
          this.works = (params.page === 1) ? works.concat() : this.works.concat(works)
          this.pagination = response.data.pagination
          this.stopLoad = !this.pagination.hasMore
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
          this.stopLoad = true
        })
    },
  }
}

</script>
<style>
.sort-btn {
  height: 40px;
  min-height: 40px;
  width: 40px;

  border: 1px solid rgba(0, 0, 0, 0.23);
  box-shadow: none;
}
</style>
