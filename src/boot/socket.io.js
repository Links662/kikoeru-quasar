import { io } from 'socket.io-client'

const BACKEND_URL = process.env.NODE_ENV === 'production'
  ? window.location.origin
  : 'http://localhost:8888'

/*
 * 前后端 socket.io 必须同大版本：客户端 v4 配后端 socket.io@4（Engine.IO v4 协议）。
 * 服务端认证失败的拒绝会以 'connect_error' 事件下发（v2 时代是 'error'），
 * 相关处理见 DashboardLayout.vue。
 */
export const socket = io(BACKEND_URL, {
  autoConnect: false,
  // 顺序很重要：engine.io-client 只在 createTransport 抛错时才会 shift 到下一个
  // transport；websocket 连不上（被代理/防火墙拦截）只会 emit error 然后断开，
  // 不会自动降级。所以想让"websocket 不可用时退回轮询"，必须让 polling 排在前面：
  // 先用 XHR 长轮询连上，再 probe 升级到 websocket；升级失败只是 upgradeError，
  // 连接继续跑在 polling 上。
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: 3,
  reconnectionDelay: 1000,
  timeout: 10000,
  query: {
    auth_token: ''
  }
})

/*
 * 组件里继续用 `sockets: { EVENT (payload) {} }` 声明监听，和原来的 vue-socket.io
 * 用法一致，所以各组件不需要改动。
 */
function bindSocketListeners (vm) {
  const handlers = vm.$options.sockets
  if (!handlers) return

  const bound = (vm.__socketHandlers = [])
  for (const event of Object.keys(handlers)) {
    const handler = handlers[event].bind(vm)
    socket.on(event, handler)
    bound.push([event, handler])
  }
}

function unbindSocketListeners (vm) {
  if (!vm.__socketHandlers) return
  for (const [event, handler] of vm.__socketHandlers) {
    socket.off(event, handler)
  }
  delete vm.__socketHandlers
}

export default ({ app }) => {
  app.config.globalProperties.$socket = socket

  app.mixin({
    created () {
      bindSocketListeners(this)
    },
    beforeUnmount () {
      unbindSocketListeners(this)
    }
  })
}
