<template>
  <q-item clickable :to="`/work/${metadata.id}`" class="bg-white q-pa-xs">
    <q-item-section avatar class="q-pr-xs">
      <router-link :to="`/work/${metadata.id}`">
        <q-img fit="contain" :src="coverUrl" :img-class="metadata.nsfw ? 'cover-mask' : ''" class="list-cover" />
      </router-link>
    </q-item-section>

    <q-item-section>
      <q-item-label lines="2" class="text">
        <router-link :to="`/work/${metadata.id}`" class="text-black">
          {{ metadata.title }}
        </router-link>
      </q-item-label>

      <q-item-label>
        <div class="row q-gutter-x-sm q-gutter-y-xs">
          <router-link :to="`/works?circleId=${metadata.circle.id}`" class="col-auto text-grey">
            {{ metadata.circle.name }}
          </router-link>

          <span class="col-auto">/</span>

          <router-link
            v-for="(va, index) in metadata.vas"
            :to="`/works?vaId=${va.id}`"
            :key=index
            class="col-auto text-primary"
          >
            {{ va.name }}
          </router-link>
        </div>
      </q-item-label>

      <q-item-label v-if="showLabel">
        <div class="row q-gutter-x-sm q-gutter-y-xs">
          <router-link
            v-for="(tag, index) in metadata.tags"
            :to="`/works?tagId=${tag.id}`"
            :key=index
            class="col-auto text-grey"
          >
            {{ tag.name }}
          </router-link>
        </div>
      </q-item-label>
    </q-item-section>
  </q-item>   
</template>

<script>

export default {
  name: 'WorkListItem',

  props: {
    metadata: {
      type: Object,
      required: true
    },
    showLabel: {
      type: Boolean,
      default: true
    },
  },

  computed: {
    // 列表小图用 sam：它是原图的等比缩略图（保留原图比例），
    // 配合上面的 contain，正方形封面正好铺满、其它比例上下留白，不会裁掉两侧
    coverUrl () {
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      return this.metadata.id ? `/api/cover/${this.metadata.id}?type=sam&token=${token}` : ""
    },
  }
}
</script>

<style lang="scss" scoped>
// 列表条目的封面缩略图尺寸固定，行高才不会随封面比例变化。
// sam 保留原图比例：正方形封面正好铺满，其它比例用 contain 上下留白
// （默认的 cover 会裁掉左右两侧）
.list-cover {
  height: 60px;
  width: 60px;
}
</style>
