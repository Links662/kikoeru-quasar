import { Notify } from 'quasar'
import AudioEngine, { setAudioEngine } from '../services/AudioEngine'

export default ({ store }) => {
  // 播放引擎：应用启动时创建一次，之后只由 store 驱动，不随路由/布局销毁
  const engine = new AudioEngine({
    store,
    notify: {
      success (message) {
        Notify.create({ message, color: 'positive', icon: 'done', timeout: 5000 })
      },
      warn (message) {
        Notify.create({ message, color: 'warning', icon: 'warning' })
      },
      error (message) {
        Notify.create({ message, color: 'negative', icon: 'bug_report' })
      }
    }
  })

  engine.init()
  setAudioEngine(engine)
}
