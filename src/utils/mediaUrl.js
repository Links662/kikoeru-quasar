const RELATIVE_BASE_URL = 'http://kikoeru.local'

const isAbsoluteUrl = url => /^[a-z][a-z\d+.-]*:/i.test(url)
const isProtocolRelativeUrl = url => url.startsWith('//')

export function addQueryParams (url, params = {}) {
  if (!url) return ''

  const isAbsolute = isAbsoluteUrl(url)
  const isProtocolRelative = isProtocolRelativeUrl(url)
  const parsedUrl = new URL(url, RELATIVE_BASE_URL)

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    parsedUrl.searchParams.set(key, String(value))
  })

  if (isAbsolute) return parsedUrl.href

  const path = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
  return isProtocolRelative ? `//${parsedUrl.host}${path}` : path
}

export function buildMediaUrl (url, token, params = {}) {
  return addQueryParams(url, {
    ...params,
    token
  })
}

export function buildCoverUrl (workId, token, type) {
  if (!workId) return ''

  const params = type ? { type } : {}
  return buildMediaUrl(`/api/cover/${workId}`, token, params)
}
