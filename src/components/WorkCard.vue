<template>
  <q-card>
    <router-link :to="`/work/${metadata.id}`">
      <CoverSFW :workid="metadata.id" :nsfw="metadata.nsfw" :release="metadata.release" />
    </router-link>

    <q-separator />

    <div v-if="!thumbnailMode" class="q-px-sm q-py-xs">
      <div class="q-px-xs">
        <div class="text-h6 text-weight-regular ellipsis-2-lines">
          <router-link :to="`/work/${metadata.id}`" class="text-black">
            {{ metadata.title }}
          </router-link>
        </div>

        <div class="q-mt-xs text-subtitle1 text-weight-regular ellipsis">
          <router-link :to="`/works?circleId=${metadata.circle.id}`" class="text-grey">
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

      <div
        v-if="!metadata.nsfw || metadata.subtitle === true"
        class="row no-wrap items-center q-gutter-xs q-px-xs q-mt-xs"
      >
        <q-badge v-if="!metadata.nsfw" color="light-green-2" text-color="light-green-9" label="全年龄" />
        <q-badge v-if="metadata.subtitle === true" color="blue-1" text-color="blue-9" label="有字幕" />
      </div>

      <div class="q-mt-xs" v-if="showTags">
        <router-link v-for="tag in metadata.tags" :to="`/works?tagId=${tag.id}`" :key="tag.id">
          <q-chip size="md" class="shadow-2">
            {{ tag.name }}
          </q-chip>
        </router-link>
      </div>

      <div class="q-mt-xs">
        <router-link v-for="va in metadata.vas" :to="`/works?vaId=${va.id}`" :key="va.id">
          <q-chip square size="md" class="shadow-2" color="teal" text-color="white">
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

export default {
  name: 'WorkCard',

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
    }
  }
}
</script>
