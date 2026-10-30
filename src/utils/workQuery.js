const CONDITION_CONFIG = {
  circle: {
    queryKey: 'circleIds'
  },
  tag: {
    queryKey: 'tagIds'
  },
  va: {
    queryKey: 'vaIds'
  }
}

export const MAX_CONDITIONS_PER_TYPE = 10
export const MAX_TOTAL_CONDITIONS = 20
export const MAX_WORK_QUERY_LENGTH = 3500

const parseIds = (...values) => {
  const ids = values
    .flatMap(value => Array.isArray(value) ? value : [value])
    .flatMap(value => String(value || '').split(','))
    .map(value => value.trim())
    .filter(Boolean)
  return [...new Set(ids)]
}

export const readWorkConditions = (query = {}) => ({
  circleIds: parseIds(query.circleIds),
  tagIds: parseIds(query.tagIds),
  vaIds: parseIds(query.vaIds),
  keyword: typeof query.keyword === 'string' ? query.keyword.trim() : ''
})

export const hasWorkConditions = conditions => (
  conditions.circleIds.length > 0 ||
  conditions.tagIds.length > 0 ||
  conditions.vaIds.length > 0 ||
  conditions.keyword !== ''
)

export const getWorkConditionParams = conditions => {
  const params = {}
  Object.values(CONDITION_CONFIG).forEach(config => {
    const ids = conditions[config.queryKey]
    if (ids.length) params[config.queryKey] = ids.join(',')
  })
  if (conditions.keyword) params.keyword = conditions.keyword
  return params
}

const writeWorkConditions = (query, conditions) => {
  const next = {}
  if (query.focusSearch !== undefined) next.focusSearch = query.focusSearch

  Object.values(CONDITION_CONFIG).forEach(config => {
    delete next[config.queryKey]
    if (conditions[config.queryKey].length) {
      next[config.queryKey] = conditions[config.queryKey].join(',')
    }
  })

  delete next.keyword
  if (conditions.keyword) next.keyword = conditions.keyword
  return next
}

const getConditionCount = conditions => (
  conditions.circleIds.length +
  conditions.tagIds.length +
  conditions.vaIds.length +
  (conditions.keyword ? 1 : 0)
)

const getQueryLength = query => {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value]
    values.forEach(item => {
      if (item !== undefined && item !== null) params.append(key, String(item))
    })
  })
  return params.toString().length
}

const getConditionAddition = (query, type, id) => {
  const config = CONDITION_CONFIG[type]
  if (!config || id === undefined || id === null || String(id) === '') {
    return { allowed: false, message: '无效的筛选条件', query }
  }

  const conditions = readWorkConditions(query)
  const value = String(id)
  if (conditions[config.queryKey].includes(value)) {
    return { allowed: true, query, unchanged: true }
  }

  if (conditions[config.queryKey].length >= MAX_CONDITIONS_PER_TYPE) {
    return {
      allowed: false,
      message: `每类条件最多选择 ${MAX_CONDITIONS_PER_TYPE} 个`,
      query
    }
  }
  if (getConditionCount(conditions) >= MAX_TOTAL_CONDITIONS) {
    return {
      allowed: false,
      message: `最多同时选择 ${MAX_TOTAL_CONDITIONS} 个筛选条件`,
      query
    }
  }

  conditions[config.queryKey].push(value)
  const nextQuery = writeWorkConditions(query, conditions)
  if (getQueryLength(nextQuery) > MAX_WORK_QUERY_LENGTH) {
    return {
      allowed: false,
      message: '筛选条件过多，请先移除部分条件',
      query
    }
  }

  return { allowed: true, query: nextQuery }
}

export const setWorkKeywordResult = (query, value) => {
  const conditions = readWorkConditions(query)
  const keyword = String(value || '').trim()

  if (!conditions.keyword && keyword && getConditionCount(conditions) >= MAX_TOTAL_CONDITIONS) {
    return {
      allowed: false,
      message: `最多同时选择 ${MAX_TOTAL_CONDITIONS} 个筛选条件`,
      query
    }
  }

  conditions.keyword = keyword
  const nextQuery = writeWorkConditions(query, conditions)
  if (getQueryLength(nextQuery) > MAX_WORK_QUERY_LENGTH) {
    return {
      allowed: false,
      message: '筛选条件过多，请先移除部分条件',
      query
    }
  }
  return { allowed: true, query: nextQuery }
}

export const removeWorkCondition = (query, type, id) => {
  const conditions = readWorkConditions(query)
  if (type === 'keyword') {
    conditions.keyword = ''
  } else if (CONDITION_CONFIG[type]) {
    conditions[CONDITION_CONFIG[type].queryKey] = conditions[CONDITION_CONFIG[type].queryKey]
      .filter(value => value !== String(id))
  }
  return writeWorkConditions(query, conditions)
}

export const clearWorkConditions = query => {
  const conditions = readWorkConditions(query)
  conditions.circleIds = []
  conditions.tagIds = []
  conditions.vaIds = []
  conditions.keyword = ''
  return writeWorkConditions(query, conditions)
}

// 在作品筛选页内点击条件时累积；从其他页面进入时仍从单条件开始。
export const getWorkConditionLinkResult = (route, type, id) => {
  const config = CONDITION_CONFIG[type]
  if (!config) {
    return {
      allowed: false,
      message: '无效的筛选条件',
      link: { path: '/works' }
    }
  }
  if (route && route.name === 'works') {
    const result = getConditionAddition(route.query, type, id)
    return {
      allowed: result.allowed,
      message: result.message,
      link: {
        path: '/works',
        query: result.query
      }
    }
  }
  return {
    allowed: true,
    link: {
      path: '/works',
      query: { [config.queryKey]: String(id) }
    }
  }
}

export const workConditionLink = (route, type, id) => (
  getWorkConditionLinkResult(route, type, id).link
)
