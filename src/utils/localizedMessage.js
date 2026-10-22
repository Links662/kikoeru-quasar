const CHINESE_PATTERN = /[\u3400-\u9fff]/

const STATUS_MESSAGES = {
  400: '请求格式不正确，请检查后重试',
  401: '登录状态已失效，请重新登录',
  403: '没有权限执行此操作',
  404: '请求的资源不存在',
  409: '操作发生冲突，请刷新后重试',
  422: '提交的数据格式不正确',
  429: '操作过于频繁，请稍后重试',
  500: '服务器内部错误，请稍后重试',
  502: '服务器暂时不可用，请稍后重试',
  503: '服务暂时不可用，请稍后重试',
  504: '服务器响应超时，请稍后重试'
}

const ENGLISH_MESSAGES = [
  [/^(network error|failed to fetch|load failed)$/i, '网络连接失败，请检查网络或服务器状态'],
  [/^timeout of \d+ms exceeded$/i, '请求超时，请稍后重试'],
  [/^(unauthorized|request failed with status code 401)$/i, STATUS_MESSAGES[401]],
  [/^(forbidden|request failed with status code 403)$/i, STATUS_MESSAGES[403]],
  [/^(not found|request failed with status code 404)$/i, STATUS_MESSAGES[404]],
  [/^(internal server error|request failed with status code 500)$/i, STATUS_MESSAGES[500]],
  [/^(bad gateway|request failed with status code 502)$/i, STATUS_MESSAGES[502]],
  [/^(service unavailable|request failed with status code 503)$/i, STATUS_MESSAGES[503]],
  [/^(gateway timeout|request failed with status code 504)$/i, STATUS_MESSAGES[504]]
]

const statusMessage = (statusCode, fallback) => {
  return STATUS_MESSAGES[Number(statusCode)] || fallback
}

export const localizeMessage = (value, fallback = '请求失败，请稍后重试') => {
  const message = value instanceof Error ? value.message : String(value || '').trim()
  if (!message) return fallback
  if (CHINESE_PATTERN.test(message)) return message

  for (let i = 0; i < ENGLISH_MESSAGES.length; i += 1) {
    const [pattern, localized] = ENGLISH_MESSAGES[i]
    if (pattern.test(message)) return localized
  }

  const statusMatch = message.match(/\b([45]\d{2})\b/)
  if (statusMatch) return statusMessage(statusMatch[1], fallback)

  return fallback
}

export const getRequestErrorMessage = (error, fallback = '请求失败，请稍后重试') => {
  const response = error && error.response
  if (!response) return localizeMessage(error, fallback)

  const data = response.data || {}
  const serverMessage = data.error ||
    data.message ||
    (Array.isArray(data.errors) && data.errors[0] && data.errors[0].msg)

  if (serverMessage) {
    return localizeMessage(serverMessage, statusMessage(response.status, fallback))
  }

  return localizeMessage(response.statusText, statusMessage(response.status, fallback))
}
