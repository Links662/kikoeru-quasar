import { reactive } from 'vue'

export const PROGRESS_OPTIONS = Object.freeze([
  { label: '想听', value: 'marked' },
  { label: '在听', value: 'listening' },
  { label: '听过', value: 'listened' },
  { label: '重听', value: 'replay' },
  { label: '搁置', value: 'postponed' }
])

const normalizeRating = (rating) => {
  const value = Number(rating)
  return Number.isFinite(value) ? value : 0
}

/**
 * 把作品接口里的个人记录字段收敛成前端统一结构。
 * 后端仍使用 rating / progress / review_text，组件只面对这一种形状。
 */
export const normalizeUserWorkRecord = (metadata = {}) => ({
  rating: normalizeRating(metadata.userRating ?? metadata.rating),
  progress: metadata.progress || '',
  reviewText: metadata.review_text ?? metadata.reviewText ?? '',
  updatedAt: metadata.updated_at || ''
})

// 同一个作品可能同时显示在详情面板、作品卡片和进度页。
// 所有实例共用这一份记录，避免各自维护本地副本。
const userWorkRecords = reactive({})

const recordKey = (workId) => String(workId)

export const hydrateUserWorkRecord = (workId, metadata = {}) => {
  const key = recordKey(workId)
  if (!userWorkRecords[key]) {
    userWorkRecords[key] = normalizeUserWorkRecord(metadata)
  }
  return userWorkRecords[key]
}

export const getUserWorkRecord = (workId) => {
  const key = recordKey(workId)
  if (!userWorkRecords[key]) {
    userWorkRecords[key] = normalizeUserWorkRecord()
  }
  return userWorkRecords[key]
}

export const peekUserWorkRecord = (workId) => {
  const key = recordKey(workId)
  return userWorkRecords[key] || null
}

export const updateUserWorkRecord = (workId, patch) => {
  const record = getUserWorkRecord(workId)
  Object.keys(patch).forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      record[field] = patch[field]
    }
  })
  return record
}

export const clearUserWorkRecord = (workId) => {
  const record = getUserWorkRecord(workId)
  Object.assign(record, normalizeUserWorkRecord())
  return record
}

export const getUserWorkRecordErrorMessage = (error) => {
  if (error.response) {
    return error.response.data.error || `${error.response.status} ${error.response.statusText}`
  }
  return error.message || error
}

export const createUserWorkRecordService = (axios) => ({
  updateRating (workId, rating) {
    return axios.put('/api/review', {
      work_id: workId,
      rating
    }, {
      params: { starOnly: true }
    })
  },

  updateProgress (workId, progress) {
    return axios.put('/api/review', {
      work_id: workId,
      progress
    }, {
      params: {
        starOnly: false,
        progressOnly: true
      }
    })
  },

  saveNote (workId, record) {
    return axios.put('/api/review', {
      work_id: workId,
      rating: record.rating,
      review_text: record.reviewText,
      progress: record.progress
    }, {
      params: { starOnly: false }
    })
  },

  remove (workId) {
    return axios.delete('/api/review', {
      params: { work_id: workId }
    })
  }
})
