import { getRequestErrorMessage, localizeMessage } from '../utils/localizedMessage'
import { NOTIFICATION_TIMEOUTS } from '../utils/notificationTimeouts'

export default {
  methods: {
    showSuccNotif (message) {
      this.$q.notify({
        message: localizeMessage(message, '操作成功'),
        color: 'positive',
        icon: 'done',
        timeout: NOTIFICATION_TIMEOUTS.success
      })
    },

    showWarnNotif (message) {
      this.$q.notify({
        message: localizeMessage(message, '请注意操作结果'),
        color: 'warning',
        icon: 'warning',
        timeout: NOTIFICATION_TIMEOUTS.warn
      })
    },

    showErrNotif (message) {
      this.$q.notify({
        message: getRequestErrorMessage(message),
        color: 'app-danger-fill',
        icon: 'error',
        timeout: NOTIFICATION_TIMEOUTS.error
      })
    }
  }
}
