<template>
  <div>
    <CoverSFW :workid="metadata.id" :nsfw="metadata.nsfw" :release="metadata.release" class="work-cover non-selectable" copyable />

    <div class="q-px-sm q-pt-xs q-pb-sm">
      <div class="q-px-xs">
        <div class="text-h6 text-weight-regular">
          {{ metadata.title }}
        </div>

        <div class="q-mt-xs text-subtitle1 text-weight-regular">
          <router-link :to="`/works?circleId=${metadata.circle.id}`" class="text-grey">
            {{ metadata.circle.name }}
          </router-link>
        </div>

        <WorkRating
          :metadata="metadata"
          size="sm"
          show-review-count
          show-link
          class="q-mt-xs"
        />
      </div>

      <div v-if="metadata.price != null" class="q-px-xs q-mt-sm">
        <span class="text-weight-medium text-h6 text-red">{{ metadata.price }} 日元</span>
        <span class="q-ml-sm">售出数: {{ metadata.dl_count }}</span>
        <span v-if="!metadata.nsfw" class="q-ml-sm all-ages-badge">全年龄</span>
        <span v-if="metadata.subtitle === true" class="q-ml-sm subtitle-badge">有字幕</span>
      </div>

      <div class="q-mt-sm" v-if="showTags">
        <router-link v-for="tag in metadata.tags" :to="`/works?tagId=${tag.id}`" :key="tag.id">
          <q-chip size="md" class="shadow-4">
            {{ tag.name }}
          </q-chip>
        </router-link>
      </div>

      <div class="q-mt-sm" v-if="metadata.vas && metadata.vas.length">
        <router-link v-for="va in metadata.vas" :to="`/works?vaId=${va.id}`" :key="va.id">
          <q-chip square size="md" class="shadow-4" color="teal" text-color="white">
            {{ va.name }}
          </q-chip>
        </router-link>
      </div>

      <UserWorkRecord
        :work-id="metadata.id"
        :metadata="metadata"
        variant="detail"
        class="q-mt-sm"
      />
    </div>
  </div>
</template>

<script>
import CoverSFW from 'components/CoverSFW'
import UserWorkRecord from './UserWorkRecord'
import WorkRating from './WorkRating'

export default {
  name: 'WorkDetails',

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
    showTags () {
      const tags = this.metadata.tags
      return Array.isArray(tags) && tags.length > 0 && tags[0].name !== null
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
