<template>
  <div class="q-ma-md">
    <q-breadcrumbs gutter="xs" v-if="path.length">
      <q-breadcrumbs-el   >
        <q-btn no-caps flat dense size="md" icon="folder" @click="path = []">ROOT</q-btn>
      </q-breadcrumbs-el>

    <q-breadcrumbs-el v-for="(folderName, index) in path" :key="index" class="cursor-pointer">
        <q-btn no-caps flat dense size="md" icon="folder" @click="onClickBreadcrumb(index)">{{
          getDisplayName(folderName) }}</q-btn>
      </q-breadcrumbs-el>
    </q-breadcrumbs>

    <q-card>
      <q-list separator>
        <q-item
          clickable
          v-ripple
          v-for="(item, index) in fatherFolder"
          :key="index"
          :active="item.type === 'audio' && currentTrack.hash === item.hash"
          active-class="text-white bg-teal"
          @click="onClickItem(item)"
          class="non-selectable"
        >
          <q-item-section avatar>
            <q-icon size="md" v-if="item.type === 'folder'" color="amber" name="folder" />
            <q-icon size="md" v-else-if="item.type === 'text'" color="info" name="description" />
            <q-icon size="md" v-else-if="item.type === 'image'" color="orange" name="photo" />
            <q-icon size="md" v-else-if="item.type === 'other'" color="info" name="description" />
            <q-btn v-else round dense color="primary" :icon="playIcon(item.hash)" @click="onClickPlayButton(item.hash)" />
          </q-item-section>

          <q-item-section>
            <q-item-label lines="2">{{ item.title }}</q-item-label>
            <q-item-label v-if="item.children" caption lines="1">{{ `${item.children.length} 项目` }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'WorkTree',

  data() {
    return {
      path: [],
      truncateLength: 5
    }
  },

  props: {
    tree: {
      type: Array,
      required: true,
    },
    metadata: {
      type: Object,
      required: true
    }
  },

  watch: {
    tree () {
      this.initPath()
    }
  },

  computed: {
    fatherFolder () {
      let fatherFolder = this.tree.concat()
      this.path.forEach(folderName => {
        fatherFolder = fatherFolder.find(item => item.type === 'folder' && item.title === folderName).children
      })

      return fatherFolder
    },

    // 当前文件夹里的音轨：点其中一条就是"播放这一章"，队列里只放曲目自己的字段，
    // 作品级信息（作品名、社团、R18）由 store 从 metadata 里记一份
    tracks () {
      return this.fatherFolder.filter(item => item.type === 'audio')
    },

    ...mapState('AudioPlayer', [
      'playing'
    ]),

    ...mapGetters('AudioPlayer', [
      'currentTrack'
    ])
  },

  methods: {
    getDisplayName(name) {
      if (name.length <= this.truncateLength) return name
      return name.slice(0, this.truncateLength) + '...'
    },

    playIcon (hash) {
      return this.playing && this.currentTrack.hash === hash ? "pause" : "play_arrow"
    },

    initPath () {
      const initialPath = []
      let fatherFolder = this.tree.concat()
      while (fatherFolder.length === 1) {
        if (fatherFolder[0].type === 'audio') {
          break
        }
        initialPath.push(fatherFolder[0].title)
        fatherFolder = fatherFolder[0].children
      }
      this.path = initialPath
    },

    onClickBreadcrumb (index) {
      this.path = this.path.slice(0, index+1)
    },

    onClickItem (item) {
      if (item.type === 'folder') {
        this.path.push(item.title);
      } else if (item.type === 'text' || item.type === 'image') {
        this.openFile(item);
      } else if (item.type === 'other') {
        this.download(item);
      } else if (this.currentTrack.hash !== item.hash) {
        this.playTracks(item.hash)
      }
    },

    onClickPlayButton (hash) {
      if (this.currentTrack.hash === hash) {
        this.$store.commit('AudioPlayer/TOGGLE_PLAYING')
      } else {
        this.playTracks(hash)
      }
    },

    // 用当前文件夹的音轨换掉整个队列，从 hash 这一条开始播
    playTracks (hash) {
      this.$store.commit('AudioPlayer/SET_QUEUE', {
        work: this.metadata,
        tracks: this.tracks.concat(),
        index: this.tracks.findIndex(file => file.hash === hash),
      })
      this.$store.commit('AudioPlayer/PLAY')
    },

    download (file) {
      const token = this.$q.localStorage.getItem('jwt-token') || '';
      // Fallback to old API for an old backend
      const url = file.mediaDownloadUrl ? `${file.mediaDownloadUrl}?token=${token}` : `/api/media/download/${file.hash}?token=${token}`;
      const link = document.createElement('a');
      link.href = url;
      link.target="_blank";
      link.click();
    },

    openFile (file) {
      const token = this.$q.localStorage.getItem('jwt-token') || '';
      // Fallback to old API for an old backend
      const url = file.mediaStreamUrl ? `${file.mediaStreamUrl}?token=${token}` : `/api/media/stream/${file.hash}?token=${token}`;
      const link = document.createElement('a');
      link.href = url;
      link.target="_blank";
      link.click();
    },
  }
}
</script>
