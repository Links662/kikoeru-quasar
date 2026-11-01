<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="sleep-mode-card">
      <q-card-section class="sleep-mode-header row items-center no-wrap q-px-md q-pt-md q-pb-sm">
        <q-btn
          v-if="customMode"
          flat
          round
          dense
          icon="arrow_back"
          aria-label="返回快捷设置"
          @click="customMode = false"
        />
        <div class="col q-ml-sm">
          <div class="text-h6">{{ customMode ? '自定义结束时间' : '播放定时' }}</div>
          <div class="text-caption text-grey-6">
            {{ customMode ? '选择自动暂停播放的时间' : '到时自动暂停播放' }}
          </div>
        </div>
        <q-btn
          flat
          round
          dense
          icon="close"
          aria-label="关闭播放定时设置"
          @click="closeDialog"
        />
      </q-card-section>

      <template v-if="!customMode">
        <q-card-section class="q-px-md q-pt-none">
          <div v-if="sleepMode" class="sleep-mode-status q-mb-md">
            <q-icon name="schedule" size="20px" />
            <div>
              <div class="text-weight-medium">已开启</div>
              <div class="text-caption">将在 {{ sleepTime }} 自动暂停播放</div>
            </div>
          </div>

          <div class="text-body2 text-weight-medium q-mb-sm">多久后暂停播放？</div>
          <div class="sleep-mode-presets q-mb-sm">
            <q-btn
              v-for="duration in quickDurations"
              :key="duration.minutes"
              outline
              no-caps
              color="primary"
              class="sleep-mode-preset"
              :label="duration.label"
              @click="setSleepAfter(duration.minutes)"
            />
          </div>

          <q-btn
            flat
            no-caps
            align="left"
            color="primary"
            icon="schedule"
            label="自定义结束时间"
            class="full-width sleep-mode-custom"
            @click="openCustomTime"
          />
        </q-card-section>

        <q-card-actions v-if="sleepMode" class="q-px-md q-pb-md">
          <q-space />
          <q-btn
            flat
            no-caps
            color="negative"
            label="关闭定时"
            @click="clearSleepTimer"
          />
        </q-card-actions>
      </template>

      <template v-else>
        <q-card-section class="q-px-md q-pt-none">
          <q-input
            v-model="time"
            type="time"
            label="结束时间"
            outlined
            dense
            step="60"
            aria-label="选择自动暂停播放的结束时间"
          />

          <div class="sleep-mode-time-preview q-mt-md">
            <q-icon name="schedule" size="20px" />
            <div>
              <div v-if="customTimeInfo" class="text-body2">
                {{ customTimeInfo.dayLabel }} {{ time }} 自动暂停
              </div>
              <div v-else class="text-body2">请选择一个有效的结束时间</div>
              <div v-if="customTimeInfo" class="text-caption">
                约 {{ customTimeInfo.delayLabel }}后
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat no-caps label="返回" @click="customMode = false" />
          <q-btn
            unelevated
            no-caps
            color="primary"
            :label="customTimeInfo ? `设为 ${time}` : '请选择时间'"
            :disable="!customTimeInfo"
            @click="setSleepTimer()"
          />
        </q-card-actions>
      </template>
    </q-card>
  </q-dialog>
</template>

<script>
import { mapState, mapMutations } from 'vuex'

export default {
  name: 'SleepMode',

  // v-model: showTimer from MainLayout
  props: ['modelValue'],

  data () {
    return {
      time: '00:00',
      customMode: false,
      quickDurations: [
        { minutes: 15, label: '15 分钟' },
        { minutes: 30, label: '30 分钟' },
        { minutes: 60, label: '60 分钟' },
        { minutes: 90, label: '90 分钟' }
      ]
    }
  },

  computed: {
    ...mapState('AudioPlayer', [
      'sleepTime',
      'sleepMode'
    ]),

    customTimeInfo () {
      const matched = /^(\d{1,2}):(\d{1,2})$/.exec(this.time)
      if (matched === null) return null

      const hours = Number(matched[1])
      const minutes = Number(matched[2])
      if (hours > 23 || minutes > 59) return null

      const now = new Date()
      const target = new Date(now)
      target.setSeconds(0, 0)
      target.setHours(hours, minutes)

      const isTomorrow = target.getTime() <= now.getTime()
      if (isTomorrow) {
        target.setDate(target.getDate() + 1)
      }

      const delayMinutes = Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 60000))
      const delayHours = Math.floor(delayMinutes / 60)
      const remainingMinutes = delayMinutes % 60
      let delayLabel = `${delayMinutes} 分钟`

      if (delayHours > 0) {
        delayLabel = remainingMinutes > 0
          ? `${delayHours} 小时 ${remainingMinutes} 分钟`
          : `${delayHours} 小时`
      }

      return {
        dayLabel: isTomorrow ? '明天' : '今天',
        delayLabel
      }
    }
  },

  mounted () {
    try {
      if (this.$q.sessionStorage.getItem('sleepMode')) {
        this.SET_SLEEP_TIMER(this.$q.sessionStorage.getItem('sleepTime'))
      }
    } catch {
      console.log('Web Storage API error')
    }
  },

  watch: {
    modelValue (visible) {
      if (!visible) return

      this.customMode = false
      this.time = this.sleepMode
        ? this.sleepTime
        : this.getTimeAfter(30)
    }
  },

  methods: {
    ...mapMutations('AudioPlayer', [
      'SET_SLEEP_TIMER',
      'CLEAR_SLEEP_MODE'
    ]),

    getTimeAfter (minutes) {
      const target = new Date(Date.now() + minutes * 60 * 1000)
      return this.formatTime(target)
    },

    formatTime (date) {
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    },

    setSleepAfter (minutes) {
      this.setSleepTimer(this.getTimeAfter(minutes))
    },

    openCustomTime () {
      this.time = this.sleepMode
        ? this.sleepTime
        : this.getTimeAfter(30)
      this.customMode = true
    },

    setSleepTimer (time = this.time) {
      this.SET_SLEEP_TIMER(time)
      try {
        this.$q.sessionStorage.set('sleepTime', time)
        this.$q.sessionStorage.set('sleepMode', true)
      } catch {
        console.log('Web Storage API error')
      }
      this.showSuccessNotif(`将在 ${time} 自动暂停播放`)
      this.closeDialog()
    },

    clearSleepTimer () {
      this.CLEAR_SLEEP_MODE()
      try {
        this.$q.sessionStorage.set('sleepTime', null)
        this.$q.sessionStorage.set('sleepMode', false)
      } catch {
        console.log('Web Storage API error')
      }
      this.showSuccessNotif('播放定时已关闭')
      this.closeDialog()
    },

    closeDialog () {
      this.$emit('update:modelValue', false)
    },

    showSuccessNotif (message) {
      this.$q.notify({
        message,
        color: 'primary',
        icon: 'schedule',
        timeout: 5000
      })
    }
  }
}
</script>

<style scoped>
.sleep-mode-card {
  width: min(92vw, 380px);
  max-width: 380px;
}

.sleep-mode-header {
  gap: 4px;
}

.sleep-mode-status,
.sleep-mode-time-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--q-primary);
  background: color-mix(in srgb, var(--q-primary) 10%, transparent);
}

.sleep-mode-presets {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.sleep-mode-preset {
  min-height: 42px;
}

.sleep-mode-custom {
  justify-content: flex-start;
}
</style>
