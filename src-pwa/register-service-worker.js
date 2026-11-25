import { register } from 'register-service-worker'
import { Notify } from 'quasar'
import { NOTIFICATION_TIMEOUTS } from '../src/utils/notificationTimeouts'

// Quasar writes the generated worker to the root public path. Keep this path
// literal because browsers cannot read SERVICE_WORKER_FILE from process.env.
const SERVICE_WORKER_FILE = '/service-worker.js'

// The PWA dev server does not emit a service worker. Only register the worker
// produced by a production build. Quasar injects DEV in every mode.
if (process.env.DEV !== true) {
  register(SERVICE_WORKER_FILE, {
    ready (/* registration */) {
    },

    registered (/* registration */) {
    },

    cached (/* registration */) {
    },

    updated (/* registration */) {
      Notify.create({
        message: '版本已更新',
        color: 'primary',
        textColor: 'white',
        icon: 'cached',
        actions: [
          {
            label: '刷新',
            color: 'white',
            handler () {
              window.location.reload()
            }
          }
        ],
        multiLine: false,
        timeout: NOTIFICATION_TIMEOUTS.success
      })
    },

    offline () {
    },

    error (/* err */) {
    }
  })
}
