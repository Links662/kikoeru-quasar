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
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 1000,
    timeout: 10000,
    query: {
      auth_token: ''
    }
  }
}))