<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card class="sleep-mode-card">
      <q-card-section class="row items-center no-wrap q-gutter-x-xs q-px-md q-pt-md q-pb-sm">
        <div class="col">
          <div class="text-h6">播放定时</div>
          <div class="text-caption text-grey-6">到时自动暂停播放</div>
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

      <q-card-section class="q-px-md q-pt-none">
        <div
          v-if="sleepMode"
          class="sleep-mode-status row items-center q-gutter-x-sm q-py-sm q-px-md rounded-borders q-mb-sm"
        >
          <q-icon name="schedule" size="20px" />
          <div class="col">
            <div class="text-weight-medium">已开启 · {{ sleepTime }}</div>
            <div class="text-caption">
              <template v-if="activeTimeInfo">
                {{ activeTimeInfo.dayLabel }}，约 {{ activeTimeInfo.delayLabel }}后
              </template>
              <template v-else>定时已开启</template>
            </div>
          </div>
          <q-btn
            flat
            round
            dense
            color="primary"
            icon="close"
            aria-label="关闭定时"
            @click="clearSleepTimer"
          />
        </div>

        <div class="q-py-xs q-px-xs text-primary q-mb-md">
          <div class="text-subtitle1 text-weight-medium">
            <template v-if="timerMode === 'custom' && customTimeInfo">
              {{ customTimeInfo.dayLabel }} {{ customTime }} 自动暂停
            </template>
            <template v-else-if="timerMode === 'custom'">
              请选择结束时间
            </template>
            <template v-else-if="selectedQuickDuration.minutes === 0">
              请选择有效时长
            </template>
            <template v-else>
              {{ selectedQuickDuration.minutes }} 分钟后自动暂停
            </template>
          </div>
          <div class="q-mt-xs text-caption app-text-secondary">
            <template v-if="timerMode === 'custom' && customTimeInfo">
              约 {{ customTimeInfo.delayLabel }}后
            </template>
            <template v-else-if="timerMode === 'custom'">
              选择时间后即可开始计时
            </template>
            <template v-else-if="selectedQuickDuration.minutes === 0">
              0 分钟无法开始计时
            </template>
            <template v-else>
              开始计时后生效
            </template>
          </div>
        </div>

        <q-btn-toggle
          v-model="timerMode"
          :options="timerModeOptions"
          dense
          unelevated
          spread
          no-caps
          toggle-color="primary"
          class="full-width rounded-borders app-theme-control q-mb-md"
        />

        <div
          v-if="timerMode === 'duration'"
          class="sleep-mode-panel q-pa-md rounded-borders q-mb-sm"
        >
          <div class="text-caption text-weight-medium app-text-secondary q-mb-sm">
            快捷时长（分钟）
          </div>
          <q-slider
            :model-value="quickDurationIndex"
            :min="0"
            :max="quickDurations.length - 1"
            :step="1"
            snap
            :label-value="selectedQuickDuration.label"
            color="primary"
            track-size="40px"
            thumb-size="0px"
            aria-label="快捷暂停时长"
            :aria-valuetext="selectedQuickDuration.label"
            @update:model-value="selectQuickDuration"
          />
          <div class="row justify-between text-caption app-text-secondary q-mt-xs" aria-hidden="true">
            <span
              v-for="(duration, index) in quickDurations"
              :key="duration.minutes"
              :class="{ 'sleep-mode-slider-label--disabled': index === 0 }"
            >
              {{ duration.minutes }}
            </span>
          </div>
        </div>

        <div v-else class="sleep-mode-panel q-pa-md rounded-borders q-mb-sm">
          <div class="text-caption text-weight-medium app-text-secondary q-mb-sm">
            指定结束时间
          </div>
          <q-input
            v-model="customTime"
            type="time"
            label="结束时间"
            outlined
            dense
            clearable
            step="60"
            color="primary"
            class="full-width"
            aria-label="选择自动暂停播放的结束时间"
          />
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn
          flat
          no-caps
          color="primary"
          :label="sleepMode ? '更新定时' : '开始计时'"
          :disable="!canStartTimer"
          @click="startTimer"
        />
      </q-card-actions>
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
      customTime: '',
      timerMode: 'duration',
      timerModeOptions: [
        { label: '快捷设置', value: 'duration' },
        { label: '指定时间', value: 'custom' }
      ],
      quickDurationIndex: 1,
      quickDurations: [
        { minutes: 0, label: '0 分钟' },
        { minutes: 15, label: '15 分钟' },
        { minutes: 30, label: '30 分钟' },
        { minutes: 45, label: '45 分钟' },
        { minutes: 60, label: '60 分钟' },
        { minutes: 120, label: '120 分钟' }
      ]
    }
  },

  computed: {
    ...mapState('AudioPlayer', [
      'sleepTime',
      'sleepMode'
    ]),

    selectedQuickDuration () {
      return this.quickDurations[this.quickDurationIndex] || this.quickDurations[1]
    },

    activeTimeInfo () {
      return this.getTimeInfo(this.sleepTime)
    },

    customTimeInfo () {
      return this.getTimeInfo(this.customTime)
    },

    canStartTimer () {
      return this.timerMode === 'custom'
        ? Boolean(this.customTimeInfo)
        : this.selectedQuickDuration.minutes > 0
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

      this.customTime = ''
      this.timerMode = 'duration'
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

    getTimeInfo (time) {
      const matched = /^(\d{1,2}):(\d{1,2})$/.exec(time)
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
    },

    selectQuickDuration (index) {
      this.quickDurationIndex = Number(index)
    },

    startTimer () {
      if (!this.canStartTimer) return

      if (this.timerMode === 'custom') {
        if (this.customTimeInfo) {
          this.setSleepTimer(this.customTime)
        }
        return
      }

      this.setSleepAfter(this.selectedQuickDuration.minutes)
    },

    setSleepAfter (minutes) {
      this.setSleepTimer(this.getTimeAfter(minutes))
    },

    setSleepTimer (time) {
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
}

.sleep-mode-status {
  color: var(--q-primary);
  background: color-mix(in srgb, var(--q-primary) 10%, transparent);
}

.sleep-mode-panel {
  background: color-mix(in srgb, var(--q-primary) 7%, transparent);
}

.sleep-mode-slider-label--disabled {
  opacity: 0.35;
}
</style>
