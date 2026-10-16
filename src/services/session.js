import { LocalStorage } from 'quasar'

import { setAxiosHeaders } from 'boot/axios'
import { audioEngine } from './AudioEngine'

/**
 * 结束当前会话：停播、删掉本地 token、清 axios 头、断开管理后台 socket，回到登录页。
 *
 * 前端所有退登路径都走这里：主动登出、改自己的密码、账号被禁用 / 删除、以及任何请求
 * 返回 401（token 失效、账号被删除）。后几种情况下本地还留着一个服务端已经不接受的
 * token，页面看起来却仍是「已登录」，所以必须一起清掉。
 *
 * @param {Object} vm Vue 组件实例，用来拿 $router / $socket
 * @returns {Boolean} 这次调用之前本地是否还留着会话
 *                    （禁用账号时后端会先断开 socket，socket 的 disconnect 事件和接口
 *                     响应几乎同时到，调用方靠这个返回值去重，避免重复弹提示）
 */
export function endSession (vm) {
  const wasLoggedIn = (LocalStorage.getItem('jwt-token') || '') !== ''

  // 认证边界：显式停播（播放引擎已和路由解耦，不再有「离开布局顺带销毁播放器」这种副作用）
  const engine = audioEngine()
  if (engine) engine.stop()

  try {
    LocalStorage.set('jwt-token', '')
  } catch (err) {
    // Web Storage 写失败（无痕模式等）：别把异常抛进点击 / 事件回调里
    console.error(err)
  }
  setAxiosHeaders('')

  // socket 连接也是带着 token 建立的，一并断开
  if (vm && vm.$socket) vm.$socket.close()
  if (vm && vm.$router) vm.$router.push('/login')

  return wasLoggedIn
}
