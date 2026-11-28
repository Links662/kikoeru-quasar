<template>
  <div>
    <q-banner v-if="polling" dense class="bg-warning text-black q-ma-sm">
      <template v-slot:avatar>
        <q-icon name="sync_problem" />
      </template>
      Socket 连接不可用，已切换为每 2 秒轮询获取进度（只读）。
      扫描 / 终止操作需等待连接恢复。
    </q-banner>

    <div class="row q-ma-sm">
      <div class="col-xs-6 col-sm-4 row q-pa-sm">
        <q-btn
          class="col"
          unelevated
          color="teal"
          label="扫描本地存储位置"
          :disable="state === 'running' || !socketConnected"
          @click="performScan()"
        />
      </div>

      <div class="col-xs-6 col-sm-4 row q-pa-sm">
        <q-btn
          class="col"
          unelevated
          color="indigo"
          label="扫描字幕"
          :disable="state === 'running' || !socketConnected"
          @click="performSubtitleScan()"
        />
      </div>

      <div class="col-xs-6 col-sm-4 row q-pa-sm">
        <q-btn
          class="col"
          unelevated
          color="deep-orange"
          label="扫描标签列表"
          :disable="state === 'running' || !socketConnected"
          @click="performTagScan()"
        />
      </div>

      <div class="col-xs-6 col-sm-4 row q-pa-sm">
        <q-btn
          class="col"
          unelevated
          color="primary"
          label="刷新作品信息"
          :disable="state === 'running' || !socketConnected"
          @click="performUpdate()"
        />
      </div>

      <div class="col-xs-6 col-sm-4 row q-pa-sm">
        <q-btn
          class="col"
          unelevated
          color="brown"
          label="修复封面"
          :disable="state === 'running' || !socketConnected"
          @click="repairCovers()"
        />
      </div>

      <div class="col-xs-12 col-sm-4 row q-pa-sm">
        <q-btn
          class="col"
          unelevated
          color="app-danger-fill"
          text-color="app-danger-contrast"
          label="终止扫描进程"
          :disable="state !== 'running' || !socketConnected"
          @click="$socket.emit('KILL_SCAN_PROCESS')"
        />
      </div>
    </div>

    <div class="q-mx-md q-mt-md">
      <div class="row no-wrap items-center justify-between q-mb-sm">
        <div class="col">
          <div class="text-h6 text-weight-regular">自动化</div>
          <div class="text-caption app-text-secondary">
            共 {{ automations.length }} 项，其中 {{ enabledCount }} 项已启用。
            Cron 按服务器容器时区执行
          </div>
        </div>
      </div>

      <div class="row no-wrap items-center justify-end q-mb-sm">
        <div class="col-auto">
          <q-btn
            outline
            no-caps
            color="app-accent"
            icon="schedule"
            label="新增自动化"
            aria-label="新增扫描自动化"
            @click="openCreateDialog"
          />
        </div>
      </div>

      <q-table
        class="list-table admin-data-table"
        :rows="automations"
        :columns="automationColumns"
        row-key="id"
        :loading="tableLoading"
        :visible-columns="automationVisibleColumns"
        binary-state-sort
        hide-pagination
        flat
        bordered
        dense
        wrap-cells
        no-data-label="尚未配置扫描自动化"
        loading-label="正在加载扫描自动化..."
        table-header-class="app-text"
      >
        <template v-slot:no-data="{ message }">
          <template v-if="!tableLoading">
            <q-icon class="q-table__bottom-nodata-icon" name="schedule" />
            {{ message }}
          </template>
        </template>

        <template v-slot:body-cell-index="props">
          <q-td :props="props" class="app-text-secondary">
            {{ props.rowIndex + 1 }}
          </q-td>
        </template>

        <template v-slot:body-cell-type="props">
          <q-td :props="props">
            <span>{{ actionLabel(props.row.type) }}</span>
            <div v-if="isNarrowScreen" class="text-caption app-text-secondary text-mono">
              {{ props.row.cronExpression }}
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-cronExpression="props">
          <q-td :props="props">
            <span class="text-mono">{{ props.row.cronExpression }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-nextRunAt="props">
          <q-td :props="props">
            <span v-if="props.row.enabled">{{ props.row.nextRunLabel || '—' }}</span>
            <span v-else class="app-text-secondary">—</span>
            <div v-if="props.row.scheduleError" class="text-caption text-app-danger">
              {{ props.row.scheduleError }}
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-lastTriggeredAt="props">
          <q-td :props="props">
            <span>{{ props.row.lastTriggeredLabel || '—' }}</span>
            <div
              v-if="props.row.lastTriggerStatus"
              class="text-caption"
              :class="triggerStatusClass(props.row.lastTriggerStatus)"
            >
              {{ triggerStatusLabel(props.row.lastTriggerStatus) }}
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-enabled="props">
          <q-td :props="props">
            <span
              class="text-weight-medium"
              :class="props.row.enabled ? 'app-text-secondary' : 'text-app-danger'"
            >
              {{ props.row.enabled ? '已启用' : '已停用' }}
            </span>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              flat
              dense
              no-caps
              color="app-accent"
              icon="edit"
              :label="showAutomationActionLabels ? '修改' : undefined"
              :aria-label="`修改扫描自动化 ${actionLabel(props.row.type)}`"
              @click="openEditDialog(props.row)"
            />
            <q-btn
              flat
              dense
              no-caps
              :color="props.row.enabled ? 'app-danger' : 'app-accent'"
              :icon="props.row.enabled ? 'pause_circle' : 'play_circle'"
              :label="showAutomationActionLabels ? (props.row.enabled ? '停用' : '启用') : undefined"
              :loading="loadingAutomationId === props.row.id"
              :aria-label="`${props.row.enabled ? '停用' : '启用'}扫描自动化 ${actionLabel(props.row.type)}`"
              @click="toggleAutomation(props.row)"
            />
            <q-btn
              flat
              dense
              no-caps
              color="app-danger"
              icon="delete"
              :label="showAutomationActionLabels ? '删除' : undefined"
              :loading="deletingAutomationId === props.row.id"
              :aria-label="`删除扫描自动化 ${actionLabel(props.row.type)}`"
              @click="openDeleteDialog(props.row)"
            />
          </q-td>
        </template>
      </q-table>

      <div class="text-caption app-text-secondary q-mt-sm">
        自动扫描与手动扫描共用同一个扫描进程。到点时若已有扫描运行，本次触发会跳过，不会排队。
      </div>
    </div>

    <q-card v-show="state" class="q-ma-md">
      <q-expansion-item expand-separator>
        <template v-slot:header>
          <q-item-section avatar>
            <q-spinner-gears v-if="state === 'running'" color="app-accent" size="2em" />
            <q-icon v-else-if="state === 'finished'" name="done" color="positive" size="2em" />
            <q-icon v-else-if="state === 'error'" name="error" color="app-danger" size="2em" />
          </q-item-section>

          <q-item-section>
            <q-item-label v-if="allLogs.length > 1" class="ellipsis">{{allLogs[allLogs.length - 2].message}}</q-item-label>
            <q-item-label v-if="allLogs.length > 0" class="ellipsis">{{allLogs[allLogs.length - 1].message}}</q-item-label>
          </q-item-section>
        </template>
        
        <q-scroll-area class="log-scroll bg-dark text-white q-pa-md">
          <ScannerLogList :logs="allLogs" />
        </q-scroll-area>
      </q-expansion-item>
    </q-card>

    <q-card v-show="(tasks.length > 0) || (failedTasks.length > 0)" class="q-ma-md">
      <q-tabs
        v-model="tab"
        dense
        inline-label
        class="app-text-secondary"
        active-color="white"
        active-bg-color="brown"
        indicator-color="yellow"
        align="justify"
        narrow-indicator
      >
        <q-tab name="tasks" icon="hourglass_full" label="处理中">
          <q-badge v-show="tasks.length > 0" color="primary" floating>{{tasks.length}}</q-badge>
        </q-tab>
        <q-tab name="failedTasks" icon="error_outline" label="处理失败">
          <q-badge v-show="failedTasks.length > 0" color="app-danger-fill"
            text-color="app-danger-contrast" floating>{{failedTasks.length}}</q-badge>
        </q-tab>
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="tab" animated>
        <q-tab-panel name="tasks" class="q-pa-none">
          <q-virtual-scroll
            separator
            class="task-list"
            :items="tasks"
            :virtual-scroll-item-size="52"
          >
            <template v-slot="{ item, index }">
              <q-expansion-item expand-separator :key="index">
                <template v-slot:header>
                  <q-item-section avatar>
                    <q-spinner-hourglass color="app-accent" size="2em" />
                  </q-item-section>

                  <q-item-section>
                    <q-item-label v-if="item.logs.length > 0" class="ellipsis">{{item.logs[item.logs.length - 1].message}}</q-item-label>
                    <q-item-label caption>{{ rjLabel(item.workId) }}</q-item-label>
                  </q-item-section>
                </template>
                
                <q-card>
                  <q-card-section class="bg-dark text-white">
                    <ScannerLogList :logs="item.logs" />
                  </q-card-section>
                </q-card>
              </q-expansion-item>
            </template>
          </q-virtual-scroll>
        </q-tab-panel>

        <q-tab-panel name="failedTasks" class="q-pa-none">
          <q-virtual-scroll
            separator
            class="task-list"
            :items="failedTasks"
            :virtual-scroll-item-size="52"
          >
            <template v-slot="{ item, index }">
              <q-expansion-item
                expand-separator
                :key="index"
                expand-icon-class="text-white"
                header-class="bg-app-danger-fill"
              >
                <template v-slot:header>
                  <q-item-section avatar>
                    <q-icon name="error" color="app-danger-contrast" size="2em" />
                  </q-item-section>

                  <q-item-section>
                    <q-item-label class="text-app-danger-contrast ellipsis" >
                      {{item.logs[item.logs.length - 1].message}}
                    </q-item-label>

                    <q-item-label caption class="text-app-danger-contrast">
                      {{ rjLabel(item.workId) }}
                    </q-item-label>
                  </q-item-section>
                </template>
                
                <q-card>
                  <q-card-section class="bg-dark text-white">
                    <ScannerLogList :logs="item.logs" />
                  </q-card-section>
                </q-card>
              </q-expansion-item>
              
            </template>
          </q-virtual-scroll>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <q-dialog v-model="automationDialog" :persistent="savingAutomation">
      <q-card style="width: 560px; max-width: 92vw">
        <q-form @submit="saveAutomation">
          <q-toolbar>
            <q-toolbar-title>
              {{ editingAutomation ? '修改扫描自动化' : '新增扫描自动化' }}
            </q-toolbar-title>
            <q-btn
              flat
              round
              dense
              icon="close"
              aria-label="关闭"
              :disable="savingAutomation"
              @click="closeAutomationDialog"
            />
          </q-toolbar>

          <q-card-section class="q-pt-none">
            <q-select
              v-model="automationForm.type"
              :options="actionOptions"
              emit-value
              map-options
              outlined
              dense
              :disable="savingAutomation"
              label="扫描操作"
              class="q-mb-sm"
            />

            <q-input
              v-model.trim="automationForm.cronExpression"
              outlined
              dense
              label="Cron 表达式"
              hint="五段格式：分 时 日 月 周，例如 0 3 * * *"
              :rules="[validateCronInput]"
              :error="Boolean(cronError)"
              :error-message="cronError"
              :loading="previewLoading"
              :disable="savingAutomation"
              lazy-rules
              class="q-mb-sm"
              @update:model-value="schedulePreview"
              @blur="loadCronPreview"
            />

            <q-toggle
              v-model="automationForm.enabled"
              :disable="savingAutomation"
              label="启用自动化"
              color="app-accent"
            />

            <q-list
              v-if="previewRuns.length > 0"
              dense
              bordered
              class="q-mt-md"
            >
              <q-item v-for="run in previewRuns" :key="run.value">
                <q-item-section avatar>
                  <q-icon name="event" color="app-accent" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-mono">{{ run.label }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn
              flat
              label="取消"
              color="primary"
              :disable="savingAutomation"
              @click="closeAutomationDialog"
            />
            <q-btn
              unelevated
              type="submit"
              :label="editingAutomation ? '保存' : '创建'"
              color="primary"
              :loading="savingAutomation"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteDialog">
      <q-card style="width: 420px; max-width: 90vw">
        <q-card-section class="q-pb-sm">
          <div class="text-h6">删除扫描自动化</div>
          <div class="text-body2 app-text-secondary q-mt-sm">
            确定删除“{{ deletingAutomation ? actionLabel(deletingAutomation.type) : ''
            }} / {{ deletingAutomation ? deletingAutomation.cronExpression : '' }}”？
            已启动的扫描不会因此终止。
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" color="primary" v-close-popup />
          <q-btn
            flat
            label="删除"
            color="negative"
            :loading="Boolean(deletingAutomationId)"
            @click="deleteAutomation"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import NotifyMixin from '../../mixins/Notification.js'
import { formatRJLabel } from '../../utils/rjCode'
import ScannerLogList from '../../components/ScannerLogList.vue'

// socket 不可用时的轮询间隔
const POLL_INTERVAL = 2000

const ACTION_OPTIONS = [
  { label: '扫描本地存储位置', value: 'scan' },
  { label: '刷新作品信息', value: 'update' },
  { label: '扫描标签列表', value: 'tags' },
  { label: '扫描字幕', value: 'subtitles' },
  { label: '修复封面', value: 'covers' }
]

const ACTION_LABELS = Object.fromEntries(
  ACTION_OPTIONS.map(option => [option.value, option.label])
)

const TRIGGER_STATUS_LABELS = {
  started: '已启动',
  skipped_busy: '扫描忙，已跳过',
  error: '启动失败'
}

export default {
  name: 'Scanner',

  mixins: [NotifyMixin],

  components: {
    ScannerLogList
  },

  data () {
    return {
      tab: 'tasks',
      state: null, // ['running', 'finished', 'error']
      socketConnected: false, // socket 是否可用（响应式，模板据此禁用按钮）
      polling: false, // 是否正在用轮询兜底
      pollTimer: null,
      finishedMessage: null, // 扫描结束时服务端给出的总结
      finishedLevel: 'info',
      tasks: [], // 正在处理中的并行任务
      failedTasks: [], // 处理失败的任务
      mainLogs: [],
      results: [],

      automations: [],
      tableLoading: false,
      tableRequestId: 0,
      loadingAutomationId: null,
      deletingAutomationId: null,
      automationDialog: false,
      editingAutomation: null,
      savingAutomation: false,
      deleteDialog: false,
      deletingAutomation: null,
      previewTimer: null,
      previewRequestId: 0,
      previewLoading: false,
      previewRuns: [],
      cronError: '',
      actionOptions: ACTION_OPTIONS,
      automationForm: {
        type: 'scan',
        cronExpression: '',
        enabled: true
      },
      automationColumns: [
        {
          name: 'index',
          label: '#',
          align: 'right',
          headerStyle: 'width: 4%'
        },
        {
          name: 'type',
          required: true,
          label: '扫描操作',
          align: 'left',
          field: 'type',
          sortable: true,
          headerStyle: 'width: 16%'
        },
        {
          name: 'cronExpression',
          required: true,
          label: 'Cron',
          align: 'left',
          field: 'cronExpression',
          sortable: true,
          headerStyle: 'width: 18%'
        },
        {
          name: 'nextRunAt',
          required: true,
          label: '下次执行',
          align: 'left',
          field: 'nextRunAt',
          sortable: true,
          headerStyle: 'width: 18%'
        },
        {
          name: 'lastTriggeredAt',
          label: '上次触发',
          align: 'left',
          field: 'lastTriggeredAt',
          sortable: true,
          headerStyle: 'width: 17%'
        },
        {
          name: 'enabled',
          required: true,
          label: '状态',
          align: 'center',
          field: row => Number(row.enabled),
          sortable: true,
          headerStyle: 'width: 9%'
        },
        {
          name: 'actions',
          label: '操作',
          align: 'center',
          field: 'actions',
          sortable: false,
          headerStyle: 'width: 18%'
        }
      ]
    }
  },

  sockets: {
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
    },
    SCAN_ERROR () {
      this.state = 'error'
    },
    SCAN_AUTOMATION_UPDATED () {
      this.requestAutomations()
    },
    SCAN_AUTOMATIONS_CHANGED () {
      this.requestAutomations()
    },

    // 服务端每次（重）连成功都会推 success，把它当作「主通道可用」的信号
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

  methods: {
    rjLabel (workId) {
      return workId ? formatRJLabel(workId) : ''
    },

    actionLabel (type) {
      return ACTION_LABELS[type] || type
    },

    triggerStatusLabel (status) {
      return TRIGGER_STATUS_LABELS[status] || status
    },

    triggerStatusClass (status) {
      return status === 'error' ? 'text-app-danger' : 'app-text-secondary'
    },

    validateCronInput (value) {
      return Boolean(value && value.trim()) || '请输入 Cron 表达式'
    },

    showRequestError (error, fallback = '操作失败') {
      if (error.response && error.response.status === 401) return
      if (!error.response) {
        this.showErrNotif(error.message || fallback)
        return
      }

      const data = error.response.data || {}
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        this.showErrNotif(data.errors[0].msg)
      } else {
        this.showErrNotif(data.error || `${error.response.status} ${fallback}`)
      }
    },

    async requestAutomations () {
      const requestId = ++this.tableRequestId
      this.tableLoading = true
      try {
        const response = await this.$axios.get('/api/scanner/automations')
        if (requestId !== this.tableRequestId) return
        this.automations = response.data.automations || []
      } catch (error) {
        if (requestId !== this.tableRequestId) return
        this.showRequestError(error, '加载扫描自动化失败')
      } finally {
        if (requestId === this.tableRequestId) {
          this.tableLoading = false
        }
      }
    },

    openCreateDialog () {
      this.editingAutomation = null
      this.automationForm = {
        type: 'scan',
        cronExpression: '',
        enabled: true
      }
      this.previewRuns = []
      this.cronError = ''
      this.previewLoading = false
      this.automationDialog = true
    },

    openEditDialog (automation) {
      this.editingAutomation = automation
      this.automationForm = {
        type: automation.type,
        cronExpression: automation.cronExpression,
        enabled: automation.enabled
      }
      this.previewRuns = []
      this.cronError = ''
      this.previewLoading = false
      this.automationDialog = true
      this.loadCronPreview()
    },

    closeAutomationDialog () {
      if (this.savingAutomation) return
      if (this.previewTimer) {
        clearTimeout(this.previewTimer)
        this.previewTimer = null
      }
      this.previewRequestId += 1
      this.previewLoading = false
      this.automationDialog = false
      this.editingAutomation = null
      this.previewRuns = []
      this.cronError = ''
    },

    schedulePreview () {
      this.previewRequestId += 1
      if (this.previewTimer) clearTimeout(this.previewTimer)
      this.previewLoading = false
      this.previewRuns = []
      this.cronError = ''
      if (!this.automationForm.cronExpression.trim()) return

      this.previewTimer = setTimeout(this.loadCronPreview, 350)
    },

    async loadCronPreview () {
      if (this.previewTimer) {
        clearTimeout(this.previewTimer)
        this.previewTimer = null
      }
      const expression = this.automationForm.cronExpression.trim()
      if (!expression) {
        this.previewRuns = []
        return false
      }

      const requestId = ++this.previewRequestId
      this.previewLoading = true
      try {
        const response = await this.$axios.post('/api/scanner/automations/preview', {
          cronExpression: expression
        })
        if (requestId !== this.previewRequestId) return false
        this.automationForm.cronExpression = response.data.cronExpression
        this.previewRuns = response.data.nextRuns || []
        this.cronError = ''
        return true
      } catch (error) {
        if (requestId !== this.previewRequestId) return false
        const data = error.response && error.response.data
        this.cronError = data
          ? (data.errors && data.errors[0] && data.errors[0].msg) || data.error || 'Cron 表达式无效'
          : (error.message || 'Cron 表达式无效')
        this.previewRuns = []
        return false
      } finally {
        if (requestId === this.previewRequestId) {
          this.previewLoading = false
        }
      }
    },

    async saveAutomation () {
      if (this.savingAutomation) return
      if (!await this.loadCronPreview()) return

      this.savingAutomation = true
      try {
        if (this.editingAutomation) {
          await this.$axios.put(`/api/scanner/automations/${this.editingAutomation.id}`, {
            type: this.automationForm.type,
            cronExpression: this.automationForm.cronExpression,
            enabled: this.automationForm.enabled
          })
          this.showSuccNotif('扫描自动化已更新')
        } else {
          await this.$axios.post('/api/scanner/automations', {
            type: this.automationForm.type,
            cronExpression: this.automationForm.cronExpression,
            enabled: this.automationForm.enabled
          })
          this.showSuccNotif('扫描自动化已创建')
        }

        this.automationDialog = false
        this.editingAutomation = null
        await this.requestAutomations()
      } catch (error) {
        this.showRequestError(error, '保存扫描自动化失败')
      } finally {
        this.savingAutomation = false
      }
    },

    async toggleAutomation (automation) {
      if (this.loadingAutomationId) return
      this.loadingAutomationId = automation.id
      try {
        await this.$axios.put(`/api/scanner/automations/${automation.id}`, {
          enabled: !automation.enabled
        })
        this.showSuccNotif(`已${automation.enabled ? '停用' : '启用'}扫描自动化`)
        await this.requestAutomations()
      } catch (error) {
        this.showRequestError(error, '修改扫描自动化状态失败')
      } finally {
        this.loadingAutomationId = null
      }
    },

    openDeleteDialog (automation) {
      this.deletingAutomation = automation
      this.deleteDialog = true
    },

    async deleteAutomation () {
      if (!this.deletingAutomation || this.deletingAutomationId) return
      const automation = this.deletingAutomation
      this.deletingAutomationId = automation.id
      try {
        await this.$axios.delete(`/api/scanner/automations/${automation.id}`)
        this.deleteDialog = false
        this.deletingAutomation = null
        this.showSuccNotif('扫描自动化已删除')
        await this.requestAutomations()
      } catch (error) {
        this.showRequestError(error, '删除扫描自动化失败')
      } finally {
        this.deletingAutomationId = null
      }
    },

    performScan () {
      this.resetScanState()
      this.state = 'running'
      this.$socket.emit('PERFORM_SCAN')
    },

    performUpdate () {
      this.resetScanState()
      this.state = 'running'
      this.$socket.emit('PERFORM_UPDATE')
    },

    performTagScan () {
      this.resetScanState()
      this.state = 'running'
      this.$socket.emit('PERFORM_TAG_SCAN')
    },

    performSubtitleScan () {
      this.resetScanState()
      this.state = 'running'
      this.$socket.emit('PERFORM_SUBTITLE_SCAN')
    },

    // 只维护封面：补缺失、重新生成过期缩略图、把本地生成的降级图换成 DLsite 原图
    repairCovers () {
      this.resetScanState()
      this.state = 'running'
      this.$socket.emit('PERFORM_COVER_REPAIR')
    },

    resetScanState () {
      this.tasks = []
      this.failedTasks = []
      this.mainLogs = []
      this.results = []
      this.finishedMessage = null
      this.finishedLevel = 'info'
    },

    // ---- 主通道（socket）状态 ----

    handleSocketUp () {
      const wasPolling = this.polling

      const resume = () => {
        this.socketConnected = true
        this.stopPolling()
        // 若此刻仍有扫描在跑，让服务端把实时状态重推一次，之后交回 socket
        this.$socket.emit('ON_SCANNER_PAGE')
      }

      // 首次连接（没经历过断线）不用补数据，保持和原来一致的页面行为
      if (!wasPolling) {
        resume()
        return
      }

      this.$axios.get('/api/scanner/state')
        .then((response) => {
          // 补上断线期间可能错过的最终状态（例如扫描在断线时已经结束）
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

    // ---- 兜底：轮询 /api/scanner/state ----

    startPolling () {
      if (this.pollTimer) return
      this.polling = true
      this.fetchScanState() // 立即拉一次，不用等第一个间隔
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
          // token 失效时停掉轮询，交由路由跳登录页
          if (error.response && error.response.status === 401) {
            this.stopPolling()
          }
        })
    },

    applyScanState (scanState) {
      if (!scanState || !scanState.status) return

      this.state = scanState.status
      this.tasks = scanState.tasks || []
      this.failedTasks = scanState.failedTasks || []
      this.mainLogs = scanState.mainLogs || []
      this.results = scanState.results || []
      this.finishedMessage = scanState.status === 'finished' ? scanState.message : null
      this.finishedLevel = scanState.messageLevel || 'info'
    }
  },

  computed: {
    enabledCount () {
      return this.automations.filter(automation => automation.enabled).length
    },

    isNarrowScreen () {
      return this.$q.screen.lt.sm
    },

    showAutomationActionLabels () {
      return this.$q.screen.gt.md
    },

    automationVisibleColumns () {
      if (this.isNarrowScreen) return ['type', 'nextRunAt', 'actions']
      if (this.$q.screen.lt.md) return ['type', 'cronExpression', 'nextRunAt', 'enabled', 'actions']
      return void 0
    },

    allLogs () {
      const resultLogs = this.results.map(res => {
        if (res.log) return res.log

        const rjLabel = res.workId ? formatRJLabel(res.workId) : ''
        if (res.result === 'added') {
          return {
            level: 'success',
            type: 'item',
            depth: 2,
            message: `[${rjLabel}] 添加成功`
          }
        } else if (res.result === 'repaired') {
          return {
            level: 'success',
            type: 'item',
            depth: 2,
            message: `[${rjLabel}] 封面修复成功`
          }
        } else if (res.result === 'upgraded') {
          return {
            level: 'success',
            type: 'item',
            depth: 2,
            message: `[${rjLabel}] 封面升级成功`
          }
        } else if (res.result === 'updated') {
          return {
            level: 'success',
            type: 'item',
            depth: 2,
            message: `[${rjLabel}] 更新成功`
          }
        } else {
          return {
            level: 'error',
            type: 'item',
            depth: 2,
            message: `[${rjLabel}] 处理失败`
          }
        }
      })

      const logsById = new Map()
      this.mainLogs.concat(resultLogs).forEach((log, index) => {
        logsById.set(log.id ?? `legacy:${index}`, log)
      })
      const logs = Array.from(logsById.values()).sort((left, right) => {
        return (left.id ?? Number.MAX_SAFE_INTEGER) -
          (right.id ?? Number.MAX_SAFE_INTEGER)
      })

      // 结束语由 SCAN_FINISHED 单独给出，不混进 mainLogs / results
      if (this.finishedMessage) {
        logs.push({
          level: this.finishedLevel,
          type: 'summary',
          depth: 0,
          message: this.finishedMessage
        })
      }

      return logs
    }
  },

  created () {
    this.requestAutomations()
  },

  mounted () {
    this.socketConnected = this.$socket.connected
    if (!this.socketConnected) {
      this.startPolling()
    }
    this.$socket.emit('ON_SCANNER_PAGE')
  },

  beforeUnmount () {
    this.stopPolling()
    if (this.previewTimer) clearTimeout(this.previewTimer)
  }
}
</script>

<style lang="scss" scoped>
// 扫描日志与任务列表的视口高度：两边都一样，切 tab 时不会来回跳
.log-scroll {
  height: 256px;
}

.task-list {
  max-height: 313px;
}
</style>
