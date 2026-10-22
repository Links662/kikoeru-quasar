export default {
  methods: {
    showSuccNotif (message) {
      this.$q.notify({
        message,
        color: 'positive',
        icon: 'done',
        timeout: 2000
      })
    },

    showWarnNotif (message) {
      this.$q.notify({
        message,
        color: 'warning',
        icon: 'warning',
        timeout: 5000
      })
    },

    showErrNotif (message) {
      this.$q.notify({
        message,
        color: 'negative',
        icon: 'error',
        timeout: 0
      })
    }
  }
}
