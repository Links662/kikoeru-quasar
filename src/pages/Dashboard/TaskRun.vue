<template>
  <div>
    <q-banner v-if="polling" dense class="bg-warning text-black q-ma-md">
      <template v-slot:avatar>
        <q-icon name="sync_problem" />
      </template>
      Socket 连接不可用，已切换为每 2 秒轮询获取进度（只读）。
      启动和终止操作需等待连接恢复。
    </q-banner>

    <q-card class="q-ma-md">
      <q-card-section>
        <div class="text-h6 text-weight-regular q-mb-md">手动任务</div>
        <div class="row q-col-gutter-md">
          <div
            v-for="group in manualTaskGroups"
            :key="group.title"
            class="col-12 col-md-4"
          >
            <q-card flat bordered class="manual-task-card">
              <q-card-section class="manual-task-card__header">
                <q-icon :name="group.icon" size="20px" color="app-accent" />
                <span>{{ group.title }}</span>
              </q-card-section>
              <q-separator />
              <q-card-section class="manual-task-card__body">
                <q-btn
                  v-for="task in group.tasks"
                  :key="task.kind"
                  flat
                  no-caps
                  align="left"
                  class="manual-task-button full-width"
                  :class="{ 'manual-task-button--primary': task.kind === 'scan' }"
                  :disable="state === 'running' || !socketConnected"
                  @click="startTask(task.kind)"
                >
                  <span class="manual-task-button__content">
                    <q-icon :name="task.icon" size="20px" class="manual-task-button__icon" />
                    <span class="manual-task-button__label">{{ task.title }}</span>
                    <q-spinner
                      v-if="state === 'running' && runKind === task.kind"
                      size="18px"
                      class="manual-task-button__action"
                    />
                    <q-icon
                      v-else
                      name="play_arrow"
                      size="18px"
                      class="manual-task-button__action"
                    />
                  </span>
                </q-btn>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card class="collection-status-card q-mx-md q-mb-md">
      <q-card-section class="q-pb-sm">
        <div class="row no-wrap items-start">
          <q-spinner-gears
            v-if="state === 'running'"
            color="app-accent"
            size="2.25em"
            class="q-mr-md q-mt-xs"
          />
          <q-icon
            v-else-if="state === 'finished'"
            name="done"
            color="positive"
            size="2.25em"
            class="q-mr-md q-mt-xs"
          />
          <q-icon
            v-else-if="state === 'error'"
            name="error"
            color="app-danger"
            size="2.25em"
            class="q-mr-md q-mt-xs"
          />
          <q-icon
            v-else
            name="schedule"
            color="app-accent"
            size="2.25em"
            class="q-mr-md q-mt-xs"
          />

          <div class="col">
            <div class="row no-wrap items-center">
              <div class="col text-subtitle1 text-weight-medium">
                {{ stateTitle }}
              </div>
              <q-btn
                v-if="state === 'running'"
                unelevated
                no-caps
                color="app-danger-fill"
                text-color="app-danger-contrast"
                label="终止"
                :disable="!socketConnected"
                @click="stopDialog = true"
              />
            </div>

            <div v-if="state" class="text-caption app-text-secondary q-mt-xs">
              {{ sourceLabel }}
              <span v-if="startedAt"> · 开始于 {{ formatDateTime(startedAt) }}</span>
              <span v-if="state === 'running'"> · 已运行 {{ elapsedLabel }}</span>
              <span v-else-if="finishedAt"> · 结束于 {{ formatDateTime(finishedAt) }}</span>
            </div>
            <div v-else class="text-caption app-text-secondary q-mt-xs">
              尚未执行采集任务，可从上方手动任务开始。
            </div>
          </div>
        </div>
      </q-card-section>

      <q-linear-progress
        v-if="state === 'running'"
        indeterminate
        color="app-accent"
      />

    </q-card>

    <div class="row q-col-gutter-md q-px-md q-pb-md">
      <div class="col-12 col-lg-4">
        <q-card class="task-monitor-card">
          <q-card-section>
            <div class="row items-center">
              <div class="col text-h6 text-weight-regular">任务监视</div>
              <q-badge color="primary" :label="tasks.length" />
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <div class="text-subtitle2 text-weight-medium q-mb-sm">正在处理</div>
            <div v-if="tasks.length === 0" class="text-caption app-text-secondary q-pb-sm">
              当前没有正在处理的任务。
            </div>
            <q-list v-else separator class="monitor-list">
              <q-item v-for="task in visibleTasks" :key="task.workId" dense>
                <q-item-section avatar>
                  <q-spinner-hourglass color="app-accent" size="18px" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ rjLabel(task.workId) }}</q-item-label>
                  <q-item-label caption class="ellipsis">
                    {{ lastTaskMessage(task) }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <div class="row items-center q-mb-sm">
              <div class="col text-subtitle2 text-weight-medium">异常</div>
              <q-badge
                :color="exceptionCount > 0 ? 'app-danger-fill' : 'grey-6'"
                :text-color="exceptionCount > 0 ? 'app-danger-contrast' : 'white'"
                :label="exceptionCount"
              />
            </div>
            <div v-if="exceptionItems.length === 0" class="text-caption app-text-secondary">
              本次运行没有需要处理的异常。
            </div>
            <q-list v-else separator class="monitor-list">
              <q-item
                v-for="item in visibleExceptions"
                :key="`${item.result}-${item.workId}`"
                dense
              >
                <q-item-section avatar>
                  <q-icon name="error_outline" color="app-danger" size="18px" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ rjLabel(item.workId) }}</q-item-label>
                  <q-item-label caption class="ellipsis">
                    {{ lastTaskMessage({ logs: item.logs }) }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-lg-8">
        <CollectionLogPanel
          :logs="allLogs"
          :state="state"
        />
      </div>
    </div>

    <q-dialog v-model="stopDialog">
      <q-card style="width: 420px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">终止当前任务</div>
          <div class="text-body2 app-text-secondary q-mt-sm">
            当前任务会立即终止，已经完成的结果不会回滚。确定继续吗？
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" color="primary" v-close-popup />
          <q-btn
            unelevated
            label="终止任务"
            color="app-danger-fill"
            text-color="app-danger-contrast"
            @click="confirmStop"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import NotifyMixin from '../../mixins/Notification.js'
import { formatRJLabel } from '../../utils/rjCode'
import CollectionLogPanel from '../../components/CollectionLogPanel.vue'

const POLL_INTERVAL = 2000

const TASK_DEFINITIONS = [
  {
    kind: 'scan',
    title: '扫描本地库',
    icon: 'library_add'
  },
  {
    kind: 'update',
    title: '刷新在线信息',
    icon: 'cloud_sync'
  },
  {
    kind: 'tags',
    title: '同步标签词表',
    icon: 'label'
  },
  {
    kind: 'subtitles',
    title: '扫描字幕',
    icon: 'subtitles'
  },
  {
    kind: 'covers',
    title: '修复封面',
    icon: 'image'
  }
]

const TASK_EVENTS = {
  scan: 'PERFORM_SCAN',
  update: 'PERFORM_UPDATE',
  tags: 'PERFORM_TAG_SCAN',
  subtitles: 'PERFORM_SUBTITLE_SCAN',
  covers: 'PERFORM_COVER_REPAIR'
}

const TASK_GROUPS = [
  { title: '本地入库', icon: 'library_add', kinds: ['scan'] },
  { title: '在线补全', icon: 'cloud_sync', kinds: ['update', 'tags'] },
  { title: '数据维护', icon: 'build_circle', kinds: ['subtitles', 'covers'] }
]

const EXCEPTION_RESULTS = new Set(['failed', 'blocked', 'delisted'])

const createResultLog = result => {
  if (result.log) return result.log
  return {
    level: EXCEPTION_RESULTS.has(result.result) ? 'warn' : 'success',
    type: 'item',
    depth: 2,
    workId: result.workId,
    message: `[${result.workId ? formatRJLabel(result.workId) : ''}] ${result.result}`
  }
}

export default {
  name: 'CollectionTaskRun',

  mixins: [NotifyMixin],

  components: {
    CollectionLogPanel
  },

  data () {
    return {
      state: null,
      socketConnected: false,
      polling: false,
      pollTimer: null,
      clockTimer: null,
      now: Date.now(),
      runKind: null,
      runSource: null,
      startedAt: null,
      finishedAt: null,
      finishedMessage: null,
      finishedLevel: 'info',
      tasks: [],
      failedTasks: [],
      mainLogs: [],
      results: [],
      stopDialog: false
    }
  },

  sockets: {
    SCAN_STARTED (payload) {
      this.applyScanState(payload)
    },
    SCAN_STATE (payload) {
      this.applyScanState(payload)
    },
    SCAN_TASKS (payload) {
      this.tasks = payload.tasks
    },
    SCAN_FAILED_TASKS (payload) {
      this.failedTasks = payload.failedTasks
    },
    SCAN_MAIN_LOGS (payload) {
      this.mainLogs = payload.mainLogs
    },
    SCAN_RESULTS (payload) {
      this.results = payload.results
    },
    SCAN_INIT_STATE (payload) {
      this.state = 'running'
      this.tasks = payload.tasks
      this.failedTasks = payload.failedTasks
      this.mainLogs = payload.mainLogs
      this.results = payload.results
    },
    SCAN_FINISHED (payload) {
      this.state = 'finished'
      this.finishedMessage = payload.message
      this.finishedLevel = payload.level || 'info'
      this.finishedAt = new Date().toISOString()
    },
    SCAN_ERROR () {
      this.state = 'error'
      this.finishedAt = new Date().toISOString()
    },
    success () {
      this.handleSocketUp()
    },
    disconnect () {
      this.handleSocketDown('Socket 连接已断开，已切换为轮询获取进度')
    },
    connect_error () {
      this.handleSocketDown('连接 Socket 失败，已切换为轮询获取进度')
    },
    reconnect_failed () {
      this.handleSocketDown('Socket 重连次数已用尽，已切换为轮询获取进度')
    }
  },

  computed: {
    allLogs () {
      const resultLogs = this.results.map(createResultLog)
      const logsById = new Map()

      this.mainLogs.concat(resultLogs).forEach((log, index) => {
        logsById.set(log.id ?? `legacy:${index}`, log)
      })

      const logs = Array.from(logsById.values()).sort((left, right) => {
        return (left.id ?? Number.MAX_SAFE_INTEGER) -
          (right.id ?? Number.MAX_SAFE_INTEGER)
      })

      if (this.finalLog) logs.push(this.finalLog)
      return logs
    },

    finalLog () {
      if (!this.finishedMessage) return null
      return {
        level: this.finishedLevel,
        type: 'summary',
        depth: 0,
        timestamp: this.finishedAt ? new Date(this.finishedAt).getTime() : Date.now(),
        message: this.finishedMessage
      }
    },

    exceptionItems () {
      const items = this.failedTasks.map(task => ({
        workId: task.workId,
        result: 'failed',
        logs: task.logs || []
      }))
      const seen = new Set(items.map(item => item.workId))

      for (const result of this.results) {
        if (!EXCEPTION_RESULTS.has(result.result) || seen.has(result.workId)) continue
        seen.add(result.workId)
        items.push({
          workId: result.workId,
          result: result.result,
          logs: [createResultLog(result)]
        })
      }

      return items
    },

    exceptionCount () {
      return this.exceptionItems.length
    },

    visibleTasks () {
      return this.tasks.slice(0, 6)
    },

    visibleExceptions () {
      return this.exceptionItems.slice(0, 6)
    },

    currentTaskDefinition () {
      return TASK_DEFINITIONS.find(task => task.kind === this.runKind) || null
    },

    stateTitle () {
      const taskName = this.currentTaskDefinition
        ? this.currentTaskDefinition.title
        : '采集任务'
      if (this.state === 'running') {
        return `${taskName}正在运行`
      }
      if (this.state === 'finished') return `${taskName}已完成`
      if (this.state === 'error') return `${taskName}异常结束`
      return '等待任务运行'
    },

    sourceLabel () {
      if (!this.runSource) return '来源未知'
      if (this.runSource.type === 'automation') {
        return `定时任务 #${this.runSource.automationId}`
      }
      return '手动运行'
    },

    elapsedSeconds () {
      if (!this.startedAt) return 0
      const start = new Date(this.startedAt).getTime()
      const end = this.finishedAt ? new Date(this.finishedAt).getTime() : this.now
      return Math.max(0, Math.floor((end - start) / 1000))
    },

    elapsedLabel () {
      const hours = Math.floor(this.elapsedSeconds / 3600)
      const minutes = Math.floor((this.elapsedSeconds % 3600) / 60)
      const seconds = this.elapsedSeconds % 60
      return [hours, minutes, seconds]
        .map(value => String(value).padStart(2, '0'))
        .join(':')
    },

    manualTaskGroups () {
      return TASK_GROUPS.map(group => ({
        ...group,
        tasks: group.kinds
          .map(kind => TASK_DEFINITIONS.find(task => task.kind === kind))
          .filter(Boolean)
      }))
    }
  },

  methods: {
    rjLabel (workId) {
      return workId ? formatRJLabel(workId) : ''
    },

    formatDateTime (value) {
      if (!value) return '—'
      return new Date(value).toLocaleString('zh-CN', { hour12: false })
    },

    lastTaskMessage (task) {
      const logs = task.logs || []
      return logs.length > 0
        ? logs[logs.length - 1].message
        : '等待日志...'
    },

    startTask (kind) {
      const event = TASK_EVENTS[kind]
      if (!event || this.state === 'running' || !this.socketConnected) return

      this.resetScanState(kind)
      this.$socket.emit(event)
    },

    resetScanState (kind) {
      this.state = 'running'
      this.runKind = kind
      this.runSource = { type: 'manual' }
      this.startedAt = new Date().toISOString()
      this.finishedAt = null
      this.finishedMessage = null
      this.finishedLevel = 'info'
      this.tasks = []
      this.failedTasks = []
      this.mainLogs = []
      this.results = []
    },

    applyScanState (scanState) {
      if (!scanState || !scanState.status) return

      this.state = scanState.status
      this.runKind = scanState.kind || this.runKind
      this.runSource = scanState.source || this.runSource
      this.startedAt = scanState.startedAt || this.startedAt
      this.finishedAt = scanState.finishedAt || null
      this.finishedMessage = scanState.message || null
      this.finishedLevel = scanState.messageLevel || 'info'
      this.tasks = scanState.tasks || []
      this.failedTasks = scanState.failedTasks || []
      this.mainLogs = scanState.mainLogs || []
      this.results = scanState.results || []
    },

    confirmStop () {
      this.stopDialog = false
      this.$socket.emit('KILL_SCAN_PROCESS')
    },

    handleSocketUp () {
      const wasPolling = this.polling

      const resume = () => {
        this.socketConnected = true
        this.stopPolling()
        this.$socket.emit('ON_SCANNER_PAGE')
      }

      if (!wasPolling) {
        resume()
        return
      }

      this.$axios.get('/api/scanner/state')
        .then((response) => {
          this.applyScanState(response.data)
        })
        .catch(() => {})
        .then(resume)
    },

    handleSocketDown (message) {
      this.socketConnected = false
      const alreadyPolling = this.polling
      this.startPolling()
      if (message && !alreadyPolling) {
        this.showWarnNotif(message)
      }
    },

    startPolling () {
      if (this.pollTimer) return
      this.polling = true
      this.fetchScanState()
      this.pollTimer = setInterval(this.fetchScanState, POLL_INTERVAL)
    },

    stopPolling () {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
      this.polling = false
    },

    fetchScanState () {
      this.$axios.get('/api/scanner/state')
        .then((response) => {
          this.applyScanState(response.data)
        })
        .catch((error) => {
          if (error.response && error.response.status === 401) {
            this.stopPolling()
          }
        })
    }
  },

  mounted () {
    this.socketConnected = this.$socket.connected
    if (!this.socketConnected) {
      this.startPolling()
    }
    this.$socket.emit('ON_SCANNER_PAGE')
    this.clockTimer = setInterval(() => {
      this.now = Date.now()
    }, 1000)
  },

  beforeUnmount () {
    this.stopPolling()
    if (this.clockTimer) clearInterval(this.clockTimer)
  }
}
</script>

<style lang="scss" scoped>
.collection-status-card {
  position: sticky;
  top: 8px;
  z-index: 5;
}

.manual-task-card {
  display: flex;
  height: 100%;
  flex-direction: column;
}

.manual-task-card__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.625rem;
  padding-bottom: 0.625rem;
  color: var(--app-text);
  font-size: 0.9375rem;
  font-weight: 600;
}

.manual-task-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
}

.manual-task-button {
  min-height: 42px;
  padding: 0 0.75rem;
  border: 1px solid var(--app-border);
  border-radius: $button-rounded-border-radius;
  background: var(--app-surface);
  color: var(--app-text);
}

.manual-task-button--primary {
  border-color: transparent;
  background: var(--app-accent);
  color: var(--app-accent-contrast);
}

.manual-task-button__content {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.625rem;
}

.manual-task-button__icon {
  flex: 0 0 20px;
}

.manual-task-button__label {
  flex: 1;
  text-align: left;
}

.manual-task-button__action {
  flex: 0 0 auto;
  opacity: 0.7;
}

.manual-task-button :deep(.q-btn__content) {
  width: 100%;
}

.task-monitor-card {
  height: 100%;
}

.monitor-list {
  max-height: 220px;
  overflow: auto;
}
</style>
