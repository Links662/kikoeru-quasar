import { Notify } from 'quasar'
import AudioEngine, { setAudioEngine } from '../services/AudioEngine'
import { getRequestErrorMessage, localizeMessage } from '../utils/localizedMessage'
import { NOTIFICATION_TIMEOUTS } from '../utils/notificationTimeouts'

export default ({ store }) => {
  // 播放引擎：应用启动时创建一次，之后只由 store 驱动，不随路由/布局销毁
  const engine = new AudioEngine({
    store,
    notify: {
      success (message) {
        Notify.create({
          message: localizeMessage(message, '操作成功'),
          color: 'positive',
          icon: 'done',
          timeout: NOTIFICATION_TIMEOUTS.success
        })
      },
      warn (message) {
        Notify.create({
          message: localizeMessage(message, '请注意操作结果'),
          color: 'warning',
          icon: 'warning',
          timeout: NOTIFICATION_TIMEOUTS.warn
        })
      },
      error (message) {
        Notify.create({
          message: getRequestErrorMessage(message),
          color: 'app-danger-fill',
          icon: 'error',
          timeout: NOTIFICATION_TIMEOUTS.error
        })
      }
    }
  })

  engine.init()
  setAudioEngine(engine)
}
