import { createStore } from 'vuex'

import AudioPlayer from './module-AudioPlayer'
import User from './module-User'
import WorkPanel from './module-WorkPanel'

export default function () {
  const Store = createStore({
    modules: {
      AudioPlayer,
      User,
      WorkPanel
    },

    // enable strict mode (adds overhead!)
    // for dev mode only
    strict: process.env.DEV
  })

  // webpack 5 no longer exposes `module.hot` inside ES modules; the
  // replacement is the `import.meta.webpackHot` API.
  if (process.env.DEV && import.meta.webpackHot) {
    import.meta.webpackHot.accept('./module-AudioPlayer', () => {
      const newAudioPlayer = require('./module-AudioPlayer').default
      Store.hotUpdate({ modules: { AudioPlayer: newAudioPlayer } })
    })

    import.meta.webpackHot.accept('./module-User', () => {
      const newUser = require('./module-User').default
      Store.hotUpdate({ modules: { User: newUser } })
    })

    import.meta.webpackHot.accept('./module-WorkPanel', () => {
      const newWorkPanel = require('./module-WorkPanel').default
      Store.hotUpdate({ modules: { WorkPanel: newWorkPanel } })
    })
  }

  return Store
}
