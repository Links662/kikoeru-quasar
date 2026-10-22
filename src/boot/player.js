import { Notify } from 'quasar'
import AudioEngine, { setAudioEngine } from '../services/AudioEngine'
import { getRequestErrorMessage, localizeMessage } from '../utils/localizedMessage'

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
          timeout: 5000
        })
      },
      warn (message) {
        Notify.create({
          message: localizeMessage(message, '请注意操作结果'),
          color: 'warning',
          icon: 'warning'
        })
      },
      error (message) {
        Notify.create({
          message: getRequestErrorMessage(message),
          color: 'negative',
          icon: 'error'
        })
      }
    }
  })

  engine.init()
  setAudioEngine(engine)
}
