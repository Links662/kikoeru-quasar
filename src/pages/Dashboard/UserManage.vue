<template>
  <div>
    <q-card class="q-ma-md">
      <q-form @submit="updateAdminPassword()">
        <q-toolbar>
          <q-toolbar-title>修改用户密码</q-toolbar-title>
        </q-toolbar>

        <div class="q-pa-sm">
          <q-input outlined dense
            v-model="userName" label="用户名"
            required
            lazy-rules
            :rules="[
                val => val.length >= 5 || '用户名长度至少为 5',
              ]" 
          />
          
          <q-input outlined dense type="password" label="新密码"
            v-model="newPassword"
            lazy-rules
            :rules="[ val => val.length >= 5 || '密码长度至少为 5' ]"
          />


          <div class="row justify-end">
            <q-btn :loading="loadingUpdateAdminPassword" type="submit" color="primary" label="修改" />
          </div>
        </div>
      </q-form>
    </q-card>

    <q-card class="q-ma-md">
      <q-form @submit="addNewUser()">
        <q-toolbar>
          <q-toolbar-title>添加新用户</q-toolbar-title>
        </q-toolbar>

        <div class="q-pa-sm">
          <q-select dense outlined label="用户组" v-model="newuser.group" :options="groups" class="q-mb-md" />

          <q-input outlined dense
            v-model="newuser.name" label="用户名"
            required
            lazy-rules
            :rules="[
                val => val.length >= 5 || '用户名长度至少为 5',
                val => !users.find(user => user.name === val) || '该名称已存在，用户名不能重复',
              ]" 
          />

          <q-input outlined dense label="密码"
            v-model="newuser.password"
            lazy-rules
            :rules="[ val => val.length >= 5 || '密码长度至少为 5' ]"
          />

          <div class="row justify-end">
            <q-btn :loading="loadingAddNewUser" type="submit" color="primary" label="添加" />
          </div>
        </div>
      </q-form>
    </q-card>

    <q-card class="q-ma-md q-pa-sm">
      <q-table
        title="所有用户"
        :rows="users"
        :columns="columns"
        row-key="name"
        :selected-rows-label="getSelectedString"
        selection="multiple"
        v-model:selected="selected"
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-toggle
              :model-value="isEnabled(props.row)"
              :disable="loadingStatusUser === props.row.name"
              color="positive"
              @update:model-value="value => setUserStatus(props.row, value)"
            />
            <span
              class="text-caption q-ml-xs"
              :class="isDisabled(props.row) ? 'text-negative' : 'text-grey-7'"
            >{{ isDisabled(props.row) ? '已禁用' : '已启用' }}</span>
          </q-td>
        </template>
      </q-table>

      <div class="text-caption text-grey-7 q-mt-sm">
        这里的开关代表账号状态：开着表示账号正常可用，关掉即禁用。
        禁用后该账号立刻无法登录（已登录的会话也会失效），评语 / 收藏 / 历史记录仍然保留。
        内置的 admin 账号不允许删除，要让它下线就关掉它的开关。
        为避免管理后台没人能进，至少要留一个已启用的管理员账号。
      </div>

      <div class="row justify-end">
        <q-btn :loading="loadingDeleteUsers" :disable="selected.length === 0" @click="confirm = true" color="primary" label="删除" />
      </div>
    </q-card>

    <q-dialog v-model="confirm" persistent>
      <q-card>
        <q-card-section>
          <div class="text-h6">确认删除选中用户？</div>
          <div class="text-caption text-grey-7">该账号的评语、收藏与历史记录会一并删除，不能恢复。</div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" color="primary" v-close-popup />
          <q-btn flat label="确认" color="primary" @click="deleteUsers()" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import NotifyMixin from '../../mixins/Notification.js'

export default {
  mixins: [NotifyMixin],

  data () {
    return {
      selected: [],
      columns: [
        { name: 'desc', required: true, label: '用户名', align: 'left', field: 'name', sortable: true },
        { name: 'calories', required: true, label: '用户组', align: 'center', field: 'group', sortable: true },
        { name: 'status', required: true, label: '账户状态', align: 'center', field: 'disabled', sortable: true },
      ],
      users: [],
      loadingDeleteUsers: false,
      loadingStatusUser: '',

      newuser: {
        name: '',
        password: '',
        group: 'user'
      },
      groups: ['user', 'administrator'],
      loadingAddNewUser: false,

      userName: '',
      newPassword: '',
      loadingUpdateAdminPassword: false,

      confirm: false
    }
  },

  methods: {
    getSelectedString () {
      return this.selected.length === 0 ? '' : `${this.selected.length} record${this.selected.length > 1 ? 's' : ''} selected of ${this.users.length}`
    },

    // 服务端返回的是 SQLite 的 0 / 1，这里做一次归一化，避免字符串 '0' 被判成真
    isDisabled (user) {
      return Number(user.disabled) === 1
    },

    // 开关表达的是「账户状态」：开 = 账号可用，关 = 已禁用，所以这里取反
    isEnabled (user) {
      return !this.isDisabled(user)
    },

    addNewUser () {
      this.loadingAddNewUser = true
      this.$axios.post('/api/credentials/user', {
        name: this.newuser.name,
        password: this.newuser.password,
        group: this.newuser.group
      })
        .then((response) => {
          this.users.push(this.newuser)
          this.loadingAddNewUser = false
          this.showSuccNotif(response.data.message)
          this.requestUsers()
        })
        .catch((error) => {
          this.loadingAddNewUser = false
          // 请求已发出，但服务器响应的状态码不在 2xx 范围内
          if (error.response.status === 422) {
            this.showErrNotif(error.response.data.errors[0].msg)
          } else if (error.response.status === 403) {
            this.showWarnNotif(error.response.data.error)
          } else {
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          }
        })

    },

    deleteUsers () {
      // 内置 admin 由服务端拒绝删除，这里先挑出来，免得同批次的其它账号一起被拒
      const deletable = this.selected.filter(selectedUser => selectedUser.name !== 'admin')
      const skipped = this.selected.length - deletable.length

      if (skipped > 0) {
        this.showWarnNotif('内置的 admin 账号不能删除，已跳过；要让它下线请关掉它的状态开关。')
      }
      if (deletable.length === 0) return

      this.loadingDeleteUsers = true
      this.$axios.delete('/api/credentials/user', {
        data: { users: deletable },
      })
        .then((response) => {
          deletable.forEach(selectedUser => {
            const index = this.users.findIndex(user => user.name === selectedUser.name)
            this.users.splice(index, 1)
          })
          this.selected = []
          this.loadingDeleteUsers = false
          this.showSuccNotif(response.data.message)
          this.requestUsers()
        })
        .catch((error) => {
          this.loadingDeleteUsers = false
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status === 403) {
              this.showWarnNotif(error.response.data.error)
            } else {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    updateAdminPassword () {
      this.loadingUpdateAdminPassword = true
      this.$axios.put('/api/credentials/user', {
        name: this.userName,
        newPassword: this.newPassword
      })
        .then((response) => {
          this.loadingUpdateAdminPassword = false
          try {
            this.$q.localStorage.set('jwt-token', '')
          } catch (err) {
            this.showErrNotif(err.message)
          }
          this.showSuccNotif(response.data.message)

          if (this.$store.state.User.auth) {
            console.log('Got here')
            this.$router.push('/login')
          }
        })
        .catch((error) => {
          this.loadingUpdateAdminPassword = false
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    requestUsers () {
      this.$axios.get('/api/credentials/users')
        .then((response) => {
          this.users = response.data.users
        })
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status !== 401) {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    setUserStatus (user, enabled) {
      this.loadingStatusUser = user.name
      this.$axios.put('/api/credentials/user/status', {
        name: user.name,
        disabled: !enabled
      })
        .then((response) => {
          this.loadingStatusUser = ''
          this.showSuccNotif(response.data.message)
          this.requestUsers()
        })
        .catch((error) => {
          this.loadingStatusUser = ''
          if (error.response) {
            const data = error.response.data || {}
            if (data.errors && data.errors.length > 0) {
              this.showErrNotif(data.errors[0].msg)
            } else if (error.response.status === 403) {
              this.showWarnNotif(data.error || '没有权限')
            } else {
              this.showErrNotif(data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },
  },

  created () {
    this.requestUsers()
  }
}
</script>
