import Vue from 'vue'
import VueRouter from 'vue-router'

import routes from './routes'

Vue.use(VueRouter)

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default function ({ store } /* { store, ssrContext } */) {
  const Router = new VueRouter({
    scrollBehavior(to, from, savedPosition) {
      if (savedPosition) {
        return savedPosition
      } else {
        return { x: 0, y: 0 }
      }
    },
    routes,

    // Leave these as they are and change in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    mode: process.env.VUE_ROUTER_MODE,
    base: process.env.VUE_ROUTER_BASE
  })

  /*
   * 作品详情不再跳转到独立页面，而是在当前页面上打开详情面板。
   * 所有指向 /work/:id 的 router-link / push 都会在这里被截获：
   *   - 应用内点击：取消跳转（URL 和列表状态保持原样），只打开面板
   *   - 直接访问（刷新、外链）：回到作品列表，面板浮在列表之上
   * 详情面板自身的关闭、以及面板内的跳转逻辑见 layouts/MainLayout.vue
   */
  Router.beforeEach((to, from, next) => {
    const matched = to.path.match(/^\/work\/(\d+)\/?$/)

    if (matched === null) {
      next()
      return
    }

    store.commit('WorkPanel/OPEN', Number(matched[1]))

    if (from.matched.length === 0) {
      next({ name: 'works', replace: true })
      return
    }

    next(false)
  })

  return Router
}
