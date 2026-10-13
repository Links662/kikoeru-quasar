import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'

import routes from './routes'
import { audioEngine } from '../services/AudioEngine'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default function ({ store } /* { store, ssrContext } */) {
  const Router = createRouter({
    scrollBehavior(to, from, savedPosition) {
      if (savedPosition) {
        return savedPosition
      } else {
        return { x: 0, y: 0 }
      }
    },
    routes,

    // Leave these as they are and change in quasar.config.js instead!
    // quasar.config.js -> build -> vueRouterMode
    // quasar.config.js -> build -> publicPath
    history: process.env.VUE_ROUTER_MODE === 'hash'
      ? createWebHashHistory(process.env.VUE_ROUTER_BASE)
      : createWebHistory(process.env.VUE_ROUTER_BASE)
  })

  /*
   * 认证边界：进入登录页（主动登出、token 失效被踢出）时停播并清空播放器状态。
   * 播放引擎与路由解耦后，"离开某个布局"不再顺带停掉播放，
   * 所以这里显式声明"未认证 = 不播放"这条规则。
   */
  Router.beforeEach((to, from, next) => {
    if (to.path === '/login') {
      const engine = audioEngine()
      if (engine) engine.stop()
    }

    next()
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
