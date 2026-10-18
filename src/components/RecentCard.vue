<template>
  <div>
    <!-- 最近播放这排是例外：开了 NSFW 模式就一律糊，不按 R18 判断 -->
    <q-img
      :src="coverUrl"
      :ratio="4/3"
      img-class="cover-mask"
      @click="onClickPlay()"
      class="square shadow-2"
    >
      <!-- 封面叠层默认被 Quasar 的 `.q-img__content > div` 撑了 16px 内边距，
           叠加内容统一放在 transparent no-padding 包装层里 -->
      <div class="absolute-top-left transparent no-padding">
        <q-chip dense square color="brown" text-color="white" class="q-ma-sm">
          {{ rjLabel }}
        </q-chip>
      </div>

      <div class="absolute-bottom transparent no-padding">
        <div class="recent-caption text-white q-px-sm q-py-xs">
          <span class="text-caption text-weight-medium ellipsis-2-lines"> {{ recentwork.file_name }} </span>
          <span class="text-caption"> 上次播放到: {{ this.formatSeconds(recentwork.play_time) }} </span>
        </div>
      </div>
    </q-img>


  </div>
</template>

<script>
import NotifyMixin from '../mixins/Notification.js'
import { formatRJLabel } from '../utils/rjCode'

export default {
  name: 'RecentCard',

  mixins: [NotifyMixin],

  props: {
    recentwork: {
      type: Object,
      required: true
    }
  },

  computed: {
    coverUrl () {
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      return this.recentwork.work_id ? `/api/cover/${this.recentwork.work_id}?token=${token}` : ""
    },

    rjLabel () {
      return this.recentwork.work_id ? formatRJLabel(this.recentwork.work_id) : ''
    },
  },

  methods: {
    async onClickPlay() {
      try {
        const metadataResponse = await this.$axios.get(
          `/api/work/${this.recentwork.work_id}`
        )
        const metadata = metadataResponse.data

        const tracksResponse = await this.$axios.get(
          `/api/tracks/${this.recentwork.work_id}`
        )
        this.tree = tracksResponse.data

        const hash = this.recentwork.work_id + '/' + this.recentwork.file_index
        const queue = []

        // children 还能有 children
        const pushAudio = (tree) => {
          for (let i = 0; i < tree.length; i += 1) {
            if (tree[i].type === 'audio') {
              queue.push({ ...tree[i] })
            }
          }
        }

        const makeQueue = (tree) => {
          for (let i = 0; i < tree.length; i += 1) {
            if (tree[i].children == null) {
              if (tree[i].type === 'audio' && tree[i].hash === hash) {
                pushAudio(tree)
                return
              }
            } else {
              makeQueue(tree[i].children)
            }
          }
        }

        makeQueue(this.tree)

        this.$store.commit('AudioPlayer/SET_QUEUE', {
          work: metadata,
          tracks: queue.concat(),
          index: queue.findIndex(file => file.hash === hash),
        })

        this.$store.commit('AudioPlayer/PLAY')
      } catch (error) {
        if (error.response) {
          this.showErrNotif(
            error.response.data.error ||
            `${error.response.status} ${error.response.statusText}`
          )
        } else {
          this.showErrNotif(error.message || error)
        }
      }
    },

    formatSeconds(seconds) {
      let h = Math.floor(seconds / 3600) < 10
        ? '0' + Math.floor(seconds / 3600)
        : Math.floor(seconds / 3600)

      let m = Math.floor((seconds / 60 % 60)) < 10
        ? '0' + Math.floor((seconds / 60 % 60))
        : Math.floor((seconds / 60 % 60))

      let s = Math.floor((seconds % 60)) < 10
        ? '0' + Math.floor((seconds % 60))
        : Math.floor((seconds % 60))

      return h === "00"
        ? m + ":" + s
        : h + ":" + m + ":" + s
    }
  },
}
</script>

<style lang="scss" scoped>
  .square {
    transition: transform 100ms ease-out, border-radius 200ms ease-out;
    border-radius: 10px;
    margin-right: 10px;
  }

  .recent-caption {
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.78));
  }

  .square:hover {
    border-radius: 10px;
    transform: scale(1.1);
    box-shadow: 0 0 2px #000a;
    z-index: 999;
  }

</style>
