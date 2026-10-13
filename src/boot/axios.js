import axios from 'axios'
import { LocalStorage } from 'quasar'

// 统一写进 headers.common：axios 0.x/1.x 都保证会带上，写在 headers 顶层只是巧合生效
axios.defaults.headers.common['Content-Type'] = "application/json"
// 从 LocalStorage 中读取 token
axios.defaults.headers.common['Authorization'] = LocalStorage.getItem('jwt-token') ? 'Bearer ' + LocalStorage.getItem('jwt-token') : ''

export function setAxiosHeaders (token) {
  axios.defaults.headers.common['Authorization'] = 'Bearer ' + token
}

export default ({ app }) => {
  app.config.globalProperties.$axios = axios
}
