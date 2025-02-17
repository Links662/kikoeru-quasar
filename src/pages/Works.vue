<template>
  <div>
    <RecentList />

    <div class="text-h5 text-weight-regular q-ma-md">
      {{pageTitle}}
      <span v-show="pagination.totalCount">
        ({{pagination.totalCount}})
      </span>
    </div>
    <div style="max-width: 1680px;" class="col">
      <div v-show="works.length" class="row justify-between q-mb-md q-mr-sm">
        <!-- 排序选择框 -->
        <q-select dense rounded outlined bg-color="white" transition-show="scale" transition-hide="scale"
          v-model="sortOption" :options="options" label="排序" class="col-auto" />

        <!-- 切换显示模式按钮 -->
        <q-btn-toggle dense spread rounded v-model="listMode" toggle-color="primary" color="white" text-color="primary"
          :options="[
              { icon: 'apps', value: 'detail' },
              { icon: 'view_column', value: 'column' },
              { icon: 'list', value: 'list' }
            ]" style="width: 85px;" class="col-auto" />

        <q-btn-toggle dense spread rounded v-model="showLabel" toggle-color="primary" color="white" text-color="primary"
          :options="[
              { icon: 'label', value: true },
              { icon: 'label_off', value: false }
            ]" style="width: 85px;" class="col-auto" v-if="$q.screen.width > 700 && listMode == 'list'" />

        <q-btn-toggle dense spread rounded :disable="$q.screen.width < 700" v-model="detailMode" toggle-color="primary"
          color="white" text-color="primary" :options="[
              { icon: 'zoom_in', value: true },
              { icon: 'zoom_out', value: false },
            ]" style="width: 85px;" class="col-auto" v-if="$q.screen.width > 700 && listMode !== 'list'" />

      </div>

      <q-list v-if="listMode === 'list'" bordered separator class="shadow-2">
        <WorkListItem v-for="work in works" :key="work.id" :metadata="work"
          :showLabel="showLabel && $q.screen.width > 700" />
      </q-list>

      <div v-else-if="listMode === 'detail'" class="row q-col-gutter-x-md q-col-gutter-y-lg">
        <div class="col-xs-12 col-sm-6 col-md-4" :class="detailMode ? 'col-lg-3 col-xl-3': 'col-lg-3 col-xl-3'"
          v-for="work in works" :key="work.id">
          <WorkCard :metadata="work" :thumbnailMode="!detailMode" class="fit" />
        </div>
      </div>

      <div v-else class="row q-col-gutter-x-md q-col-gutter-y-lg">
        <div class="col-xs-6 col-sm-4 col-md-3" :class="detailMode ? 'col-lg-2 col-xl-2': 'col-lg-2 col-xl-2'"
          v-for="work in works" :key="work.id">
          <WorkCard :metadata="work" :thumbnailMode="!(detailMode && $q.screen.width > 700)" class="fit" />
        </div>
      </div>
      <!-- 分页控件 -->
      <div class="row justify-center q-my-md">
        <q-pagination v-model="pagination.currentPage" :max="pagination.totalPages" direction-links
          color="primary" @input="handlePageChange" input />
      </div>
    </div>
  </div>
</template>

<script>
import WorkCard from 'components/WorkCard'
import WorkListItem from 'components/WorkListItem'
import NotifyMixin from '../mixins/Notification.js'
import RecentList from 'components/RecentList'

export default {
  name: 'Works',

  mixins: [NotifyMixin],

  components: {
    WorkCard,
    WorkListItem,
    RecentList
  },

  data () {
    return {
      listMode: 'detail',
      showLabel: true,
      detailMode: true,
      stopLoad: false,
      works: [],
      pageTitle: '',
      page: 1,
      pagination: {
        currentPage: 1, // 当前页码
        totalPages: 1, // 总页数
        totalCount: 0, // 总数据量
        pageSize: 12 // 每页数量
      },
      seed: 7, // random sort
      sortOption: {
        label: '最新加入数据库',
        order: 'insert_time',
        sort: 'desc'
      },
      options: [
        {
          label: '最新发售日期',
          order: 'release',
          sort: 'desc'
        },
        {
          label: '最新加入数据库',
          order: 'insert_time',
          sort: 'desc'
        },
        {
          label: 'RJ号从大到小',
          order: 'id',
          sort: 'desc'
        },
        {
          label: '全年龄新作优先',
          order: 'nsfw',
          sort: 'asc'
        },
        {
          label: '按照我的评价排序',
          order: 'rating',
          sort: 'desc'
        },
        {
          label: '评价从高到低',
          order: 'rate_average_2dp',
          sort: 'desc'
        },
        {
          label: '售出数量从多到少',
          order: 'dl_count',
          sort: 'desc'
        },
        {
          label: '价格从贵到便宜',
          order: 'price',
          sort: 'desc'
        },
        {
          label: '评论从多到少',
          order: 'review_count',
          sort: 'desc'
        },
        {
          label: '最早加入数据库',
          order: 'insert_time',
          sort: 'asc'
        },
        {
          label: '发售日期从老到新',
          order: 'release',
          sort: 'asc'
        },
        {
          label: 'RJ号从小到大',
          order: 'id',
          sort: 'asc'
        },
        {
          label: '价格从便宜到贵',
          order: 'price',
          sort: 'asc'
        },
        {
          label: '随机排序',
          order: 'random',
          sort: 'desc'
        }
      ]
    }
  },

  created () {
    this.refreshPageTitle();
    this.seed = Math.floor(Math.random() * 100);
  },

  mounted() {
    this.requestWorksQueue();
    if (localStorage.getItem("sortOption") != null) {
      try {
        this.sortOption = JSON.parse(localStorage.sortOption);
      } catch {
        localStorage.removeItem('sortOption');
      }
    }
    if (localStorage.getItem("showLabel") != null) {
      this.showLabel = (localStorage.showLabel === 'true');
    }
    if (localStorage.getItem("listMode") != null) {
      this.listMode = localStorage.listMode;
    }
    if (localStorage.getItem("detailMode") != null) {
      this.detailMode = (localStorage.detailMode === 'true');
    }
  },

  computed: {
    url () {
      const query = this.$route.query
      if (query.circleId) {
        return `/api/circles/${this.$route.query.circleId}/works`
      } else if (query.tagId) {
        return `/api/tags/${this.$route.query.tagId}/works`
      } else if (query.vaId) {
        return `/api/vas/${this.$route.query.vaId}/works`
      } else if (query.keyword) {
        return `/api/search/${query.keyword}`
      } else {
        return '/api/works'
      }
    }
  },

  // keep-alive hooks
  // <keep-alive /> is set in MainLayout
  activated () {
    this.stopLoad = false
  },

  deactivated () {
    this.stopLoad = true
  },

  watch: {
    url () {
      this.reset()
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
          console.log("API 响应数据:", response.data); // 确保数据正确
          const works = response.data.works;
          this.works = works; // 直接覆盖，不再追加
          this.pagination.totalCount = response.data.pagination.totalCount;
          this.pagination.pageSize = response.data.pagination.pageSize;
          this.pagination.totalPages = Math.ceil(this.pagination.totalCount / this.pagination.pageSize);
          this.stopLoad = this.pagination.currentPage >= this.pagination.totalPages;
        })
        .catch((error) => {
          this.handleRequestError(error);
        });
    },

    // **分页变化**
    handlePageChange(page) {
      console.log("当前页码:", page); // 确保页码有更新
      this.pagination.currentPage = page;
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
      this.stopLoad = true;
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
                pageTitle = 'Works tagged with '
                break
              case 'vas':
                pageTitle = 'Works voiced by '
                break
              case 'circles':
                pageTitle = 'Works by '
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
      this.stopLoad = true
      this.refreshPageTitle()
      this.pagination = { currentPage:1, pageSize:12, totalCount:0 }
      this.requestWorksQueue()
        .then(() => {
          this.stopLoad = false
        })
    },
  }
}
</script>

<style lang="scss" scoped>
  .list {
    // 宽度 >= $breakpoint-sm-min
    @media (min-width: $breakpoint-sm-min) {
      padding: 0px 20px;
    }
  }

  .work-card {
    // 宽度 > $breakpoint-xl-min
    @media (min-width: $breakpoint-md-min) {
      width: 560px;
    }
  }
</style>
