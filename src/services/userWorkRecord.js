import { reactive } from 'vue'

export const PROGRESS_OPTIONS = Object.freeze([
  { label: '想听', value: 'marked' },
  { label: '在听', value: 'listening' },
  { label: '听过', value: 'listened' },
  { label: '重听', value: 'replay' },
  { label: '搁置', value: 'postponed' }
])

// 同一个作品可能同时显示在详情面板、作品卡片和进度页。
// 所有实例共用这一份记录，避免各自维护本地副本。
const userWorkRecords = reactive({})

const USER_WORK_RECORD_FIELDS = ['rating', 'progress', 'reviewText', 'updatedAt']
const recordKey = (workId) => String(workId)
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key)
const createUserWorkRecord = () => ({
  rating: 0,
  progress: '',
  reviewText: '',
  updatedAt: ''
})

export const hydrateUserWorkRecord = (workId, metadata = {}) => {
  const key = recordKey(workId)
  const record = userWorkRecords[key] || (userWorkRecords[key] = createUserWorkRecord())

  // 只合并实际存在的字段，避免详情面板的占位 metadata 清空已有记录。
  if (!metadata || typeof metadata !== 'object') return record

  USER_WORK_RECORD_FIELDS.forEach((field) => {
    const value = metadata[field]
    if (!hasOwn(metadata, field) || value === undefined) return

    if (field === 'rating') {
      const rating = Number(value)
      record.rating = Number.isFinite(rating) ? rating : 0
    } else {
      record[field] = value || ''
    }
  })

  return record
}

export const getUserWorkRecord = (workId) => {
  return hydrateUserWorkRecord(workId)
}

export const peekUserWorkRecord = (workId) => {
  const key = recordKey(workId)
  return userWorkRecords[key] || null
}

export const updateUserWorkRecord = (workId, patch) => {
  const record = getUserWorkRecord(workId)
  Object.keys(patch).forEach((field) => {
    if (hasOwn(record, field)) {
      record[field] = patch[field]
    }
  })
  return record
}

export const clearUserWorkRecord = (workId) => {
  const record = getUserWorkRecord(workId)
  Object.assign(record, createUserWorkRecord())
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
      reviewText: record.reviewText,
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
