<template>
  <q-card bordered flat class="app-cover-card work-card overflow-hidden">
    <router-link :to="`/work/${metadata.id}`">
      <CoverSFW :workid="metadata.id" :nsfw="metadata.nsfw" :release="metadata.release" />
    </router-link>


    <div v-if="!thumbnailMode" class="q-px-sm q-py-xs">
      <div class="q-px-xs">
        <div class="text-h6 text-weight-regular ellipsis-2-lines">
          <router-link :to="`/work/${metadata.id}`" class="app-text">
            {{ metadata.title }}
          </router-link>
        </div>

        <div class="q-mt-xs text-subtitle1 text-weight-regular ellipsis">
          <router-link
            :to="workConditionLink($route, 'circle', metadata.circle.id)"
            class="text-grey"
            @click="handleWorkConditionClick($event, $route, 'circle', metadata.circle.id)"
          >
            {{ metadata.circle.name }}
          </router-link>
        </div>

        <div v-show="metadata.title" class="q-mt-xs">
          <WorkRating :metadata="metadata" show-review-count/>
        </div>
      </div>

      <div v-show="metadata.title" class="row no-wrap items-baseline text-no-wrap q-px-xs q-mt-xs">
        <span class="text-body1 text-weight-medium text-red">{{ metadata.price }} 日元</span>
        <span class="q-ml-sm text-body2 text-grey">({{ metadata.dl_count }})</span>
        <a
          v-if="dlsiteUrl"
          class="q-ml-sm text-body2 text-no-wrap text-blue"
          :href="dlsiteUrl"
          rel="noreferrer noopener"
          target="_blank"
        >
          <q-icon name="launch" size="xs" />
          <span class="q-ml-xs">DLsite</span>
        </a>
      </div>

      <div class="q-mt-xs" v-if="showTagRow">
        <q-chip v-if="!metadata.nsfw" size="md" class="app-work-chip app-work-chip--age">
          全年龄
        </q-chip>
        <q-chip v-if="metadata.subtitle === true" size="md" class="app-work-chip app-work-chip--subtitle">
          中文字幕
        </q-chip>
        <router-link
          v-for="tag in metadata.tags"
          :to="workConditionLink($route, 'tag', tag.id)"
          :key="tag.id"
          @click="handleWorkConditionClick($event, $route, 'tag', tag.id)"
        >
          <q-chip size="md" class="app-work-chip app-work-chip--tag">
            {{ tag.name }}
          </q-chip>
        </router-link>
      </div>

      <div class="q-mt-xs">
        <router-link
          v-for="va in metadata.vas"
          :to="workConditionLink($route, 'va', va.id)"
          :key="va.id"
          @click="handleWorkConditionClick($event, $route, 'va', va.id)"
        >
          <q-chip size="md" class="app-work-chip app-work-chip--voice">
            {{ va.name }}
          </q-chip>
        </router-link>
      </div>
    </div>
  </q-card>
</template>

<script>
import CoverSFW from 'components/CoverSFW'
import WorkRating from './WorkRating'
import { formatDlsiteUrl } from '../utils/rjCode'
import WorkConditionLinks from '../mixins/WorkConditionLinks'

export default {
  name: 'WorkCard',

  mixins: [WorkConditionLinks],

  components: {
    CoverSFW,
    WorkRating
  },

  props: {
    metadata: {
      type: Object,
      required: true
    },
    thumbnailMode: {
      type: Boolean,
      default: false
    }
  },

  computed: {
    dlsiteUrl () {
      return this.metadata.id ? formatDlsiteUrl(this.metadata.id) : ''
    },

    showTags () {
      const tags = this.metadata.tags
      return Array.isArray(tags) && tags.length > 0 && tags[0].name !== null
    },

    showTagRow () {
      return !this.metadata.nsfw || this.metadata.subtitle === true || this.showTags
    }
  }
}
</script>

<style lang="scss" scoped>
.work-card {
  transition: transform 160ms ease-out, box-shadow 160ms ease-out;
}

@media (hover: hover) and (pointer: fine) {
  .work-card:hover,
  .work-card:focus-within {
    transform: translateY(-2px);
    box-shadow: 0 2px 4px -1px var(--app-shadow);
  }
}
</style>
