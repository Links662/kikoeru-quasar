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

    <q-card flat bordered>
      <q-list separator>
        <q-item
          clickable
          v-ripple
          v-for="(item, index) in fatherFolder"
          :key="index"
          :active="item.type === 'audio' && currentTrack.hash === item.hash"
          active-class="work-tree-item--active"
          @click="onClickItem(item)"
          class="work-tree-item non-selectable"
        >
          <q-item-section avatar>
            <q-icon size="md" v-if="item.type === 'folder'" class="work-tree-icon work-tree-icon--folder" name="folder" />
            <q-icon size="md" v-else-if="item.type === 'text'" class="work-tree-icon work-tree-icon--text" name="description" />
            <q-icon size="md" v-else-if="item.type === 'image'" class="work-tree-icon work-tree-icon--image" name="photo" />
            <q-icon size="md" v-else-if="item.type === 'other'" class="work-tree-icon work-tree-icon--other" name="description" />
            <q-icon v-else size="md" class="work-tree-icon work-tree-icon--audio" :name="playIcon(item.hash)" />
          </q-item-section>

          <q-item-section>
            <q-item-label lines="2">{{ item.title }}</q-item-label>
            <q-item-label v-if="item.children" caption lines="1" class="work-tree-count">
              {{ `${item.children.length} 项目` }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import { buildMediaUrl } from '../utils/mediaUrl'

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
      } else if (item.type === 'audio') {
        this.onClickPlayButton(item.hash)
      }
    },

    onClickPlayButton (hash) {
      if (this.currentTrack.hash === hash) {
        this.$store.commit('AudioPlayer/TOGGLE_PLAYING')
      } else {
        this.playTracks(hash)
      }
    },

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
      const url = buildMediaUrl(
        file.mediaDownloadUrl || `/api/media/download/${file.hash}`,
        token
      );
      const link = document.createElement('a');
      link.href = url;
      link.target="_blank";
      link.click();
    },

    openFile (file) {
      const token = this.$q.localStorage.getItem('jwt-token') || '';
      // Fallback to old API for an old backend
      const url = buildMediaUrl(
        file.mediaStreamUrl || `/api/media/stream/${file.hash}`,
        token
      );
      const link = document.createElement('a');
      link.href = url;
      link.target="_blank";
      link.click();
    },
  }
}
</script>

<style lang="scss" scoped>
.work-tree-item--active {
  background-color: var(--app-selection-bg);
  color: var(--app-selection-text);
  box-shadow: inset 3px 0 0 var(--app-selection-accent);
}

.work-tree-icon--folder {
  color: var(--app-file-folder);
}

.work-tree-icon--text,
.work-tree-icon--other {
  color: var(--app-file-text);
}

.work-tree-icon--image {
  color: var(--app-file-image);
}

.work-tree-icon--audio {
  color: var(--app-accent);
}

.work-tree-item--active .work-tree-icon {
  color: var(--app-selection-text);
}

.work-tree-count {
  color: var(--app-text-secondary);
  font-variant-numeric: tabular-nums;
}

.work-tree-item--active .work-tree-count {
  color: inherit;
  opacity: 0.72;
}
</style>
