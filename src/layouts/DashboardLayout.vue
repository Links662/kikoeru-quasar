<template>
  <q-layout view="hhh LpR fFf">
    <q-header elevated class="bg-black">
      <q-toolbar class="row no-wrap items-center">
        <q-toolbar-title shrink class="q-mr-md">仪表盘</q-toolbar-title>

        <!-- 导航：原先左侧工具栏的内容全部移到这里 -->
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
      // 只有认证相关错误才跳转登录
      if (err.message && err.message.includes('administrator')) {
        this.$socket.close()
        this.$router.push('/login')
      } else {
        // 其他错误只显示通知，尝试重连
        this.showWarnNotif('连接异常，正在重试...')
        this.$socket.connect() // 重连
      }
    }
  },

  created () {
    // 从 LocalStorage 中读取 token
    const token = this.$q.localStorage.getItem('jwt-token') || ''
    this.$socket.io.opts.query.auth_token = token
    
    if (!this.$socket.connected) {
      this.$socket.open()
    }
  }
}
</script>

<style lang="scss" scoped>
  a {
    text-decoration:none;
  }

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

  .nav-btn {
    flex: 0 0 auto;
    margin-right: 4px;
    color: #fff;
  }
</style>
