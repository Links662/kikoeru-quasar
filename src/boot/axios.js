import axios from 'axios'
import { LocalStorage } from 'quasar'

// 统一写进 headers.common：axios 0.x/1.x 都保证会带上，写在 headers 顶层只是巧合生效
axios.defaults.headers.common['Content-Type'] = "application/json"
axios.defaults.headers.common['Authorization'] = LocalStorage.getItem('jwt-token') ? 'Bearer ' + LocalStorage.getItem('jwt-token') : ''

/**
 * 写入 / 清除全局 Authorization 头
 * @param {String} token 传空字符串表示当前没有会话，直接摘掉这个头，
 *                       免得留一个 'Bearer ' 空头给服务端
 */
export function setAxiosHeaders (token) {
  if (token) {
    axios.defaults.headers.common['Authorization'] = 'Bearer ' + token
    return
  }

  delete axios.defaults.headers.common['Authorization']
}

export default ({ app }) => {
  app.config.globalProperties.$axios = axios
}
