<template>
  <q-item clickable class="row bg-white">
      <q-item-section class="col-auto" top> 
        <router-link :to="`/work/${metadata.id}`">
          <q-img transition="fade" :src="coverUrl" style="height: 120px; width: 160px;" />
        </router-link>
      </q-item-section>


      <q-item-section class="q-gutter-y-xs column items-start" top v-on:click.self="showReviewDialog = true">
        <q-item-label lines="2" class="text-body2">
          <router-link :to="`/work/${metadata.id}`" class="col-auto text-black">
            {{metadata.title}}
          </router-link>
        </q-item-label>

        <div class="row q-gutter-x-sm col-auto" >
          <router-link :to="`/works?circleId=${metadata.circle.id}`" class="col-auto text-grey">
            {{metadata.circle.name}}
          </router-link>

          <span class="col-auto">/</span>
          <span class="col-auto text-grey"> {{metadata.release}}</span>
          <span class="col-auto">/</span>

          <router-link
            v-for="(va, index) in metadata.vas"
            :key=index
            :to="`/works?vaId=${va.id}`"
            class="col-auto text-primary"
          >
            {{ va.name }}
          </router-link>
        </div>

        <div class="row items-center q-gutter-x-xs">
          <q-rating
            v-if="reviewData.rating"
            v-model="reviewData.rating"
            @input="setRating"
            size="sm"
            color="blue"
            icon="star_border"
            icon-selected="star"
            icon-half="star_half"
            class="col-auto"
          />
          <span class="col-auto text-grey ">{{metadata.updated_at}}</span>
        </div>

        <q-item-label class="q-mt-auto" v-if="reviewData.reviewText">
          <pre class="q-ma-none">{{reviewData.reviewText}}</pre>
        </q-item-label>

        <q-item-label class="q-mt-auto">
          <q-btn-toggle
            v-model="reviewData.progress"
            @input="setProgress"
            dense
            no-caps
            rounded
            toggle-color="primary"
            color="white"
            text-color="black"
            class="q-pa-none"
            :options="[
              {label: '想听', value: 'marked'},
              {label: '在听', value: 'listening'},
              {label: '听过', value: 'listened'},
              {label: '重听', value: 'replay'},
              {label: '搁置', value: 'postponed'}
            ]"
          />
          </q-item-label>
      </q-item-section>

      <WriteReview v-if="showReviewDialog" @modifydata="processReview" @closed="closed" :workid="workid" :metadata="reviewData"></WriteReview>

  </q-item>
</template>

<script>
import WriteReview from './WriteReview'
import NotifyMixin from '../mixins/Notification.js'

export default {
  name: 'FavListItem',

  mixins: [NotifyMixin],

  components: {
    WriteReview
  },

  props: {
      workid: {
        type: Number,
        required: true
      },
      metadata: {
        type: Object,
        required: true
      }
  },

  data () {
    return {
      showReviewDialog: false,
      reviewData: {
        rating: 0,
        progress: '',
        reviewText: ''
      }
    }
  },

  computed: {
    coverUrl () {
      // 从 LocalStorage 中读取 token
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      return this.workid ? `/api/cover/${this.workid}?type=240x240&token=${token}` : ""
    },
  },

  mounted() {
    // 可以用mounted因为初始化时metadata不为空
    this.setMetadata();
  },

  watch: {
    // 需要watch metadata 当父component刷新metadata时更新
    metadata () {
      this.setMetadata();
    }
  },

  methods: {
    normalizeReview(raw) {
      return {
        rating: raw.userRating || 0,
        progress: raw.progress || '',
        reviewText: raw.review_text || ''
      }
    },

    setMetadata() {
      this.reviewData = this.normalizeReview(this.metadata)
    },

    processReview (payload) {
      if(payload.deleted || this.reviewData.progress != payload.progress){
        this.$emit('deleteItem', payload.work_id);
      }
      else{
        this.reviewData = {
          rating: payload.rating,
          progress: payload.progress,
          reviewText: payload.reviewText
        }
      }
      this.closed()
    },

    closed() {
      this.showReviewDialog = false;
    },

    setRating (newRating) {
      // 取消标星可能是操作失误，所以不响应。应使用删除标记来删除打星
      if (newRating) {
        const submitPayload = {
          'user_name': this.$store.state.User.name, // 用户名不会被后端使用
          'work_id': this.metadata.id,
          'rating': newRating
        };
        this.submitRating(submitPayload);
      }
    },

    submitRating (payload) {
      const params = {
        starOnly: true
      }
      this.$axios.put('/api/review', payload, { params })
        .then((response) => {
          this.showSuccNotif(response.data.message)
        })
        .then(()=> {
          this.reviewData.rating = payload.rating
        })
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    setProgress (newProgress) {
      const submitPayload = {
        'user_name': this.$store.state.User.name, // 用户名不会被后端使用
        'work_id': this.metadata.id,
        'progress': newProgress
      };
      this.submitProgress(submitPayload);
    },

    submitProgress (payload) {
      const params = {
        starOnly: false,
        progressOnly: true
      }
      this.$axios.put('/api/review', payload, {params})
        .then((response) => {
          this.showSuccNotif(response.data.message)
        })
        .then(()=> {this.$emit('deleteItem', payload.work_id)})
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },
  }

}
</script>