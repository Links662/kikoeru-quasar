<template>
  <q-slide-transition>
    <div v-show="currentPlayingFile.hash && hide" class="row bg-white text-black">
      <q-item clickable v-ripple @click="toggleHide()" class="col non-selectable q-py-none q-px-xs">
        <q-item-section avatar>
          <q-img :src="samCoverUrl" class="rounded-borders player-bar-cover" />
        </q-item-section>
        
        <q-item-section>
          <q-item-label lines="2">{{ currentPlayingFile.title }}</q-item-label>
          <q-item-label caption lines="1">{{currentPlayingFile.artist + ' - ' + currentPlayingFile.album }}</q-item-label>
        </q-item-section>
      </q-item>

      <q-btn flat size="lg" icon="skip_previous" @click="previousTrack()" class="col-auto gt-sm player-bar-btn"/>
      <q-btn flat size="lg" :icon="playingIcon" @click="togglePlaying()" class="col-auto player-bar-btn" />
      <q-btn flat size="lg" icon="skip_next" @click="nextTrack()" class="col-auto gt-sm player-bar-btn"/>
    </div>
  </q-slide-transition>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'PlayerBar',

  computed: {
    samCoverUrl () {
      // 从 LocalStorage 中读取 token
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      const hash = this.currentPlayingFile.hash
      return hash ? `/api/cover/${hash.split('/')[0]}?type=sam&token=${token}` : ""
    },

    playingIcon () {
      return this.playing ? "pause" : "play_arrow"
    },

    ...mapState('AudioPlayer', [
      'hide',
      'playing'
    ]),

    ...mapGetters('AudioPlayer', [
      'currentPlayingFile'
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

.player-bar-cover {
  height: $player-bar-cover;
  width: $player-bar-cover;
}

.player-bar-btn {
  height: $player-bar-btn;
  width: $player-bar-btn;
}
</style>
