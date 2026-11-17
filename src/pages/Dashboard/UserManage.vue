<template>
  <q-page class="q-px-md q-pt-md q-pb-md">
    <div class="row no-wrap items-center justify-between q-mb-sm">
      <div class="user-heading col">
        <div class="text-h5 text-weight-regular">用户管理</div>
        <div class="text-caption app-text-secondary">
          共 {{ users.length }} 个账号，其中 {{ enabledUserCount }} 个已启用
        </div>
      </div>

      <div class="row no-wrap items-center col-auto">
        <div v-if="!isNarrowScreen" class="user-search-wrap q-ml-md">
          <SearchInput
            v-model="search"
            debounce="200"
            placeholder="搜索用户名…"
            class="full-width"
          />
        </div>
      </div>
    </div>

    <div v-if="isNarrowScreen" class="q-mb-sm">
      <SearchInput
        v-model="search"
        debounce="200"
        placeholder="搜索用户名…"
        class="full-width"
      />
    </div>

    <div class="row items-center q-col-gutter-sm q-mb-sm">
      <div class="col-6 col-sm-auto">
        <q-select
          v-model="groupFilter"
          :options="groupFilterOptions"
          emit-value
          map-options
          options-dense
          outlined
          dense
          rounded
          color="app-accent"
          label="用户组"
          aria-label="按用户组筛选"
          class="user-filter"
        />
      </div>
      <div class="col-6 col-sm-auto">
        <q-select
          v-model="statusFilter"
          :options="statusFilterOptions"
          emit-value
          map-options
          options-dense
          outlined
          dense
          rounded
          color="app-accent"
          label="账号状态"
          aria-label="按账号状态筛选"
          class="user-filter"
        />
      </div>
      <q-space />
      <div class="col-auto">
        <q-btn
          outline
          no-caps
          color="app-accent"
          icon="person_add"
          :label="isNarrowScreen ? undefined : '新增用户'"
          aria-label="新增用户"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <q-table
      class="list-table user-table"
      :rows="filteredUsers"
      :columns="columns"
      row-key="name"
      :loading="tableLoading"
      :rows-per-page-options="[]"
      v-model:pagination="tablePagination"
      :visible-columns="visibleColumns"
      binary-state-sort
      flat
      bordered
      dense
      wrap-cells
      no-data-label="没有符合条件的账号"
      loading-label="正在加载用户..."
      table-header-class="app-text"
    >
      <template v-slot:no-data="{ message }">
        <template v-if="!tableLoading">
          <q-icon class="q-table__bottom-nodata-icon" name="warning" />
          {{ message }}
        </template>
      </template>

      <template v-slot:bottom>
        <div class="row items-center justify-center full-width">
          <q-pagination
            :model-value="tablePagination.page"
            :max="tablePages"
            direction-links
            color="app-accent"
            input
            @update:model-value="changeTablePage"
          />
        </div>
      </template>

      <template v-slot:body-cell-index="props">
        <q-td :props="props" class="app-text-secondary">
          {{ props.rowIndex + 1 }}
        </q-td>
      </template>

      <template v-slot:body-cell-name="props">
        <q-td :props="props">
          <span>{{ props.row.name }}</span>
          <span v-if="props.row.name === 'admin'" class="text-caption app-text-secondary q-ml-xs">
            （内置）
          </span>
        </q-td>
      </template>

      <template v-slot:body-cell-group="props">
        <q-td :props="props">
          {{ groupLabel(props.row.group) }}
        </q-td>
      </template>

      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <span
            class="text-weight-medium"
            :class="isEnabled(props.row) ? 'app-text-secondary' : 'text-app-danger'"
          >
            {{ isEnabled(props.row) ? '已启用' : '已禁用' }}
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
            :label="showActionLabels ? '修改' : undefined"
            :aria-label="`修改用户 ${props.row.name}`"
            @click="openEditDialog(props.row)"
          />
          <q-btn
            flat
            dense
            no-caps
            :color="isEnabled(props.row) ? 'app-danger' : 'app-accent'"
            :icon="isEnabled(props.row) ? 'block' : 'check_circle'"
            :label="showActionLabels ? (isEnabled(props.row) ? '禁用' : '启用') : undefined"
            :loading="loadingStatusUser === props.row.name"
            :aria-label="`${isEnabled(props.row) ? '禁用' : '启用'}用户 ${props.row.name}`"
            @click="setUserStatus(props.row, !isEnabled(props.row))"
          />
          <q-btn
            flat
            dense
            no-caps
            color="app-danger"
            icon="delete"
            :label="showActionLabels ? '删除' : undefined"
            :disable="props.row.name === 'admin'"
            :aria-label="`删除用户 ${props.row.name}`"
            @click="openDeleteDialog(props.row)"
          />
        </q-td>
      </template>
    </q-table>

    <div class="text-caption app-text-secondary q-mt-sm">
      禁用账号会立即使其登录会话失效，但会保留评语、收藏和历史记录；删除账号会一并清除这些数据，且无法恢复。
    </div>
  </q-page>

  <q-dialog v-model="userDialog">
    <q-card style="width: 520px; max-width: 90vw">
      <q-form ref="userForm" @submit="saveUser">
        <q-toolbar>
          <q-toolbar-title>{{ isEditing ? '修改用户' : '新增用户' }}</q-toolbar-title>
          <q-btn
            flat
            round
            dense
            icon="close"
            aria-label="关闭"
            :disable="savingUser"
            @click="closeUserDialog"
          />
        </q-toolbar>

        <q-card-section class="q-pt-none">
          <q-input
            v-model.trim="userForm.name"
            outlined
            dense
            label="用户名"
            :disable="isEditing"
            :rules="[
              val => val.length >= 5 || '用户名长度至少为 5',
              validateUniqueName,
            ]"
            lazy-rules
            class="q-mb-sm"
          />

          <q-select
            v-model="userForm.group"
            :options="groupOptions"
            emit-value
            map-options
            outlined
            dense
            label="用户组"
            :disable="isProtectedAdmin"
            class="q-mb-sm"
          />

          <q-input
            v-model="userForm.password"
            outlined
            dense
            type="password"
            :label="isEditing ? '新密码（留空则不修改）' : '密码'"
            :rules="[validatePassword]"
            lazy-rules
          />

          <div v-if="isProtectedAdmin" class="text-caption app-text-secondary q-mt-sm">
            内置 admin 的用户组固定为管理员；用户名不可修改，只能修改密码。
          </div>
          <div v-else-if="isEditing" class="text-caption app-text-secondary q-mt-sm">
            用户名创建后不可修改；用户组和密码可在此修改，密码留空则保持不变。
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="取消"
            color="primary"
            :disable="savingUser"
            @click="closeUserDialog"
          />
          <q-btn
            unelevated
            type="submit"
            :label="isEditing ? '保存' : '创建'"
            color="primary"
            :loading="savingUser"
            :disable="isEditing && !editHasChanges"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>

  <q-dialog v-model="deleteDialog">
    <q-card style="width: 420px; max-width: 90vw">
      <q-card-section class="q-pb-sm">
        <div class="text-h6">删除用户</div>
        <div class="text-body2 app-text-secondary q-mt-sm">
          确定删除用户“{{ deletingUser ? deletingUser.name : '' }}”？
          该账号的评语、收藏与历史记录会一并删除，且无法恢复。
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          flat
          label="取消"
          color="primary"
          :disable="deletingUserLoading"
          v-close-popup
        />
        <q-btn
          flat
          label="删除"
          color="negative"
          :loading="deletingUserLoading"
          @click="deleteUser"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import NotifyMixin from '../../mixins/Notification.js'
import { endSession } from '../../services/session'
import SearchInput from 'components/SearchInput'

const USER_GROUP_LABELS = {
  user: '普通用户',
  administrator: '管理员'
}

const USER_GROUPS = Object.entries(USER_GROUP_LABELS)
  .map(([value, label]) => ({ label, value }))

export default {
  mixins: [NotifyMixin],

  components: {
    SearchInput
  },

  data () {
    return {
      users: [],
      tableLoading: false,
      search: '',
      groupFilter: 'all',
      statusFilter: 'all',
      tablePagination: {
        page: 1,
        rowsPerPage: 25,
        sortBy: 'name',
        descending: false
      },
      columns: [
        {
          name: 'index',
          label: '#',
          align: 'right',
          headerStyle: 'width: 3%'
        },
        {
          name: 'name',
          required: true,
          label: '用户名',
          align: 'left',
          field: 'name',
          sortable: true,
          headerStyle: 'width: 37%'
        },
        {
          name: 'group',
          required: true,
          label: '用户组',
          align: 'left',
          field: 'group',
          sortable: true,
          headerStyle: 'width: 23%'
        },
        {
          name: 'status',
          required: true,
          label: '状态',
          align: 'center',
          field: row => Number(row.disabled),
          sortable: true,
          headerStyle: 'width: 16%'
        },
        {
          name: 'actions',
          label: '操作',
          align: 'center',
          field: 'actions',
          sortable: false,
          headerStyle: 'width: 21%'
        }
      ],
      groupOptions: USER_GROUPS,
      groupFilterOptions: [
        { label: '全部用户组', value: 'all' },
        ...USER_GROUPS
      ],
      statusFilterOptions: [
        { label: '全部状态', value: 'all' },
        { label: '已启用', value: 'enabled' },
        { label: '已禁用', value: 'disabled' }
      ],
      loadingStatusUser: '',
      userDialog: false,
      editingUser: null,
      userForm: {
        name: '',
        password: '',
        group: 'user'
      },
      savingUser: false,
      deleteDialog: false,
      deletingUser: null,
      deletingUserLoading: false
    }
  },

  computed: {
    isEditing () {
      return this.editingUser !== null
    },

    isProtectedAdmin () {
      return this.isEditing && this.editingUser.name === 'admin'
    },

    editHasChanges () {
      if (!this.editingUser) return false
      const groupChanged = !this.isProtectedAdmin &&
        this.userForm.group !== this.editingUser.group
      return groupChanged || Boolean(this.userForm.password)
    },

    enabledUserCount () {
      return this.users.filter(user => this.isEnabled(user)).length
    },

    isNarrowScreen () {
      return this.$q.screen.lt.sm
    },

    showActionLabels () {
      return this.$q.screen.gt.sm
    },

    visibleColumns () {
      if (this.isNarrowScreen) return ['name', 'status', 'actions']
      if (this.$q.screen.lt.md) return ['name', 'group', 'status', 'actions']
      return void 0
    },

    tablePages () {
      return Math.max(1, Math.ceil(this.filteredUsers.length / this.tablePagination.rowsPerPage))
    },

    filteredUsers () {
      const keyword = this.search.trim().toLocaleLowerCase()

      return this.users.filter((user) => {
        const matchesSearch = !keyword || user.name.toLocaleLowerCase().includes(keyword)
        const matchesGroup = this.groupFilter === 'all' || user.group === this.groupFilter
        const matchesStatus = this.statusFilter === 'all' ||
          (this.statusFilter === 'enabled' && this.isEnabled(user)) ||
          (this.statusFilter === 'disabled' && this.isDisabled(user))

        return matchesSearch && matchesGroup && matchesStatus
      })
    }
  },

  watch: {
    search () {
      this.changeTablePage(1)
    },

    groupFilter () {
      this.changeTablePage(1)
    },

    statusFilter () {
      this.changeTablePage(1)
    },

    filteredUsers (rows) {
      const lastPage = Math.max(1, Math.ceil(rows.length / this.tablePagination.rowsPerPage))
      if (this.tablePagination.page > lastPage) {
        this.tablePagination.page = lastPage
      }
    }
  },

  methods: {
    groupLabel (group) {
      return USER_GROUP_LABELS[group] || group
    },

    // SQLite 返回 0 / 1；统一转成数字，避免字符串 "0" 被当成 true。
    isDisabled (user) {
      return Number(user.disabled) === 1
    },

    isEnabled (user) {
      return !this.isDisabled(user)
    },

    changeTablePage (page) {
      if (!page || page === this.tablePagination.page) return
      this.tablePagination.page = page
    },

    validateUniqueName (name) {
      if (this.isEditing) return true
      return !this.users.some(user => user.name === name) || '该用户名已存在'
    },

    validatePassword (password) {
      if (this.isEditing && !password) return true
      return Boolean(password && password.length >= 5) || '密码长度至少为 5'
    },

    showRequestError (error, fallback = '操作失败') {
      if (!error.response) {
        this.showErrNotif(error.message || fallback)
        return
      }

      const data = error.response.data || {}
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        this.showErrNotif(data.errors[0].msg)
      } else if (error.response.status === 403) {
        this.showWarnNotif(data.error || '没有权限执行此操作')
      } else {
        this.showErrNotif(
          data.error || `${error.response.status} ${error.response.statusText || fallback}`
        )
      }
    },

    openCreateDialog () {
      this.editingUser = null
      this.userForm = {
        name: '',
        password: '',
        group: 'user'
      }
      this.userDialog = true
    },

    openEditDialog (user) {
      this.editingUser = user
      this.userForm = {
        name: user.name,
        password: '',
        group: user.group
      }
      this.userDialog = true
    },

    dismissUserDialog () {
      this.userDialog = false
      this.editingUser = null
      this.userForm = {
        name: '',
        password: '',
        group: 'user'
      }
    },

    closeUserDialog () {
      if (this.savingUser) return
      this.dismissUserDialog()
    },

    async saveUser () {
      if (this.savingUser) return

      if (this.isEditing && !this.editHasChanges) {
        this.showWarnNotif('没有需要保存的修改')
        return
      }

      this.savingUser = true
      try {
        if (this.isEditing) {
          const update = {
            name: this.userForm.name
          }
          if (!this.isProtectedAdmin) update.group = this.userForm.group
          if (this.userForm.password) {
            update.newPassword = this.userForm.password
          }

          const response = await this.$axios.put('/api/credentials/user', update)

          this.dismissUserDialog()
          this.showSuccNotif('用户信息已修改')

          // 修改自己的密码或权限后，原会话不再沿用。
          if (response.data.self && (response.data.passwordChanged || response.data.groupChanged)) {
            endSession(this)
          } else {
            this.requestUsers()
          }
        } else {
          await this.$axios.post('/api/credentials/user', {
            name: this.userForm.name,
            password: this.userForm.password,
            group: this.userForm.group
          })

          this.dismissUserDialog()
          this.showSuccNotif('用户已创建')
          this.requestUsers()
        }
      } catch (error) {
        this.showRequestError(error, this.isEditing ? '修改用户失败' : '创建用户失败')
      } finally {
        this.savingUser = false
      }
    },

    openDeleteDialog (user) {
      if (user.name === 'admin') return
      this.deletingUser = user
      this.deleteDialog = true
    },

    async deleteUser () {
      if (!this.deletingUser) return

      const user = this.deletingUser
      this.deletingUserLoading = true
      try {
        const response = await this.$axios.delete('/api/credentials/user', {
          data: { users: [{ name: user.name }] }
        })
        this.deleteDialog = false
        this.deletingUser = null
        this.showSuccNotif(`已删除用户 ${user.name}`)

        if (response.data.deleted.includes(this.$store.state.User.name)) {
          endSession(this)
        } else {
          this.requestUsers()
        }
      } catch (error) {
        this.showRequestError(error, '删除用户失败')
      } finally {
        this.deletingUserLoading = false
      }
    },

    async requestUsers () {
      this.tableLoading = true
      try {
        const response = await this.$axios.get('/api/credentials/users')
        this.users = response.data.users
      } catch (error) {
        // 401 由全局会话边界统一处理。
        if (!error.response || error.response.status !== 401) {
          this.showRequestError(error, '加载用户失败')
        }
      } finally {
        this.tableLoading = false
      }
    },

    async setUserStatus (user, enabled) {
      this.loadingStatusUser = user.name
      try {
        const response = await this.$axios.put('/api/credentials/user/status', {
          name: user.name,
          disabled: !enabled
        })

        this.showSuccNotif(`已${enabled ? '启用' : '禁用'}用户 ${user.name}`)

        if (response.data.self && this.isDisabled(response.data.user)) {
          if (endSession(this)) {
            this.showWarnNotif('当前账号已被禁用，已退出登录')
          }
        } else {
          this.requestUsers()
        }
      } catch (error) {
        this.showRequestError(error, '修改账号状态失败')
      } finally {
        this.loadingStatusUser = ''
      }
    }
  },

  created () {
    this.requestUsers()
  }
}
</script>

<style lang="scss" scoped>
.user-table :deep(.q-table) {
  table-layout: fixed;
}

.user-table :deep(.q-table thead th) {
  font-size: 14px;
  font-weight: 600;
}

.user-table :deep(.q-table thead tr),
.user-table :deep(.q-table tbody td) {
  height: 40px;
}

.user-table :deep(.q-table tbody td) {
  font-size: 15px;
}

.user-heading {
  overflow-wrap: anywhere;
}

.user-search-wrap {
  width: 260px;
  min-width: 180px;
}

.user-filter {
  width: 150px;
  max-width: 100%;
}

@media (max-width: $breakpoint-xs-max) {
  .user-table :deep(.q-table) {
    table-layout: auto;
  }
}
</style>
