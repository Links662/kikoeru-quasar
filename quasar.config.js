// Configuration for your app
// https://v2.quasar.dev/quasar-cli-webpack/quasar-config-js

const ESLintPlugin = require('eslint-webpack-plugin')

module.exports = function (/* ctx */) {
  return {
    // app boot file (/src/boot)
    // https://v2.quasar.dev/quasar-cli-webpack/boot-files
    boot: [
      'axios',
      'player',
      'socket.io'
    ],

    // https://v2.quasar.dev/quasar-cli-webpack/quasar-config-js#property-css
    css: [
      'app.scss'
    ],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      'roboto-font', // optional, you are not bound to it
      'material-icons' // optional, you are not bound to it
    ],

    // https://v2.quasar.dev/quasar-cli-webpack/quasar-config-js#property-framework
    framework: {
      config: {
        notify: {
          timeout: 5000,
          actions: [
            {
              icon: 'close',
              color: 'white',
              round: true,
              dense: true,
              size: 'sm',
              'aria-label': '关闭通知'
            }
          ]
        }
      },

      iconSet: 'material-icons', // Quasar icon set
      lang: 'zh-CN', // Quasar language pack

      // Possible values for "all":
      // * 'auto' - Auto-import needed Quasar components & directives
      //            (slightly higher compile time; next to minimum bundle size; most convenient)
      // * false  - Manually specify what to import
      //            (fastest compile time; minimum bundle size; most tedious)
      // * true   - Import everything from Quasar
      //            (not treeshaking Quasar; biggest bundle size; convenient)
      all: 'auto',

      components: [],
      directives: [],

      // Quasar plugins
      plugins: [
        'LocalStorage',
        'SessionStorage',
        'Notify'
      ]
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-webpack/quasar-config-js#property-build
    build: {
      vueRouterMode: 'history', // available values: 'hash', 'history'

      // Quasar v1 wired ESLint in through eslint-loader, which does not exist
      // for webpack 5. eslint-webpack-plugin is the replacement.
      extendWebpack (cfg) {
        cfg.plugins.push(new ESLintPlugin({
          extensions: ['js', 'vue'],
          exclude: ['node_modules', 'dist', '.quasar']
        }))
      },

      sourceMap: true
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-webpack/quasar-config-js#property-devserver
    devServer: {
      https: false,
      port: 8080,
      open: true, // opens browser window automatically
      proxy: {
        // https://webpack.js.org/configuration/dev-server/#devserverproxy
        // proxy all requests starting with /api to http://localhost:8888
        '/api': 'http://localhost:8888',
        '/socket.io': {
          target: 'http://localhost:8888',
          ws: true
        },
        '/workbox': 'http://localhost:8888'
      }
    },

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: [],

    // Exposed to /src/index.template.html as template parameters.
    htmlVariables: {
      productName: 'Kikoeru',
      productDescription: '用于收听 DLsite 音声作品的自托管 Web 媒体播放器。'
    },

    // https://v2.quasar.dev/quasar-cli-webpack/developing-ssr/configuring-ssr
    ssr: {
      pwa: false
    },

    // https://v2.quasar.dev/quasar-cli-webpack/developing-pwa/configuring-pwa
    pwa: {
      workboxPluginMode: 'GenerateSW', // 'GenerateSW' or 'InjectManifest'
      workboxOptions: {
        skipWaiting: true,
        clientsClaim: true,
        exclude: [
          /manifest\.json$/,
          /.*.js.map$/
        ],
        // renamed from navigateFallbackBlacklist in Workbox v6
        navigateFallbackDenylist: [
          /^\/api\/.*$/,
          /\/media\/.*$/
        ]
      }, // only for GenerateSW
      manifest: {
        name: 'Kikoeru',
        short_name: 'Kikoeru',
        description: '用于收听 DLsite 音声作品的自托管 Web 媒体播放器。',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#1976D2',
        icons: [
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-256x256.png',
            sizes: '256x256',
            type: 'image/png'
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-webpack/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
      id: 'org.cordova.quasar.kikoeru'
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-webpack/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-webpack/developing-electron-apps/configuring-electron
    electron: {
      bundler: 'builder', // 'packager' or 'builder'

      packager: {},

      builder: {
        appId: 'kikoeru-quasar'
      }
    }
  }
}
