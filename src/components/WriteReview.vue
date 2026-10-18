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

        <div class="row justify-between items-center">
          <q-card-actions class="text-red">
            <q-btn flat label="清除我的记录" @click="deleteConfirm = true" />
          </q-card-actions>

          <q-card-actions align="right" class="text-primary">
            <q-btn flat label="取消" @click="showReviewDialog = false" />
            <q-btn flat label="保存" :loading="saving" @click="submitNote" />
          </q-card-actions>
        </div>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteConfirm" persistent transition-show="scale" transition-hide="scale">
      <q-card class="bg-teal text-white confirm-card">
        <q-card-section>
          <div class="text-h6">确定要清除我的记录吗？</div>
          <div class="q-mt-sm">这会同时删除评分、收听状态和短评。</div>
        </q-card-section>

        <q-card-actions align="right" class="bg-white text-teal">
          <q-btn flat label="确定" :loading="deleting" @click="deleteReview" />
          <q-btn flat label="取消" v-close-popup />
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
      deleteConfirm: false,
      reviewText: '',
      saving: false,
      deleting: false
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
        this.showSuccNotif(response.data.message)
        this.$emit('saved', response.data.record)
      } catch (error) {
        this.showErrNotif(getUserWorkRecordErrorMessage(error))
      } finally {
        this.saving = false
      }
    },

    async deleteReview () {
      if (this.deleting) return
      this.deleting = true

      try {
        const response = await this.recordService.remove(this.workid)
        this.showSuccNotif(response.data.message)
        this.deleteConfirm = false
        this.$emit('deleted')
      } catch (error) {
        this.showErrNotif(getUserWorkRecordErrorMessage(error))
      } finally {
        this.deleting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.review-card {
  width: min(420px, calc(100vw - 32px));
}

.confirm-card {
  width: min(320px, calc(100vw - 32px));
}
</style>
