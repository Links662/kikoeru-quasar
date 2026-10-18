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
          <WorkRating
            :metadata="metadata"
            show-review-count
            show-link
          />
        </div>
      </div>

      <div v-show="metadata.title" class="q-px-xs q-mt-xs">
        <span class="text-weight-medium text-h6 text-red">{{ metadata.price }} 日元</span>
        <span class="q-ml-sm">售出数: {{ metadata.dl_count }}</span>
        <span v-if="!metadata.nsfw" class="q-ml-sm all-ages-badge">全年龄</span>
        <span v-if="metadata.subtitle === true" class="q-ml-sm subtitle-badge">有字幕</span>
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
    showTags () {
      const tags = this.metadata.tags
      return Array.isArray(tags) && tags.length > 0 && tags[0].name !== null
    }
  }
}
</script>

<style lang="scss" scoped>
.all-ages-badge {
  background: #e6f7d6;
  color: #56842a;
}

.subtitle-badge {
  background: #e3f2fd;
  color: #1565c0;
}
</style>
