<template>
  <q-img
    :src="coverUrl"
    :ratio="4/3"
    :img-class="nsfw ? 'cover-mask' : ''"
    class="cover-sfw"
  >
    <!-- 封面叠层默认被 Quasar 的 `.q-img__content > div` 撑了 16px 内边距，
         只有带 !important 的 no-padding 能压掉；下面那层只是内缩 5px -->
    <div class="absolute-top-left transparent no-padding">
      <q-chip dense square color="brown" text-color="white" class="q-ma-sm">
        {{`RJ${rjcode}`}}
      </q-chip>
    </div>

    <div v-if="release" class="absolute-bottom-right cover-meta">
      {{release}}
    </div>
  </q-img>
</template>

<script>
export default {
  name: 'CoverSFW',

  props: {
    workid: {
      type: Number,
      required: true
    },

    nsfw: {
      type: Boolean,
      default: false
    },

    release: {
      type: String,
      default: ''
    }
  },

  computed: {
    coverUrl () {
      // 从 LocalStorage 中读取 token
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      return this.workid ? `/api/cover/${this.workid}?token=${token}` : ""
    },

    rjcode () {
      if (this.workid >= 1000000)
      {
        return (`00000000${this.workid}`).slice(-8)
      } else {
        return (`000000${this.workid}`).slice(-6)
      }
      //return (`000000${this.workid}`).slice(-6)
    }
  }
}
</script>

<style lang="scss" scoped>
// 封面比正文宽时不要撑满整行
.cover-sfw {
  max-width: 560px;
}

// 右下角的发售日：盖过 Quasar 给 `.q-img__content > div` 的 16px 内边距，
// 所以必须是 scoped（多一个属性选择器才比那条规则具体）
.cover-meta {
  padding: 5px;
}
</style>
