<template>
  <router-view />
</template>

<script>
import { Dark } from 'quasar'
import { updateThemeColor } from './services/theme'

export default {
  name: 'App',

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
