<template>
  <div>
    <q-dialog v-model="showReviewDialog">
      <q-card class="review-card">
        <q-card-section class="q-pb-sm">
          <div class="text-body1">我的短评</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="reviewText"
            filled
            autogrow
            type="textarea"
            placeholder="写下对这部作品的短评…"
            input-style="min-height: 120px"
          />
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn flat label="取消" @click="showReviewDialog = false" />
          <q-btn flat label="保存" :loading="saving" @click="submitNote" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import NotifyMixin from '../mixins/Notification.js'
import {
  createUserWorkRecordService,
  getUserWorkRecordErrorMessage
} from '../services/userWorkRecord'

export default {
  name: 'WriteReview',

  mixins: [NotifyMixin],

  props: {
    workid: {
      type: Number,
      required: true
    },
    record: {
      type: Object,
      required: true
    }
  },

  data () {
    return {
      showReviewDialog: true,
      reviewText: '',
      saving: false
    }
  },

  created () {
    this.recordService = createUserWorkRecordService(this.$axios)
    this.reviewText = this.record.reviewText || ''
  },

  watch: {
    showReviewDialog (visible) {
      if (!visible) this.$emit('closed')
    }
  },

  methods: {
    async submitNote () {
      if (this.saving) return
      this.saving = true

      try {
        const response = await this.recordService.saveNote(this.workid, {
          ...this.record,
          reviewText: this.reviewText
        })
        this.showSuccNotif('短评已保存')
        this.$emit('saved', response.data.record)
      } catch (error) {
        this.showErrNotif(getUserWorkRecordErrorMessage(error))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.review-card {
  width: min(420px, calc(100vw - 32px));
}

</style>
