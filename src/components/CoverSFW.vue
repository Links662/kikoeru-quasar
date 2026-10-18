<template>
  <q-img
    :src="coverUrl"
    :ratio="4/3"
    :img-class="nsfw ? 'cover-mask' : ''"
    class="cover-sfw"
  >
    <!-- 封面叠层默认被 Quasar 的 `.q-img__content > div` 撑了 16px 内边距，
         叠加内容统一放在 transparent no-padding 包装层里 -->
    <div class="absolute-top-left transparent no-padding">
      <q-chip
        dense
        square
        color="brown"
        text-color="white"
        class="q-ma-sm"
        :clickable="copyable"
        v-on="copyListeners"
      >
        {{ rjText }}

        <!-- 触屏点按也会闪一下 tooltip，所以只在鼠标设备上提示 -->
        <q-tooltip v-if="copyable && !hasTouch">
          点击复制 RJ 号
        </q-tooltip>
      </q-chip>
    </div>

    <div v-if="release" class="absolute-bottom-right transparent no-padding">
      <q-badge color="brown" text-color="white" class="cover-meta-badge q-ma-xs">
        {{ release }}
      </q-badge>
    </div>
  </q-img>
</template>

<script>
import { copyToClipboard } from 'quasar'
import NotifyMixin from '../mixins/Notification.js'
import { formatRJLabel } from '../utils/rjCode'

export default {
  name: 'CoverSFW',

  mixins: [NotifyMixin],

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
    },

    // 只有作品详情面板会打开它：列表页的封面套在 router-link 里，点一下会顺带跳转
    copyable: {
      type: Boolean,
      default: false
    }
  },

  computed: {
    coverUrl () {
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      return this.workid ? `/api/cover/${this.workid}?token=${token}` : ""
    },

    // 角标上显示的和复制出去的是同一份文本，别在两处各拼一次
    rjText () {
      return this.workid ? formatRJLabel(this.workid) : ''
    },

    hasTouch () {
      return this.$q.platform.has.touch === true
    },

    // 角标只有详情面板里能点：列表页的角标本来就活在 router-link 里，
    // 点上要照旧跳作品页，所以监听是挂着 copyable 才装的
    copyListeners () {
      return this.copyable
        ? { click: this.copyRjcode, keydown: this.onRjcodeKeydown }
        : {}
    }
  },

  methods: {
    copyRjcode () {
      if (!this.copyable) return

      const text = this.rjText

      // 自建服务多半跑在 http 上，非安全上下文里 navigator.clipboard 是 undefined；
      // Quasar 这个工具函数会退回 textarea + execCommand，两种环境都能复制
      copyToClipboard(text)
        .then(() => this.showSuccNotif(`已复制 ${text}`))
        .catch(() => this.showErrNotif(`复制失败，RJ 号：${text}`))
    },

    // QChip 自带 role="button" + tabindex，键盘也得能按下去
    onRjcodeKeydown (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return

      event.preventDefault() // 空格默认会滚页面
      this.copyRjcode()
    }
  }
}
</script>

<style lang="scss" scoped>
// 封面比正文宽时不要撑满整行
.cover-sfw {
  max-width: 560px;
}

</style>
