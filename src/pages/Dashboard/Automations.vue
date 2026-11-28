<template>
  <div>
    <div class="q-ma-md">
      <div class="row no-wrap items-center justify-between q-mb-sm">
        <div class="col">
          <div class="text-h6 text-weight-regular">定时任务</div>
          <div class="text-caption app-text-secondary">
            共 {{ automations.length }} 项，其中 {{ enabledCount }} 项已启用。
          </div>
        </div>

        <div class="col-auto">
          <q-btn
            outline
            no-caps
            color="app-accent"
            icon="schedule"
            label="新增定时任务"
            aria-label="新增定时任务"
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
        no-data-label="尚未配置定时任务"
        loading-label="正在加载定时任务..."
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
              {{ props.row.enabled ? '已启用' : '已禁用' }}
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
              :aria-label="`修改定时任务 ${actionLabel(props.row.type)}`"
              @click="openEditDialog(props.row)"
            />
            <q-btn
              flat
              dense
              no-caps
              :color="props.row.enabled ? 'app-danger' : 'app-accent'"
              :icon="props.row.enabled ? 'block' : 'check_circle'"
              :label="showAutomationActionLabels ? (props.row.enabled ? '禁用' : '启用') : undefined"
              :loading="loadingAutomationId === props.row.id"
              :aria-label="`${props.row.enabled ? '禁用' : '启用'}定时任务 ${actionLabel(props.row.type)}`"
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
              :aria-label="`删除定时任务 ${actionLabel(props.row.type)}`"
              @click="openDeleteDialog(props.row)"
            />
          </q-td>
        </template>
      </q-table>

      <div class="text-caption app-text-secondary q-mt-sm">
        定时任务与手动任务共用同一个扫描进程。到点时若已有任务运行，本次触发会跳过，不会排队。
      </div>
    </div>

    <q-dialog v-model="automationDialog" :persistent="savingAutomation">
      <q-card class="admin-form-dialog">
        <q-form @submit="saveAutomation">
          <q-card-section class="row items-center no-wrap q-px-md q-pt-md q-pb-none">
            <div class="col">
              <div class="text-h6">
                {{ editingAutomation ? '修改定时任务' : '新增定时任务' }}
              </div>
            </div>
            <q-btn
              flat
              round
              dense
              icon="close"
              aria-label="关闭"
              :disable="savingAutomation"
              @click="closeAutomationDialog"
            />
          </q-card-section>

          <q-card-section class="q-px-md q-pt-sm q-pb-none">
            <q-select
              v-model="automationForm.type"
              :options="actionOptions"
              emit-value
              map-options
              outlined
              dense
              :disable="savingAutomation"
              label="任务类型"
              class="q-mb-sm"
            />

            <q-input
              v-model.trim="automationForm.cronExpression"
              outlined
              dense
              label="Cron 表达式"
              hint="五段格式：分 时 日 月 周，例如 0 3 * * *"
              :error="Boolean(cronError)"
              :error-message="cronError"
              :disable="savingAutomation"
              class="q-mb-sm"
              @update:model-value="clearCronError"
            />

            <q-toggle
              v-model="automationForm.enabled"
              :disable="savingAutomation"
              label="启用定时任务"
              color="app-accent"
            />
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pt-sm q-pb-sm">
            <q-btn
              flat
              no-caps
              label="取消"
              color="app-accent"
              :disable="savingAutomation"
              @click="closeAutomationDialog"
            />
            <q-btn
              flat
              no-caps
              type="submit"
              :label="editingAutomation ? '保存' : '创建'"
              color="app-accent"
              :loading="savingAutomation"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteDialog">
      <q-card style="width: 420px; max-width: 90vw">
        <q-card-section class="q-pb-sm">
          <div class="text-h6">删除定时任务</div>
          <div class="text-body2 app-text-secondary q-mt-sm">
            确定删除“{{ deletingAutomation ? actionLabel(deletingAutomation.type) : '' }}
            / {{ deletingAutomation ? deletingAutomation.cronExpression : '' }}”？
            已启动的任务不会因此终止。
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
  skipped_busy: '任务忙，已跳过',
  error: '启动失败'
}

export default {
  name: 'CollectionAutomations',

  mixins: [NotifyMixin],

  data () {
    return {
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
          label: '任务类型',
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
    SCAN_AUTOMATION_UPDATED () {
      this.requestAutomations()
    },
    SCAN_AUTOMATIONS_CHANGED () {
      this.requestAutomations()
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
      if (this.$q.screen.lt.md) {
        return ['type', 'cronExpression', 'nextRunAt', 'enabled', 'actions']
      }
      return void 0
    }
  },

  methods: {
    actionLabel (type) {
      return ACTION_LABELS[type] || type
    },

    triggerStatusLabel (status) {
      return TRIGGER_STATUS_LABELS[status] || status
    },

    triggerStatusClass (status) {
      return status === 'error' ? 'text-app-danger' : 'app-text-secondary'
    },

    clearCronError () {
      this.cronError = ''
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
        this.showRequestError(error, '加载定时任务失败')
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
      this.cronError = ''
      this.automationDialog = true
    },

    openEditDialog (automation) {
      this.editingAutomation = automation
      this.automationForm = {
        type: automation.type,
        cronExpression: automation.cronExpression,
        enabled: automation.enabled
      }
      this.cronError = ''
      this.automationDialog = true
    },

    closeAutomationDialog () {
      if (this.savingAutomation) return
      this.automationDialog = false
      this.editingAutomation = null
      this.cronError = ''
    },

    showAutomationSaveError (error) {
      if (error.response && error.response.status === 400) {
        const data = error.response.data || {}
        this.cronError = (data.errors && data.errors[0] && data.errors[0].msg) ||
          data.error ||
          'Cron 表达式无效'
        return
      }
      this.showRequestError(error, '保存定时任务失败')
    },

    async saveAutomation () {
      if (this.savingAutomation) return
      this.savingAutomation = true
      try {
        if (this.editingAutomation) {
          await this.$axios.put(`/api/scanner/automations/${this.editingAutomation.id}`, {
            type: this.automationForm.type,
            cronExpression: this.automationForm.cronExpression,
            enabled: this.automationForm.enabled
          })
          this.showSuccNotif('定时任务已更新')
        } else {
          await this.$axios.post('/api/scanner/automations', {
            type: this.automationForm.type,
            cronExpression: this.automationForm.cronExpression,
            enabled: this.automationForm.enabled
          })
          this.showSuccNotif('定时任务已创建')
        }

        this.automationDialog = false
        this.editingAutomation = null
        await this.requestAutomations()
      } catch (error) {
        this.showAutomationSaveError(error)
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
        this.showSuccNotif(`已${automation.enabled ? '禁用' : '启用'}定时任务`)
        await this.requestAutomations()
      } catch (error) {
        this.showRequestError(error, '修改定时任务状态失败')
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
        this.showSuccNotif('定时任务已删除')
        await this.requestAutomations()
      } catch (error) {
        this.showRequestError(error, '删除定时任务失败')
      } finally {
        this.deletingAutomationId = null
      }
    }
  },

  created () {
    this.requestAutomations()
  }
}
</script>
