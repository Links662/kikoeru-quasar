<template>
  <q-page padding>
    <div class="fit row wrap justify-between items-start q-px-sm">
      <q-btn-toggle v-model="progressFilter" toggle-color="primary" color="white"
        text-color="black" rounded :options="[
          { label: '想听', value: 'marked' },
          { label: '在听', value: 'listening' },
          { label: '听过', value: 'listened' },
          { label: '重听', value: 'replay' },
          { label: '搁置', value: 'postponed' }
        ]" />
      <div class="col-auto gt-xs row">
        <q-select dense rounded outlined v-model="sortBy" :options="sortOptions" bg-color="white" class="q-mx-sm" />
        <q-btn :disable="sortButtonDisabled" dense rounded color="white"
          :text-color="sortButtonDisabled ? 'grey' : 'black'" :icon="direction ? 'arrow_downward' : 'arrow_upward'"
          @click="switchSortMode" />
      </div>
    </div>
    <div class="q-pt-md">
      <div class="q-px-sm q-py-md">
        <q-infinite-scroll @load="onLoad" :offset="500" :disable="stopLoad" ref="scroll">
          <div class="row justify-center text-grey" v-if="works.length === 0">在作品界面上点击星标、标记进度，标记的音声就会出现在这里啦</div>
          <q-list bordered separator class="shadow-2" v-if="works.length">
            <FavListItem v-for="work in works" :key="work.id" :workid="work.id" :metadata="work" @deleteItem="removeFavItem"></FavListItem>
          </q-list>
          <template v-slot:loading>
            <div class="row justify-center q-my-md">
              <q-spinner-dots color="primary" size="40px" />
            </div>
          </template>
        </q-infinite-scroll>
      </div>
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
      return this.sortMode === 'desc'
    },

    sortButtonDisabled () {
      return this.sortBy.order === 'allage' || this.sortBy.order === 'nsfw'
    }
  },

  data() {
    return {
      progressFilter: 'marked',
      works: [],
      stopLoad: false,
      pagination: { currentPage:0, pageSize:12, totalCount:0 },
      sortMode: 'desc',
      sortBy: {
          label: '标记时间',
          order: 'updated_at'
        },
      sortOptions: [
        {
          label: '标记时间',
          order: 'updated_at'
        },
        {
          label: '评价',
          order: 'userRating'
        },
        {
          label: '发布时间',
          order: 'release'
        },
        {
          label: '评论数量',
          order: 'review_count'
        },
        {
          label: '售出数量',
          order: 'dl_count'
        }
      ]
    }
  },

  created() {
  },

  mounted() {
    if (localStorage.sortByFavourites) {
      try {
        this.sortBy = JSON.parse(localStorage.sortByFavourites);
      } catch {
        localStorage.removeItem('sortByFavourites');
      }
    }
  },

  watch: {
    sortBy(newSortOptionSetting) {
      localStorage.sortByFavourites = JSON.stringify(newSortOptionSetting);
      this.pagination.currentPage = 0
    },

    sortMode() {
      this.pagination.currentPage = 0
    },

    progressFilter(){
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
      if(this.sortMode ==='desc') {
        this.sortMode = 'asc'
      } else {
        this.sortMode = 'desc'
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
      const params = {
        order: this.sortBy.order,
        sort: this.sortMode,
        page: this.pagination.currentPage + 1 || 1
      }
      params.filter = this.progressFilter;
      return this.$axios.get('/api/review', { params })
        .then((response) => {                  
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
