<template>
  <div>
    <CoverSFW :workid="metadata.id" :nsfw="metadata.nsfw" :release="metadata.release" class="work-cover non-selectable" copyable />

    <div class="q-px-sm q-pt-xs q-pb-sm">
      <div class="q-px-xs">
        <div class="text-h6 text-weight-regular">
          {{ metadata.title }}
        </div>

        <div class="q-mt-xs text-subtitle1 text-weight-regular">
          <router-link
            :to="workConditionLink($route, 'circle', metadata.circle.id)"
            class="text-grey"
            @click="handleWorkConditionClick($event, $route, 'circle', metadata.circle.id)"
          >
            {{ metadata.circle.name }}
          </router-link>
        </div>

        <WorkRating
          :metadata="metadata"
          size="sm"
          show-review-count
          show-rating-distribution
          show-rank
          class="q-mt-xs"
        />
      </div>

      <div v-if="metadata.price != null" class="row no-wrap items-baseline text-no-wrap q-px-xs q-mt-sm">
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

      <div class="q-mt-sm" v-if="showTagRow">
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

      <div class="q-mt-sm" v-if="metadata.vas && metadata.vas.length">
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

      <UserWorkRecord
        :work-id="metadata.id"
        :metadata="metadata"
        variant="detail"
        class="q-mt-sm q-ml-xs"
      />
    </div>
  </div>
</template>

<script>
import CoverSFW from 'components/CoverSFW'
import UserWorkRecord from './UserWorkRecord'
import WorkRating from './WorkRating'
import { formatDlsiteUrl } from '../utils/rjCode'
import WorkConditionLinks from '../mixins/WorkConditionLinks'

export default {
  name: 'WorkDetails',

  mixins: [WorkConditionLinks],

  components: {
    CoverSFW,
    UserWorkRecord,
    WorkRating
  },

  props: {
    metadata: {
      type: Object,
      required: true
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
// 详情面板里封面紧贴右侧把手，按住把手时鼠标/手指常常落到封面上。
// 封面本身（q-img 内部是带背景图的 div）会被浏览器当作可选择内容：
// 以它为锚点开始拖选，选区扫过封面和正文，拖动/复制时就成了“复制封面图片”。
// 封面没有需要选中的文字，直接让它不参与选择、拖拽和长按菜单。
.work-cover {
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
}

</style>
