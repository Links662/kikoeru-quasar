<template>
  <div class="column q-py-none">
    <div
      v-for="(log, index) in logs"
      :key="log.id ?? index"
      class="scanner-log-row row no-wrap items-start q-py-none"
    >
      <div class="log-time text-caption text-mono">
        {{ formatTime(log) }}
      </div>
      <div class="col row no-wrap items-start" :class="indentClass(log)">
        <div class="q-pr-sm">
          <q-icon
            :name="iconName(log)"
            :class="iconClass(log)"
            size="16px"
          />
        </div>
        <div class="col log-message" :class="messageClass(log)">
          <span>{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const TYPE_DEPTH = {
  phase: 0,
  summary: 0,
  progress: 1,
  item: 2,
  detail: 3
}

const INDENT_CLASSES = [
  'q-pl-none',
  'q-pl-sm',
  'q-pl-md',
  'q-pl-lg'
]

export default {
  name: 'ScannerLogList',

  props: {
    logs: {
      type: Array,
      default: () => []
    },
    dark: {
      type: Boolean,
      default: false
    }
  },

  methods: {
    formatTime (log) {
      if (!log.timestamp) return '--:--:--'
      const date = new Date(log.timestamp)
      if (Number.isNaN(date.getTime())) return '--:--:--'
      return date.toLocaleTimeString('zh-CN', { hour12: false })
    },

    depth (log) {
      const depth = Number.isInteger(log.depth)
        ? log.depth
        : TYPE_DEPTH[log.type] ?? 1
      return Math.max(0, Math.min(depth, INDENT_CLASSES.length - 1))
    },

    indentClass (log) {
      return INDENT_CLASSES[this.depth(log)]
    },

    iconName (log) {
      if (log.level === 'error') return 'error_outline'
      if (log.level === 'warn') return 'warning_amber'
      if (log.level === 'success') return 'check_circle_outline'

      return {
        phase: 'segment',
        summary: 'flag',
        item: 'chevron_right',
        detail: 'subdirectory_arrow_right'
      }[log.type] || 'circle'
    },

    iconClass (log) {
      if (log.level === 'error') {
        return this.dark ? 'text-app-on-dark-danger' : 'text-app-danger'
      }
      if (log.level === 'warn') return 'text-warning'
      if (log.level === 'success') return 'text-positive'
      if (log.type === 'phase' || log.type === 'summary') {
        return this.dark ? 'text-white' : ''
      }
      return this.dark ? 'text-grey-4' : 'app-text-secondary'
    },

    messageClass (log) {
      const classes = []

      if (log.type === 'phase' || log.type === 'summary') {
        classes.push('text-subtitle2', 'text-weight-bold')
      } else {
        classes.push('text-body2')
      }

      if (log.level === 'error') {
        classes.push(this.dark ? 'text-app-on-dark-danger' : 'text-app-danger')
      } else if (log.level === 'warn') {
        classes.push('text-warning')
      } else if (log.level === 'success') {
        classes.push('text-positive')
      } else if (log.type === 'detail') {
        classes.push(this.dark ? 'text-grey-4' : 'app-text-secondary')
      } else if ((log.type === 'phase' || log.type === 'summary') && this.dark) {
        classes.push('text-white')
      }

      return classes
    }
  }
}
</script>

<style lang="scss" scoped>
.scanner-log-row {
  min-height: 24px;
}

.log-time {
  flex: 0 0 5.25rem;
  padding-top: 1px;
  opacity: 0.7;
  white-space: nowrap;
}

.log-message {
  overflow-wrap: anywhere;
  line-height: 1.5;
}
</style>
