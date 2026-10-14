<template>
  <q-layout view="hhh LpR fFf">
    <q-header elevated class="bg-black">
      <q-toolbar class="row no-wrap items-center">
        <q-toolbar-title shrink class="q-mr-md">仪表盘</q-toolbar-title>

        <div class="col nav-scroll row no-wrap items-center">
          <q-btn
            v-for="(link, index) in links"
            :key="index"
            flat
            dense
            class="nav-btn"
            :icon="link.icon"
            :label="showNavLabel ? link.title : undefined"
            :to="link.path"
            exact
            active-class="nav-active"
          />
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import NotifyMixin from '../mixins/Notification.js'

export default {
  name: 'DashboardLayout',

  mixins: [NotifyMixin],

  data () {
    return {
      links: [
        {
          title: '音声库',
          icon: 'folder',
          path: '/admin'
        },
        {
          title: '扫描',
          icon: 'youtube_searched_for',
          path: '/admin/scanner'
        },
        {
          title: '用户管理',
          icon: 'person',
          path: '/admin/usermanage'
        },
        {
          title: '高级设置',
          icon: 'settings',
          path: '/admin/advanced'
        },
        
        {
          title: '回到主页',
          icon: 'home',
          path: '/'
        }
      ]
    }
  },

  computed: {
    // 顶部导航是否显示文字（窄屏只显示图标）
    showNavLabel () {
      return this.$q.screen.gt.sm
    }
  },

  sockets: {
    success(payload) {
      this.showSuccNotif(payload.message)
      if (payload.auth) {
        this.$store.commit('User/INIT', payload.user)
        this.$store.commit('User/SET_AUTH', payload.auth)
      }
    },
    error(err) {
      this.handleSocketError(err)
    },
    // socket.io v3+ 里连接阶段的失败（包括服务端中间件拒绝认证）走 'connect_error'
    connect_error(err) {
      this.handleSocketError(err)
    }
  },

  methods: {
    handleSocketError(err) {
      // 只有认证相关错误才跳转登录
      if (err && err.message && err.message.includes('administrator')) {
        this.$socket.close()
        this.$router.push('/login')
      } else {
        // 其他错误只提示，重连交给内置的 reconnection 机制，避免两条重连路径互相叠加
        this.showWarnNotif('连接异常，正在重试...')
      }
    }
  },

  created () {
    const token = this.$q.localStorage.getItem('jwt-token') || ''
    this.$socket.io.opts.query.auth_token = token
    
    if (!this.$socket.connected) {
      this.$socket.open()
    }
  }
}
</script>

<style lang="scss" scoped>
  // 顶部导航：窄屏时横向滚动，不换行
  .nav-scroll {
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
</style>
