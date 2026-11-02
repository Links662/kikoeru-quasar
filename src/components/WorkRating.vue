<template>
  <div class="work-rating row items-center q-gutter-x-xs q-gutter-y-xs">
    <span class="row inline items-center">
      <q-rating
        :model-value="displayRating"
        :size="size"
        color="app-text-secondary"
        color-selected="amber"
        color-half="amber"
        icon="star_border"
        icon-selected="star"
        icon-half="star_half"
        no-dimming
        class="app-rating"
        aria-label="作品评分"
        @update:model-value="updateRating"
      />
    </span>

    <span class="text-weight-medium text-body1 text-red">{{ average }}</span>
    <button
      v-if="showRatingDistribution && sortedRatings.length"
      type="button"
      class="app-text-secondary bg-transparent no-border q-pa-none cursor-pointer"
      :aria-label="`查看 ${rateCount} 人评分分布`"
    >
      ({{ rateCount }})
      <q-menu
        anchor="bottom middle"
        self="top middle"
        :offset="[0, 4]"
        class="bg-grey-9 text-white q-pa-sm"
      >
        <div>DLsite 平均: {{ average }}</div>
        <div v-for="rate in sortedRatings" :key="rate.review_point" class="row items-center">
          <div class="col">{{ rate.review_point }}星</div>
          <q-linear-progress
            :value="rate.ratio / 100"
            color="amber"
            track-color="white"
            size="15px"
            class="rating-bar col-auto q-mx-sm"
          />
          <div class="col">({{ rate.count }})</div>
        </div>
      </q-menu>
    </button>
    <span v-else class="app-text-secondary">({{ rateCount }})</span>

    <template v-if="showRank && rankEntries.length">
      <button
        type="button"
        class="bg-transparent no-border q-pa-none cursor-pointer"
        :aria-label="rankSummary"
      >
        <span class="row items-center q-pl-xs ">
          <q-icon name="emoji_events" size="xs" color="amber-8" />
          <span class="q-ml-xs app-text-secondary">({{ rankEntries.length }})</span>
        </span>
        <q-menu
          anchor="bottom middle"
          self="top middle"
          :offset="[0, 4]"
          class="bg-grey-9 text-white q-pa-sm"
        >
          <div class="text-weight-medium q-mb-xs">DLsite 排行</div>
          <div
            v-for="(rank, index) in rankEntries"
            :key="`${rank.term}-${rank.category}-${rank.rank_date}-${index}`"
          >
            {{ formatRank(rank) }}
          </div>
        </q-menu>
      </button>
    </template>

    <template v-if="showReviewCount">
      <span class="q-pl-xs row items-center">
        <q-icon name="forum" size="xs" />
        <span class="q-ml-xs app-text-secondary">({{ reviewCount }})</span>
      </span>
    </template>
  </div>
</template>

<script>
import NotifyMixin from '../mixins/Notification.js'
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
    showReviewCount: {
      type: Boolean,
      default: false
    },
    showRank: {
      type: Boolean,
      default: false
    },
    showRatingDistribution: {
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

    rankEntries () {
      const ranks = Array.isArray(this.metadata.rank)
        ? this.metadata.rank
        : (this.metadata.rank ? [this.metadata.rank] : [])

      return ranks.filter(rank => {
        const value = Number(rank && rank.rank)
        return Number.isFinite(value) && value > 0
      })
    },

    rankSummary () {
      if (!this.rankEntries.length) return ''
      return `查看 DLsite 排行，共 ${this.rankEntries.length} 条`
    },

    sortedRatings () {
      if (!Array.isArray(this.metadata.rate_count_detail)) return []

      return this.metadata.rate_count_detail.slice().sort((a, b) => {
        return (a.review_point > b.review_point) ? -1 : 1
      })
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
    formatRank (rank) {
      const labels = {
        day: '日榜',
        week: '周榜',
        month: '月榜',
        year: '年榜',
        total: '累计榜'
      }
      const term = labels[rank.term] || '排行榜'
      const date = rank.rank_date ? ` · ${rank.rank_date}` : ''
      return `${term}第 ${rank.rank} 名${date}`
    },

    async updateRating (rating) {
      if (!rating || rating === this.personalRating) return

      const previousRating = this.personalRating
      updateUserWorkRecord(this.metadata.id, { rating })

      try {
        const response = await this.recordService.updateRating(this.metadata.id, rating)
        this.showSuccNotif('评分已保存')
        hydrateUserWorkRecord(this.metadata.id, response.data.record)
      } catch (error) {
        updateUserWorkRecord(this.metadata.id, { rating: previousRating })
        this.showErrNotif(getUserWorkRecordErrorMessage(error))
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.rating-bar {
  width: 100px;
}
</style>
