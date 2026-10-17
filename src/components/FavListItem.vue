<template>
  <q-item class="row bg-white">
    <q-item-section class="col-auto" top>
      <router-link :to="`/work/${metadata.id}`">
        <q-img
          fit="contain"
          :src="coverUrl"
          :img-class="metadata.nsfw ? 'cover-mask' : ''"
          class="fav-cover"
        />
      </router-link>
    </q-item-section>

    <q-item-section class="q-gutter-y-sm column items-start" top>
      <q-item-label lines="2" class="text-body2">
        <router-link :to="`/work/${metadata.id}`" class="col-auto text-black">
          {{ metadata.title }}
        </router-link>
      </q-item-label>

      <div class="row q-gutter-x-sm col-auto">
        <router-link :to="`/works?circleId=${metadata.circle.id}`" class="col-auto text-grey">
          {{ metadata.circle.name }}
        </router-link>

        <span class="col-auto">/</span>
        <span class="col-auto text-grey">{{ metadata.release }}</span>
        <span class="col-auto">/</span>

        <router-link
          v-for="va in metadata.vas"
          :key="va.id"
          :to="`/works?vaId=${va.id}`"
          class="col-auto text-primary"
        >
          {{ va.name }}
        </router-link>
      </div>

      <UserWorkRecord
        :work-id="workid"
        :metadata="metadata"
        variant="row"
        class="full-width"
        @progress-changed="$emit('deleteItem', workid)"
      />
    </q-item-section>
  </q-item>
</template>

<script>
import UserWorkRecord from './UserWorkRecord'

export default {
  name: 'FavListItem',

  components: {
    UserWorkRecord
  },

  props: {
    workid: {
      type: Number,
      required: true
    },
    metadata: {
      type: Object,
      required: true
    }
  },

  computed: {
    coverUrl () {
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      return this.workid ? `/api/cover/${this.workid}?type=240x240&token=${token}` : ''
    }
  }
}
</script>

<style lang="scss" scoped>
// 收藏条目的封面缩略图尺寸固定，行高才不会随封面比例变化。
// 这里 160x120 与 4:3 缩略图比例一致，本来就不会裁；
// 用 contain 是为了和其他几处保持一致，也防止以后换成别的比例的封面
.fav-cover {
  height: 120px;
  width: 160px;
}
</style>
