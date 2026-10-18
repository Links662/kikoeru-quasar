import { register } from 'register-service-worker'
import { Notify } from 'quasar'

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

    updatefound (/* registration */) {
      console.log('New content is downloading.')
    },

    updated (/* registration */) {
      console.log('New content is available; please refresh.')
      Notify.create({
        message: '版本已更新',
        color: 'primary',
        textColor: 'white',
        icon: 'cached',
        actions: [
          { label: '刷新', color: 'white' }
        ],
        timeout: 10000,
        onDismiss () {
          location.reload(true)
        }
      })
    },

    offline () {
    },

    error (/* err */) {
    }
  })
}
