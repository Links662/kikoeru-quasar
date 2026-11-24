<template>
  <q-page class="q-px-md q-pt-md q-pb-md">
    <div class="row no-wrap items-center justify-between q-mb-sm">
      <div class="col">
        <div class="text-h5 text-weight-regular">存储管理</div>
        <div class="text-caption app-text-secondary">
          共 {{ config.rootFolders.length }} 个存储目录
        </div>
      </div>
    </div>

    <div class="row no-wrap items-center justify-end q-mb-sm">
      <div class="col-auto">
        <q-btn
          outline
          no-caps
          color="app-accent"
          icon="create_new_folder"
          label="新增目录"
          aria-label="新增存储目录"
          @click="openFolderDialog"
        />
      </div>
    </div>

    <q-table
      class="list-table admin-data-table"
      :rows="config.rootFolders"
      :columns="columns"
      row-key="name"
      :loading="tableLoading"
      :visible-columns="visibleColumns"
      binary-state-sort
      hide-pagination
      flat
      bordered
      dense
      wrap-cells
      no-data-label="尚未添加存储目录"
      loading-label="正在加载存储目录..."
      table-header-class="app-text"
    >
      <template v-slot:no-data="{ message }">
        <template v-if="!tableLoading">
          <q-icon class="q-table__bottom-nodata-icon" name="folder_off" />
          {{ message }}
          <q-btn
            v-if="config.rootFolders.length === 0"
            outline
            no-caps
            color="app-accent"
            icon="create_new_folder"
            label="新增目录"
            class="q-mt-md"
            @click="openFolderDialog"
          />
        </template>
      </template>

      <template v-slot:body-cell-index="props">
        <q-td :props="props" class="app-text-secondary">
          {{ props.rowIndex + 1 }}
        </q-td>
      </template>

      <template v-slot:body-cell-name="props">
        <q-td :props="props">
          <div class="row no-wrap items-center">
            <q-icon color="amber" name="folder" class="q-mr-sm" />
            <span class="text-weight-medium">{{ props.row.name }}</span>
          </div>
          <div
            v-if="isNarrowScreen"
            class="text-caption app-text-secondary q-mt-xs storage-path"
          >
            {{ props.row.path }}
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-path="props">
        <q-td :props="props">
          <span class="storage-path">{{ props.row.path }}</span>
        </q-td>
      </template>

      <template v-slot:body-cell-maxRecursionDepth="props">
        <q-td :props="props">
          {{ props.row.maxRecursionDepth }}
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
            :label="showActionLabels ? '修改' : undefined"
            :aria-label="`编辑存储目录 ${props.row.name}`"
            @click="openEditFolderDialog(props.row)"
          />
          <q-btn
            flat
            dense
            no-caps
            color="app-danger"
            icon="delete"
            :label="showActionLabels ? '删除' : undefined"
            :loading="deletingFolder === props.row.name"
            :disable="Boolean(deletingFolder) && deletingFolder !== props.row.name"
            :aria-label="`删除存储目录 ${props.row.name}`"
            @click="removeFromRootFolders(props.row)"
          />
        </q-td>
      </template>
    </q-table>

    <q-form @submit="onSubmit" class="q-mt-md">

      <q-card class="q-mb-md">
        <q-toolbar>
          <q-toolbar-title>其他目录</q-toolbar-title>
        </q-toolbar>

        <q-list>
          <q-item class="other-directory-item column items-stretch">
            <q-item-section>
              <div class="row no-wrap items-center">
                <q-icon color="amber" name="image" size="20px" class="q-mr-sm" />
                <q-item-label class="text-subtitle1 text-weight-medium">封面目录</q-item-label>
              </div>
            </q-item-section>
            <q-item-section>
              <div class="text-body2 app-text-secondary">
                用于保存作品封面及缩略图；勾选默认时使用程序所在位置下的 covers 目录。
              </div>
            </q-item-section>
            <q-item-section>
              <div class="row no-wrap items-center">
                <q-input
                  v-model.trim="config.coverFolderDir"
                  outlined
                  dense
                  required
                  aria-label="封面目录路径"
                  :disable="config.coverUseDefaultPath"
                  class="col storage-folder-input"
                />
                <q-checkbox
                  v-model="config.coverUseDefaultPath"
                  dense
                  label="默认"
                  color="app-accent"
                  aria-label="封面目录使用默认路径"
                  class="q-ml-md"
                />
              </div>
            </q-item-section>
          </q-item>

          <q-separator />

          <q-item class="other-directory-item column items-stretch">
            <q-item-section>
              <div class="row no-wrap items-center">
                <q-icon color="amber" name="storage" size="20px" class="q-mr-sm" />
                <q-item-label class="text-subtitle1 text-weight-medium">数据库目录</q-item-label>
              </div>
            </q-item-section>
            <q-item-section>
              <div class="text-body2 app-text-secondary">
                用于保存作品数据库；勾选默认时使用程序所在位置下的 sqlite 目录。修改后需要重启程序。
              </div>
            </q-item-section>
            <q-item-section>
              <div class="row no-wrap items-center">
                <q-input
                  v-model.trim="config.databaseFolderDir"
                  outlined
                  dense
                  required
                  aria-label="数据库目录路径"
                  :disable="config.dbUseDefaultPath"
                  class="col storage-folder-input"
                />
                <q-checkbox
                  v-model="config.dbUseDefaultPath"
                  dense
                  label="默认"
                  color="app-accent"
                  aria-label="数据库目录使用默认路径"
                  class="q-ml-md"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <q-card class="q-mb-md">
        <q-toolbar>
          <q-toolbar-title>目录扫描设置</q-toolbar-title>
        </q-toolbar>

        <q-list>
          <q-item>
            <q-item-section>
              <q-item-label>扫描时跳过清理失效作品</q-item-label>
              <q-item-label caption>是否跳过清理已不存在的作品（不推荐，默认不跳过）</q-item-label>
            </q-item-section>

            <q-item-section side>
              <q-checkbox
                v-model="config.skipCleanup"
                dense
                color="app-accent"
                aria-label="扫描时跳过清理失效作品"
              />
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section>
              <q-item-label>封面升级间隔（天）</q-item-label>
              <q-item-label caption>
                本地由大图生成的缩略图，隔多少天尝试换成 DLsite 原图；0 表示每次扫描都试。默认 7
              </q-item-label>
            </q-item-section>

            <q-item-section side>
              <q-input
                v-model.number="config.coverUpgradeIntervalDays"
                aria-label="封面升级间隔"
                type="number"
                input-class="text-right"
                class="admin-field"
              />
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section>
              <q-item-label>参与升级的缩略图</q-item-label>
              <q-item-label caption>
                sam 是原图的等比缩略图（本地生成会丢掉原图上下部分，降级最明显）；
                240x240 与 DLsite 的差异只是多一次压缩
              </q-item-label>
            </q-item-section>

            <q-item-section side>
              <q-select
                v-model="config.coverUpgradeTypes"
                aria-label="参与升级的缩略图"
                :options="coverUpgradeOptions"
                multiple
                use-chips
                dense
                options-dense
                behavior="menu"
                dropdown-icon="keyboard_arrow_down"
                class="admin-field"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <div class="q-ma-lg row justify-end">
        <q-btn unelevated :loading="loading" label="保存" type="submit" color="primary" />
      </div>
    </q-form>
  </q-page>

  <q-dialog v-model="folderDialog" :persistent="savingFolder">
    <q-card style="width: 520px; max-width: 90vw">
      <q-form ref="folderForm" @submit="onSubmitRootFolder">
        <q-toolbar>
          <q-toolbar-title>{{ folderDialogTitle }}</q-toolbar-title>
          <q-btn
            flat
            round
            dense
            icon="close"
            aria-label="关闭"
            :disable="savingFolder"
            @click="closeFolderDialog"
          />
        </q-toolbar>

        <q-card-section class="q-pt-none">
          <q-input
            v-model.trim="rootFolder.name"
            outlined
            dense
            required
            label="名称"
            :rules="[validateFolderName]"
            lazy-rules
            class="q-mb-sm"
          />

          <q-input
            v-model.trim="rootFolder.path"
            outlined
            dense
            required
            label="目录路径"
            :rules="[validateFolderPath]"
            lazy-rules
            class="q-mb-sm"
          />

          <q-input
            v-model.number="rootFolder.maxRecursionDepth"
            outlined
            dense
            required
            type="number"
            min="1"
            step="1"
            label="最大递归扫描深度"
            :rules="[validateRecursionDepth]"
            lazy-rules
          />

          <div class="text-caption app-text-secondary q-mt-sm">
            1 表示只扫描根目录；2 表示再扫描一层子目录，依此类推。
            <span v-if="isEditingFolder">修改名称或目录路径后，请重新扫描以更新作品来源。</span>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="取消"
            color="primary"
            :disable="savingFolder"
            @click="closeFolderDialog"
          />
          <q-btn
            unelevated
            type="submit"
            :label="folderDialogSubmitLabel"
            color="primary"
            :loading="savingFolder"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
import NotifyMixin from '../../mixins/Notification.js'

export default {
  name: 'Folders',

  mixins: [NotifyMixin],

  data () {
    return {
      config: {
        rootFolders: []
      },
      tableLoading: false,
      columns: [
        {
          name: 'index',
          label: '#',
          align: 'right',
          headerStyle: 'width: 5%'
        },
        {
          name: 'name',
          required: true,
          label: '名称',
          align: 'left',
          field: 'name',
          sortable: true,
          headerStyle: 'width: 21%'
        },
        {
          name: 'path',
          label: '目录路径',
          align: 'left',
          field: 'path',
          sortable: true,
          headerStyle: 'width: 39%'
        },
        {
          name: 'maxRecursionDepth',
          label: '扫描深度',
          align: 'center',
          field: 'maxRecursionDepth',
          sortable: true,
          headerStyle: 'width: 13%'
        },
        {
          name: 'actions',
          label: '操作',
          align: 'center',
          field: 'actions',
          sortable: false,
          headerStyle: 'width: 22%'
        }
      ],
      rootFolder: {
        name: '',
        path: '',
        maxRecursionDepth: 2
      },
      folderDialog: false,
      folderDialogMode: 'create',
      editingFolderOriginalName: '',
      savingFolder: false,
      deletingFolder: '',
      // 封面升级只针对这两张缩略图（main 是原图，没有升级一说）
      coverUpgradeOptions: ['sam', '240x240'],
      loading: false
    }
  },

  computed: {
    isNarrowScreen () {
      return this.$q.screen.lt.sm
    },

    showActionLabels () {
      return this.$q.screen.gt.sm
    },

    visibleColumns () {
      if (this.isNarrowScreen) return ['name', 'maxRecursionDepth', 'actions']
      if (this.$q.screen.lt.md) return ['name', 'path', 'maxRecursionDepth', 'actions']
      return void 0
    },

    isEditingFolder () {
      return this.folderDialogMode === 'edit'
    },

    folderDialogTitle () {
      return this.isEditingFolder ? '编辑存储目录' : '新增存储目录'
    },

    folderDialogSubmitLabel () {
      return this.isEditingFolder ? '保存' : '添加'
    }
  },

  methods: {
    async requestConfig () {
      this.tableLoading = true
      try {
        const response = await this.$axios.get('/api/config/admin')
        const legacyMaxRecursionDepth = Number(response.data.config.scannerMaxRecursionDepth)
        const fallbackDepth = Number.isInteger(legacyMaxRecursionDepth) && legacyMaxRecursionDepth >= 1
          ? legacyMaxRecursionDepth
          : 2
        this.config = {
          ...response.data.config,
          rootFolders: Array.isArray(response.data.config.rootFolders)
            ? response.data.config.rootFolders.map(folder => {
                const maxRecursionDepth = Number(folder.maxRecursionDepth)
                return {
                  ...folder,
                  maxRecursionDepth: Number.isInteger(maxRecursionDepth) && maxRecursionDepth >= 1
                    ? maxRecursionDepth
                    : fallbackDepth
                }
              })
            : []
        }
      } catch (error) {
        this.showRequestError(error, '加载存储设置失败')
      } finally {
        this.tableLoading = false
      }
    },

    showRequestError (error, fallback) {
      if (error.response && error.response.status === 401) return
      if (!error.response) {
        this.showErrNotif(error.message || fallback)
        return
      }
      this.showErrNotif(
        error.response.data.error ||
        `${error.response.status} ${error.response.statusText || fallback}`
      )
    },

    saveConfig (config) {
      return this.$axios.put('/api/config/admin', { config })
    },

    async onSubmit () {
      if (this.loading) return
      this.loading = true
      try {
        await this.saveConfig(this.config)
        this.showSuccNotif('设置已保存')
      } catch (error) {
        this.showRequestError(error, '保存设置失败')
      } finally {
        this.loading = false
      }
    },

    validateFolderName (value) {
      const name = (value || '').trim()
      if (!name) return '请输入目录名称'
      return !this.config.rootFolders.some(folder => (
        folder.name === name && folder.name !== this.editingFolderOriginalName
      )) ||
        '该名称已存在，目录名称不能重复'
    },

    validateFolderPath (value) {
      const path = (value || '').trim()
      if (!path) return '请输入目录路径'
      return !this.config.rootFolders.some(folder => (
        folder.path === path && folder.name !== this.editingFolderOriginalName
      )) ||
        '该路径已存在，目录路径不能重复'
    },

    validateRecursionDepth (value) {
      const depth = Number(value)
      return (Number.isInteger(depth) && depth >= 1) || '扫描深度必须是大于等于 1 的整数'
    },

    openFolderDialog () {
      this.folderDialogMode = 'create'
      this.editingFolderOriginalName = ''
      this.rootFolder = {
        name: '',
        path: this.config.voiceWorkDefaultPath || '',
        maxRecursionDepth: 2
      }
      this.folderDialog = true
      this.$nextTick(() => {
        if (this.$refs.folderForm) this.$refs.folderForm.resetValidation()
      })
    },

    openEditFolderDialog (folder) {
      this.folderDialogMode = 'edit'
      this.editingFolderOriginalName = folder.name
      this.rootFolder = { ...folder }
      this.folderDialog = true
      this.$nextTick(() => {
        if (this.$refs.folderForm) this.$refs.folderForm.resetValidation()
      })
    },

    closeFolderDialog () {
      if (this.savingFolder) return
      this.folderDialog = false
      this.folderDialogMode = 'create'
      this.editingFolderOriginalName = ''
      this.rootFolder = {
        name: '',
        path: '',
        maxRecursionDepth: 2
      }
    },

    async onSubmitRootFolder () {
      if (this.savingFolder) return

      const folder = {
        name: this.rootFolder.name.trim(),
        path: this.rootFolder.path.trim(),
        maxRecursionDepth: Number(this.rootFolder.maxRecursionDepth)
      }
      if (!this.validateFolderName(folder.name) || !this.validateFolderPath(folder.path)) return
      if (this.validateRecursionDepth(folder.maxRecursionDepth) !== true) return

      const nextConfig = {
        ...this.config,
        rootFolders: this.isEditingFolder
          ? this.config.rootFolders.map(item => (
              item.name === this.editingFolderOriginalName
                ? folder
                : item
            ))
          : [...this.config.rootFolders, folder]
      }
      const isEditing = this.isEditingFolder

      this.savingFolder = true
      try {
        await this.saveConfig(nextConfig)
        this.config = nextConfig
        this.folderDialog = false
        const action = isEditing ? '更新' : '添加'
        this.showSuccNotif(`已${action}存储目录 ${folder.name}`)
        this.folderDialogMode = 'create'
        this.editingFolderOriginalName = ''
      } catch (error) {
        this.showRequestError(error, isEditing ? '编辑存储目录失败' : '新增存储目录失败')
      } finally {
        this.savingFolder = false
      }
    },

    async removeFromRootFolders (folder) {
      if (this.deletingFolder) return

      const nextConfig = {
        ...this.config,
        rootFolders: this.config.rootFolders.filter(item => item.name !== folder.name)
      }

      this.deletingFolder = folder.name
      try {
        await this.saveConfig(nextConfig)
        this.config = nextConfig
        this.showSuccNotif(`已删除存储目录 ${folder.name}`)
      } catch (error) {
        this.showRequestError(error, '删除存储目录失败')
      } finally {
        this.deletingFolder = ''
      }
    }
  },

  created () {
    this.requestConfig()
  }
}
</script>

<style lang="scss" scoped>
.storage-path {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.storage-folder-input {
  min-width: 0;
}

.other-directory-item {
  flex-direction: column;
  align-items: stretch;
  row-gap: 0.5rem;
}

.other-directory-item {
  row-gap: 0.5rem;
}
</style>
