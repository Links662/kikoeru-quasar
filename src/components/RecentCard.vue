<template>
  <div>
    <q-img
      :src="coverUrl"
      :ratio="4/3"
      :img-class="imgClass"
      transition="fade"
      @mouseover="''"
      @mouseout="''"
      @click="onClickPlay()"
      class="square"
    >
      <div class="absolute-top-left transparent" style="padding: 0;">
        <q-chip dense square color="brown" text-color="white" class="q-ma-sm">
          {{`RJ${recentwork.work_id}`}}
        </q-chip>
      </div>

      <div class="absolute-bottom-right" style="padding: 5px;">
        {{'上次播放到: ' + this.formatSeconds(recentwork.play_time)}}
      </div>

      <div class="text">
        {{recentwork.file_name}}
      </div>
    </q-img>

    <div class="underline-text">
      <span class="mover-1">
        {{recentwork.file_name}}
      </span>
    </div>

  </div>
</template>

<script>
import NotifyMixin from '../mixins/Notification.js'

export default {
  name: 'RecentCard',

  mixins: [NotifyMixin],

  components: {
  },

  props: {
    recentwork: {
      type: Object,
      required: true
    }
  },

  data () {
    return {
    }
  },

  computed: {
      imgClass () {
      if (this.$q.platform.is.mobile) {
        // 在移动设备上图片直接显示
        return ""
      } else {
        if (!this.nsfw) {
          // 在PC上SFW的图片直接显示
          return ""
        } else {
          // 在PC上NSFW的图片鼠标悬停显示
          return this.blurFlag ? "blur-image" : ""
        }
      }
    },

    coverUrl () {
      // 从 LocalStorage 中读取 token
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      return this.recentwork.work_id ? `/api/cover/${this.recentwork.work_id}?token=${token}` : ""
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
              queue.push({
                ...tree[i],
                artist: metadata.circle.name || '',
                album: metadata.title || '',
              })
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
          queue: queue.concat(),
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

<style lang="scss">
  .square {
    // width: 150px;
    // height: 100px;
    transition: transform 100ms ease-out, border-radius 200ms ease-out;
    border-radius: 10px 10px 10px 10px;
    margin-right: 10px;
    box-shadow: 0 1px 5px rgba(128, 128, 128, 0.246), 0 2px 2px rgba(128, 128, 128, 0.102), 0 3px 1px -2px rgba(128, 128, 128, 0.116);
  }

  .underline-text{
    // width: 150px;
    // height: 20px;
    overflow: hidden;
    position: relative;
    // box-shadow: inset 25px 0px 25px -25px rgba(0,0,0,0.45), inset -25px 0px 25px -25px rgba(0,0,0,0.45);
  }

  .underline-text .mover-1 {
    position: absolute;
    transform: translate3d(0, 0, 0);
    animation: moveSlideshow 10s linear infinite;
  }

  @keyframes moveSlideshow {
    from { transform: translate3d(150px, 0, 0); }
    to { transform: translate3d(-100%, 0, 0); }
  }

  .square .cover {
    width: 100%;
    height: 100px;
    background-size: cover!important;
    background-position: center!important;
  }

  .square .text {
    display: none;
    background: #181818ad;
    color: #fff;
    height: fit-content;
    padding: 5px;
    box-sizing: border-box;
    transition: opacity 300ms ease-out, border-radius 200ms ease-out;
    border-radius: 0 0 10px 10px;
    font-size: 8px;
    white-space: normal;
  }

  .square:hover {
    border-radius: 10px;
    transform: scale(1.1);
    box-shadow: 0 0 2px #000a;
    z-index: 999;
  }

  .square:hover .text {
    display: inline-block;
  }

  .square.one .cover {
    background: url(https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Arrestbygningen_ved_r%C3%A5d-_og_domhuset.jpg/320px-Arrestbygningen_ved_r%C3%A5d-_og_domhuset.jpg), skyblue;
  }

  .square.one:hover .cover {
    background: url(https://media.giphy.com/media/lgcUUCXgC8mEo/giphy.gif), url(https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Arrestbygningen_ved_r%C3%A5d-_og_domhuset.jpg/320px-Arrestbygningen_ved_r%C3%A5d-_og_domhuset.jpg), skyblue;
  }
</style>
