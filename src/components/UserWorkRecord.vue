<template>
  <div class="user-work-record" :class="{ 'user-work-record--row': variant === 'row' }">
    <template v-if="variant === 'row'">
      <div class="row items-center q-gutter-x-xs">
        <q-rating
          v-if="record.rating"
          :model-value="record.rating"
          @update:model-value="updateRating"
          size="sm"
          color="blue"
          icon="star_border"
          icon-selected="star"
          icon-half="star_half"
          class="col-auto"
          aria-label="我的评分"
        />
        <span v-if="record.updatedAt" class="col-auto text-grey">{{ record.updatedAt }}</span>
      </div>

      <q-item-label v-if="record.reviewText">
        <pre class="q-ma-none">{{ record.reviewText }}</pre>
      </q-item-label>

      <q-btn-toggle
        :model-value="record.progress"
        @update:model-value="updateProgress"
        dense
        no-caps
        rounded
        toggle-color="primary"
        color="white"
        text-color="black"
        class="q-pa-none"
        :options="progressOptions"
      />
    </template>

    <template v-else>
      <div class="row items-center">
        <q-btn-dropdown
          dense
          color="cyan"
          class="shadow-4 q-mx-xs q-pl-sm"
          label="标记进度"
        >
          <q-list>
            <q-item
              v-for="item in progressOptions"
              :key="item.value"
              clickable
              class="q-pa-xs"
              @click="updateProgress(item.value)"
            >
              <q-item-section avatar>
                <q-avatar icon="headset" v-show="record.progress === item.value" />
              </q-item-section>

              <q-item-section>
                <q-item-label>{{ item.label }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <q-btn
          dense
          color="cyan"
          class="shadow-4 q-mx-xs q-px-sm"
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
        this.showSuccNotif(response.data.message)
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
        this.showSuccNotif(response.data.message)
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
.user-work-record--row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
</style>
