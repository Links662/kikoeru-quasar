<template>
  <div class="work-rating row items-center">
    <span class="work-rating__stars">
      <q-rating
        :model-value="displayRating"
        :size="size"
        :readonly="!editable"
        :color="personalRating ? 'blue' : 'amber'"
        icon="star_border"
        icon-selected="star"
        icon-half="star_half"
        aria-label="作品评分"
        @update:model-value="updateRating"
      />

      <q-tooltip v-if="sortedRatings.length" content-class="text-subtitle1">
        <div>DLsite 平均: {{ average }}</div>
        <div v-for="rate in sortedRatings" :key="rate.review_point" class="row items-center">
          <div class="col">{{ rate.review_point }}星</div>
          <q-linear-progress
            :value="rate.ratio / 100"
            color="amber"
            track-color="white"
            class="col-auto rating-bar"
          />
          <div class="col q-mx-sm">({{ rate.count }})</div>
        </div>
      </q-tooltip>
    </span>

    <span class="text-weight-medium text-body1 text-red">{{ average }}</span>
    <span class="text-grey">({{ rateCount }})</span>

    <template v-if="showReviewCount">
      <span class="q-px-sm row items-center">
        <q-icon name="chat" size="xs" />
        <span class="q-ml-xs text-grey">({{ reviewCount }})</span>
      </span>
    </template>

    <template v-if="showLink">
      <q-icon name="launch" size="xs" />
      <a class="text-blue" :href="dlsiteUrl" rel="noreferrer noopener" target="_blank">DLsite</a>
    </template>
  </div>
</template>

<script>
import NotifyMixin from '../mixins/Notification.js'
import { formatDlsiteUrl } from '../utils/rjCode'
import {
  createUserWorkRecordService,
  getUserWorkRecord,
  getUserWorkRecordErrorMessage,
  hydrateUserWorkRecord,
  updateUserWorkRecord
} from '../services/userWorkRecord'

export default {
  name: 'WorkRating',

  mixins: [NotifyMixin],

  props: {
    metadata: {
      type: Object,
      required: true
    },
    size: {
      type: String,
      default: 'sm'
    },
    editable: {
      type: Boolean,
      default: true
    },
    showReviewCount: {
      type: Boolean,
      default: false
    },
    showLink: {
      type: Boolean,
      default: false
    }
  },

  computed: {
    record () {
      return getUserWorkRecord(this.metadata.id)
    },

    personalRating () {
      return this.record.rating
    },

    average () {
      const value = Number(this.metadata.rate_average_2dp)
      return Number.isFinite(value) ? value : 0
    },

    displayRating () {
      return this.personalRating || this.average
    },

    rateCount () {
      return Number(this.metadata.rate_count) || 0
    },

    reviewCount () {
      return Number(this.metadata.review_count) || 0
    },

    sortedRatings () {
      if (!Array.isArray(this.metadata.rate_count_detail)) return []

      return this.metadata.rate_count_detail.slice().sort((a, b) => {
        return (a.review_point > b.review_point) ? -1 : 1
      })
    },

    dlsiteUrl () {
      if (!this.metadata.id) return ''
      return formatDlsiteUrl(this.metadata.id)
    }
  },

  watch: {
    metadata: {
      handler (metadata) {
        if (metadata.id) hydrateUserWorkRecord(metadata.id, metadata)
      },
      deep: true
    }
  },

  created () {
    hydrateUserWorkRecord(this.metadata.id, this.metadata)
    this.recordService = createUserWorkRecordService(this.$axios)
  },

  methods: {
    async updateRating (rating) {
      if (!this.editable || !rating || rating === this.personalRating) return

      const previousRating = this.personalRating
      updateUserWorkRecord(this.metadata.id, { rating })

      try {
        const response = await this.recordService.updateRating(this.metadata.id, rating)
        this.showSuccNotif(response.data.message)
        this.$emit('rating-changed', rating)
      } catch (error) {
        updateUserWorkRecord(this.metadata.id, { rating: previousRating })
        this.showErrNotif(getUserWorkRecordErrorMessage(error))
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.work-rating {
  column-gap: 4px;
  row-gap: 4px;
}

.work-rating__stars {
  display: inline-flex;
}
</style>
