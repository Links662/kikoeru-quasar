<template>
  <div
    class="user-work-record"
    :class="{ 'column items-start q-gutter-y-xs': variant === 'row' }"
  >
    <template v-if="variant === 'row'">
      <div class="row items-center">
        <q-rating
          :model-value="record.rating"
          @update:model-value="updateRating"
          size="sm"
          color="grey-6"
          color-selected="amber"
          color-half="amber"
          icon="star_border"
          icon-selected="star"
          icon-half="star_half"
          no-dimming
          class="col-auto app-rating"
          aria-label="我的评分"
        />
      </div>

      <div class="user-work-record__review text-body2 full-width">
        <pre v-if="record.reviewText" class="q-ma-none">{{ record.reviewText }}</pre>
        <pre v-else class="q-ma-none text-grey">暂无评论</pre>
      </div>

      <div class="user-work-record__actions row wrap items-center full-width">
        <q-btn-toggle
          :model-value="record.progress"
          @update:model-value="updateProgress"
          dense
          unelevated
          rounded
          spread
          no-caps
          toggle-color="primary"
          color="white"
          text-color="grey-9"
          class="user-work-record__progress bg-white"
          :options="progressOptions"
        />
        <span
          v-if="record.updatedAt"
          class="user-work-record__timestamp text-caption text-grey text-no-wrap"
          :aria-label="`标记时间：${record.updatedAt}`"
        >
          <q-icon name="schedule" size="xs" class="q-mr-xs" />
          {{ record.updatedAt }}
        </span>
      </div>
    </template>

    <template v-else>
      <div class="row items-center q-gutter-x-xs">
        <q-select
          :model-value="record.progress"
          @update:model-value="updateProgress"
          :options="progressOptions"
          emit-value
          map-options
          option-label="label"
          option-value="value"
          options-dense
          options-selected-class="text-primary"
          dense
          outlined
          rounded
          behavior="menu"
          dropdown-icon="keyboard_arrow_down"
          aria-label="标记进度"
          class="app-control-field user-work-record__progress-select text-grey-9"
          :menu-offset="[0, 6]"
        >
          <template #selected>
            <span class="ellipsis">{{ progressLabel }}</span>
          </template>
        </q-select>

        <q-btn
          dense
          unelevated
          rounded
          no-caps
          color="white"
          text-color="grey-9"
          class="app-control-button"
          padding="4px 8px"
          label="编辑评论"
          @click="showReviewDialog = true"
        />
      </div>

      <WriteReview
        v-if="showReviewDialog"
        :workid="workId"
        :record="record"
        @saved="onNoteSaved"
        @deleted="onRecordDeleted"
        @closed="showReviewDialog = false"
      />
    </template>
  </div>
</template>

<script>
import WriteReview from './WriteReview'
import NotifyMixin from '../mixins/Notification.js'
import {
  PROGRESS_OPTIONS,
  clearUserWorkRecord,
  createUserWorkRecordService,
  getUserWorkRecord,
  getUserWorkRecordErrorMessage,
  hydrateUserWorkRecord,
  updateUserWorkRecord
} from '../services/userWorkRecord'

export default {
  name: 'UserWorkRecord',

  components: {
    WriteReview
  },

  mixins: [NotifyMixin],

  props: {
    workId: {
      type: Number,
      required: true
    },
    metadata: {
      type: Object,
      required: true
    },
    variant: {
      type: String,
      default: 'detail',
      validator: (value) => ['detail', 'row'].includes(value)
    }
  },

  data () {
    return {
      progressOptions: PROGRESS_OPTIONS,
      showReviewDialog: false
    }
  },

  computed: {
    record () {
      return getUserWorkRecord(this.workId)
    },

    progressLabel () {
      const option = this.progressOptions.find(item => item.value === this.record.progress)
      return option ? option.label : '标记进度'
    }
  },

  watch: {
    metadata: {
      handler (metadata) {
        hydrateUserWorkRecord(this.workId, metadata)
      },
      deep: true
    }
  },

  created () {
    hydrateUserWorkRecord(this.workId, this.metadata)
    this.recordService = createUserWorkRecordService(this.$axios)
  },

  methods: {
    async updateRating (rating) {
      if (!rating || rating === this.record.rating) return

      const previousRating = this.record.rating
      updateUserWorkRecord(this.workId, { rating })

      try {
        const response = await this.recordService.updateRating(this.workId, rating)
        this.showSuccNotif('评分已保存')
        hydrateUserWorkRecord(this.workId, response.data.record)
      } catch (error) {
        updateUserWorkRecord(this.workId, { rating: previousRating })
        this.showErrNotif(getUserWorkRecordErrorMessage(error))
      }
    },

    async updateProgress (progress) {
      if (!progress || progress === this.record.progress) return

      const previousProgress = this.record.progress
      updateUserWorkRecord(this.workId, { progress })

      try {
        const response = await this.recordService.updateProgress(this.workId, progress)
        this.showSuccNotif('进度已更新')
        hydrateUserWorkRecord(this.workId, response.data.record)
        this.$emit('progress-changed', progress)
      } catch (error) {
        updateUserWorkRecord(this.workId, { progress: previousProgress })
        this.showErrNotif(getUserWorkRecordErrorMessage(error))
      }
    },

    onNoteSaved (record) {
      hydrateUserWorkRecord(this.workId, record)
      this.showReviewDialog = false
    },

    onRecordDeleted () {
      clearUserWorkRecord(this.workId)
      this.showReviewDialog = false
    }
  }
}
</script>

<style lang="scss" scoped>
.user-work-record__review pre {
  font: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.user-work-record__actions {
  gap: 8px;
}

.user-work-record__timestamp {
  margin-left: auto;
  text-align: right;
}

.user-work-record__progress-select {
  width: 112px;
  flex: 0 0 112px;
}

.user-work-record__progress {
  overflow: hidden;
  border: 1px solid $separator-color;
}

.user-work-record__progress :deep(.q-btn:not(:last-child)) {
  border-right: 1px solid $separator-color;
}
</style>
