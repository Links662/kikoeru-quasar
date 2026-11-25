<template>
  <div class="column q-py-none">
    <div
      v-for="(log, index) in logs"
      :key="log.id ?? index"
      class="scanner-log-row row no-wrap items-start q-py-none"
      :class="indentClass(log)"
    >
      <div class="q-pr-sm">
        <q-icon
          :name="iconName(log)"
          :class="iconClass(log)"
          size="16px"
        />
      </div>
      <div class="col" :class="messageClass(log)">
        <span>{{ log.message }}</span>
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
    }
  },

  methods: {
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
      if (log.level === 'error') return 'text-app-on-dark-danger'
      if (log.level === 'warn') return 'text-warning'
      if (log.level === 'success') return 'text-positive'
      if (log.type === 'phase' || log.type === 'summary') return 'text-white'
      return 'text-grey-4'
    },

    messageClass (log) {
      const classes = []

      if (log.type === 'phase' || log.type === 'summary') {
        classes.push('text-subtitle2', 'text-weight-bold')
      } else {
        classes.push('text-body2')
      }

      if (log.level === 'error') classes.push('text-app-on-dark-danger')
      else if (log.level === 'warn') classes.push('text-warning')
      else if (log.level === 'success') classes.push('text-positive')
      else if (log.type === 'detail') classes.push('text-grey-4')
      else if (log.type === 'phase' || log.type === 'summary') classes.push('text-white')

      return classes
    }
  }
}
</script>

<style lang="scss" scoped>
.scanner-log-row {
  min-height: 22px;
}
</style>
