import Vue from 'vue'
import VueSocketIO from 'vue-socket.io'

const BACKEND_URL = process.env.NODE_ENV === 'production'
  ? window.location.origin
  : 'http://localhost:8888'

Vue.use(new VueSocketIO({
  debug: false,
  connection: BACKEND_URL,
  options: {
    autoConnect: false,
    // 顺序很重要：engine.io-client 只在 createTransport 抛错时才会 shift 到下一个
    // transport，websocket 连不上（被代理/防火墙拦截）只会 emit error 然后断开，
    // 不会自动降级。所以想拿到"websocket 不可用时退回轮询"，必须让 polling 排在前面：
    // 先用 XHR 长轮询连上，再 probe 升级到 websocket；升级失败只丢 upgradeError，
    // 连接继续跑在 polling 上。
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 1000,
    timeout: 10000,
    query: {
      auth_token: ''
    }
  }
}))
