<template>
  <router-view />
</template>

<script>
import { Dark } from 'quasar'
import { updateThemeColor } from './services/theme'

export default {
  name: 'App',

  watch: {
    // 任何真实路由跳转都先收起展开的播放器，避免它继续覆盖新页面
    $route (to, from) {
      if (to.fullPath !== from.fullPath) {
        this.$store.commit('AudioPlayer/SET_HIDE', true)
        this.$store.commit('WorkPanel/CLOSE')
      }
    }
  },

  created () {
    this.unwatchTheme = this.$watch(
      () => Dark.isActive,
      updateThemeColor,
      { immediate: true }
    )
  },

  beforeUnmount () {
    this.unwatchTheme()
  }
}
</script>
