<template>
  <q-slide-transition>
    <div v-show="hasTrack && hide" class="bg-white text-black player-bar">
      <div v-show="showLyricStrip" class="player-bar-lyric">
        <span v-if="currentLyric" class="player-bar-lyric__text text-purple text-bold ellipsis">
          {{ currentLyric }}
        </span>
      </div>

      <div class="row">
        <q-item clickable v-ripple @click="toggleHide()" class="col non-selectable q-py-none q-px-xs">
          <q-item-section avatar>
            <q-img fit="contain" :src="coverUrl" :img-class="currentWork.nsfw ? 'cover-mask' : ''" class="rounded-borders player-bar-cover" />
          </q-item-section>

          <q-item-section>
            <q-item-label lines="2">{{ currentTrack.title }}</q-item-label>
            <q-item-label caption lines="1">{{currentWork.artist + ' - ' + currentWork.album }}</q-item-label>
          </q-item-section>
        </q-item>

        <q-btn flat size="lg" icon="skip_previous" @click="previousTrack()" class="col-auto gt-sm player-bar-btn"/>
        <q-btn flat size="lg" :icon="playingIcon" @click="togglePlaying()" class="col-auto player-bar-btn" />
        <q-btn flat size="lg" icon="skip_next" @click="nextTrack()" class="col-auto gt-sm player-bar-btn"/>
      </div>
    </div>
  </q-slide-transition>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'PlayerBar',

  computed: {
    // 播放条小图用 sam：原图的等比缩略图，配合 contain 等比完整显示
    coverUrl () {
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      const id = this.currentWork.id
      return id ? `/api/cover/${id}?type=sam&token=${token}` : ""
    },

    playingIcon () {
      return this.playing ? "pause" : "play_arrow"
    },

    // 收起态的歌词条不看歌词开关：这首有歌词就占住这一行
    showLyricStrip () {
      return this.hasLyric === true
    },

    ...mapState('AudioPlayer', [
      'hide',
      'playing',
      'currentLyric'
    ]),

    ...mapGetters('AudioPlayer', [
      'currentTrack',
      'currentWork',
      'hasTrack',
      'hasLyric'
    ])
  },

  methods: {
    toggleHide () {
      this.$store.commit('AudioPlayer/TOGGLE_HIDE')
    },

    togglePlaying () {
      this.$store.commit('AudioPlayer/TOGGLE_PLAYING')
    },

    nextTrack () {
      this.$store.commit('AudioPlayer/NEXT_TRACK')
    },

    previousTrack () {
      this.$store.commit('AudioPlayer/PREVIOUS_TRACK')
    },
  }
}
</script>

<style lang="scss" scoped>
// 收起态的迷你播放条：封面与三个按钮尺寸固定，保证整行高度一致
$player-bar-cover: 50px;
$player-bar-btn: 60px;

// 收起态播放条本体：上沿和页面之间也有一条分割线，
// 所以歌词条上下各一条，把这一整块和页面分开
.player-bar {
  border-top: 1px solid $separator-color;
}

// sam 保留原图比例：正方形封面正好铺满，其它比例用 contain 上下留白
.player-bar-cover {
  height: $player-bar-cover;
  width: $player-bar-cover;
}

.player-bar-btn {
  height: $player-bar-btn;
  width: $player-bar-btn;
}

// 收起态歌词条：播放条里的一行。底色不另设，跟着播放条的 bg-white 走，
// 靠下面这条淡分割线和控件分开
.player-bar-lyric {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 12px;
  border-bottom: 1px solid $separator-color;
}

.player-bar-lyric__text {
  max-width: 100%;
}
</style>
