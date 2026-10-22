import { getRequestErrorMessage, localizeMessage } from '../utils/localizedMessage'

export default {
  methods: {
    showSuccNotif (message) {
      this.$q.notify({
        message: localizeMessage(message, '操作成功'),
        color: 'positive',
        icon: 'done',
        timeout: 2000
      })
    },

    showWarnNotif (message) {
      this.$q.notify({
        message: localizeMessage(message, '请注意操作结果'),
        color: 'warning',
        icon: 'warning',
        timeout: 5000
      })
    },

    showErrNotif (message) {
      this.$q.notify({
        message: getRequestErrorMessage(message),
        color: 'negative',
        icon: 'error',
        timeout: 0
      })
    }
  }
}
