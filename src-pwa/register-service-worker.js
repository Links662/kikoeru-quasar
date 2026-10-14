import { register } from 'register-service-worker'
import { Notify } from 'quasar'

register(process.env.SERVICE_WORKER_FILE, {
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
