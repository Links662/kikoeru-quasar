<template>
  <div class="q-ma-md">
    <div class="text-h5 text-weight-regular q-mb-sm">
      All {{ restrict }}
    </div>

    <div class="row justify-center">
      <div class="col-12 q-mb-sm">
        <q-input dense rounded outlined v-model="keyword" :placeholder="`Search for a ${restrict}...`">
          <template v-slot:append>
            <q-icon v-if="keyword === ''" name="search" />
            <q-icon v-else name="clear" class="cursor-pointer" @click="keyword = ''" />
          </template>
        </q-input>
      </div>
      <div class="col-12">
        <div class="row justify-center q-gutter-sm">
          <template v-for="(item, index) in displayedItems">
            <q-separator v-if="index > 0 && index === favouriteCount" :key="`sep-${item.id}`" vertical
              class="q-mx-xs" />
            <q-btn :key="item.id" no-caps rounded :color="item.favourite ? 'yellow' : 'primary'"
              :text-color="item.favourite ? 'black' : 'white'" :to="`/works?${queryField}=${item.id}`"
              :label="`${item.name} (${item.count})`">
              <span class="favourite-divider" />
              <q-icon :name="item.favourite ? 'star' : 'star_border'" size="18px" class="cursor-pointer"
                @click.stop.prevent="toggleFavourite(item)" />
            </q-btn>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import NotifyMixin from '../mixins/Notification.js'

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
      keyword: ''
    }
  },

  created () {
    this.requestList()
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

    // 收藏项置顶，其余保持后端返回的顺序（按名称升序）
    displayedItems () {
      const list = this.keyword ? this.filteredItems : this.items
      return list.slice().sort((a, b) => (b.favourite ? 1 : 0) - (a.favourite ? 1 : 0))
    },

    favouriteCount () {
      return this.displayedItems.filter(item => item.favourite).length
    }
  },

  watch: {
    url () {
      this.requestList()
    }
  },

  methods: {
    requestList () { 
      this.$axios.get(this.url)
        .then((response) => {
          this.items = response.data.concat()
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

<style scoped>
/* 按钮内文字与星标之间的竖线 */
.favourite-divider {
  align-self: stretch;
  width: 1px;
  margin: 0 8px;
  background: currentColor;
  opacity: 0.4;
}
</style>
