<template>
  <q-layout view="hHh Lpr lFf" class="app-page-bg" :style="layoutStyle">
    <q-header ref="header" class="app-main-header shadow-1">
      <q-toolbar @click="collapsePlayer">
        <q-toolbar-title shrink class="gt-xs q-mr-xs">
          <router-link :to="'/'" class="text-white text-weight-bold">
            Kikoeru
          </router-link>
        </q-toolbar-title>

        <!-- 导航：xs 屏保留三个主入口和两个右对齐小图标，其余功能收进“更多”菜单；
             更宽时非 primary 项靠右排列，大于 md 后恢复文字 -->
        <div ref="navRow" class="nav-scroll col row no-wrap items-center overflow-hidden">
          <q-btn
            v-for="(item, index) in navDisplayItems"
            :key="'nav' + index"
            flat
            dense
            class="nav-btn col-auto q-mr-xs q-px-xs text-white"
            :class="{
              'nav-active': item.active === true,
              'q-ml-auto': isFirstSecondaryNavItem(index)
            }"
            :icon="item.icon"
            :label="showNavItemLabel(item) ? item.title : undefined"
            :aria-label="showNavItemLabel(item) ? undefined : item.title"
            :to="item.path"
            exact
            active-class="nav-active"
            @click="onNavClick(item)"
            v-touch-hold:550.mouse="item.holdAction"
          />

          <q-btn v-if="navOverflowItems.length" ref="navMore" flat dense rounded class="nav-btn nav-more col-auto q-ml-none q-mr-none q-px-xs text-white"
            icon="keyboard_arrow_down" aria-label="更多">
            <q-menu anchor="bottom right" self="top right" :offset="[0, 4]">
              <q-list dense class="nav-more-list">
                <q-item
                  v-for="(item, index) in navOverflowItems"
                  :key="'more' + index"
                  clickable
                  v-ripple
                  exact
                  :to="item.path"
                  active-class="text-primary text-weight-medium"
                  @click="onNavClick(item)"
                  v-touch-hold:550.mouse="item.holdAction"
                >
                  <q-item-section avatar>
                    <q-icon :name="item.icon" />
                  </q-item-section>

                  <q-item-section>
                    {{ item.title }}
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>

        <!-- 搜索不放在顶栏：媒体库页面内有搜索框，其他页面用 / 或 Ctrl+K 跳过去 -->
      </q-toolbar>

      <AudioPlayer />
    </q-header>

    <q-dialog
      v-model="confirm"
      persistent
      aria-labelledby="logout-dialog-title"
      aria-describedby="logout-dialog-description"
    >
      <q-card class="logout-dialog">
        <q-card-section class="q-pb-sm">
          <div id="logout-dialog-title" class="text-h6">退出登录？</div>
          <div id="logout-dialog-description" class="text-body2 app-text-secondary q-mt-sm">
            退出后将停止播放，并清除本机的登录状态。
          </div>
          <div
            v-if="userName"
            class="logout-dialog__account row items-center no-wrap q-mt-md q-px-sm q-py-sm rounded-borders text-primary"
          >
            <q-icon name="person_outline" size="xs" />
            <span class="q-ml-sm text-caption app-text-secondary">当前账号</span>
            <span class="col q-ml-sm ellipsis text-body2 text-weight-medium app-text">{{ userName }}</span>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            color="primary"
            label="取消"
            v-close-popup
          />
          <q-btn
            flat
            color="negative"
            label="退出"
            @click="logout()"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <SleepMode v-model="showTimer" />

    <!-- 作品详情面板（桌面端）：从左侧滑出并顶开内容，右侧作品列表仍可滚动 -->
    <q-drawer
      v-if="!isMobilePanel"
      side="left"
      :model-value="workId !== null"
      @update:model-value="$event === false && closePanel()"
      :width="panelWidth"
      bordered
      elevated
      content-class="app-surface"
    >
      <WorkPanel
        v-if="workId !== null"
        :key="workId"
        :workid="workId"
        @close="closePanel"
      />
    </q-drawer>

    <q-page-container>
      <router-view v-slot="{ Component }">
        <keep-alive include="Works">
          <component :is="Component" />
        </keep-alive>
      </router-view>
      <q-page-scroller v-if="workId === null || !isMobilePanel" position="bottom-right" :scroll-offset="150" :offset="[18, 18]">
        <q-btn fab-mini icon="keyboard_arrow_up" color="accent" />
      </q-page-scroller>

      <!-- 作品详情面板（移动端）：只覆盖内容区，header/footer 保持可见可操作 -->
      <transition name="work-panel-slide">
        <div
          v-if="isMobilePanel && workId !== null"
          class="work-panel-mobile fixed-top app-surface"
        >
          <WorkPanel :key="workId" :workid="workId" @close="closePanel" />
        </div>
      </transition>
    </q-page-container>

    <q-footer ref="footer" class="q-pa-none">
      <PlayerBar />
    </q-footer>
  </q-layout>
</template>

<script>
import PlayerBar from 'components/PlayerBar'
import AudioPlayer from 'components/AudioPlayer'
import SleepMode from 'components/SleepMode'
import WorkPanel from 'components/WorkPanel'
import NotifyMixin from '../mixins/Notification.js'
import { audioEngine } from '../services/AudioEngine'
import { endSession } from '../services/session'
import { setThemeMode } from '../services/theme'
import { mapGetters, mapMutations, mapState } from 'vuex'

export default {
  name: 'MainLayout',

  mixins: [NotifyMixin],

  components: {
    PlayerBar,
    AudioPlayer,
    SleepMode,
    WorkPanel
  },

  data () {
    return {
      confirm: false,
      showTimer: false,
      headerHeight: 0,
      footerHeight: 0,
      chromeObserver: null,
      nsfwMode: false, // 封面打码模式，存 localStorage（每台设备各自记）
      sharedConfig: {}
    }
  },

  watch: {
    sharedConfig (config) {
      this.SET_REWIND_SEEK_TIME(config.rewindSeekTime);
      this.SET_FORWARD_SEEK_TIME(config.forwardSeekTime);
    },

    // 移动端播放器展开后会盖住详情面板，此时自动收起面板
    playerExpanded (expanded) {
      if (expanded === true && this.isMobilePanel === true) {
        this.closePanel()
      }
    },

    // 浮层面板打开时锁住背后页面的滚动，关掉（或切到桌面端抽屉）时解锁。
    // immediate：直接访问 /work/:id 时，路由守卫会在 Layout 创建前就打开面板
    mobilePanelOpen: {
      immediate: true,
      handler (open) {
        this.toggleBodyScrollLock(open)

        // 浮层面板占满整个内容区，展开的播放器卡片固定在右下角，两块叠在同
        // 一块屏幕上会互相遮挡，这里让面板留下、把播放器收回播放条
        if (open === true) this.collapsePlayer()
      }
    },

    // 窗口从浮层档跨到桌面档时先收起面板：Quasar 的抽屉要用新的布局宽度判断
    // 自己是不是浮层，旧宽度会让它把自己当成浮层并锁死页面滚动
    isMobilePanel (isMobile, wasMobile) {
      if (wasMobile === true && isMobile === false && this.workId !== null) {
        this.closePanel()
      }
    },

    // 面板打开期间发生真实跳转（点标签/社团/顶部导航等）时关闭面板
    $route () {
      this.closePanel()
    }
  },

  created () {
    // 主界面也会保持一条带当前账号身份的 socket 连接，用于接收历史记录等
    // 只属于当前用户的实时事件。管理员进入 /admin 后沿用同一条连接。
    const token = this.$q.localStorage.getItem('jwt-token') || ''
    this.$socket.io.opts.query.auth_token = token

    if (!this.$socket.connected) {
      this.$socket.open()
    }
  },

  sockets: {
    // 服务端主动断开表示账号已经被禁用或删除，主界面也需要立即结束会话
    disconnect (reason) {
      if (reason !== 'io server disconnect') return

      if (endSession(this)) {
        this.showWarnNotif('当前账号已被禁用或删除，已退出登录')
      }
    }
  },

  mounted () {
    this.initUser();
    this.readSharedConfig();
    this.measureChrome();

    // 放在 mounted 里也能用：封面在本布局的 router-view 里渲染，
    // 这里挂类不晚于首屏封面出现
    this.readNsfwMode();

    window.addEventListener('resize', this.measureChrome);
    window.addEventListener('keydown', this.handlePanelKeyEvent);
    window.addEventListener('keydown', this.handleSearchShortcut);

    if (typeof ResizeObserver !== 'undefined') {
      this.chromeObserver = new ResizeObserver(this.measureChrome);
      [this.$refs.header, this.$refs.footer].forEach((ref) => {
        ref && this.chromeObserver.observe(ref.$el);
      });
    }

  },

  beforeUnmount () {
    window.removeEventListener('resize', this.measureChrome);
    window.removeEventListener('keydown', this.handlePanelKeyEvent);
    window.removeEventListener('keydown', this.handleSearchShortcut);
    this.chromeObserver && this.chromeObserver.disconnect();
    this.toggleBodyScrollLock(false);
  },

  computed: {
    ...mapState('User', {
      userName: 'name',
      authEnabled: 'auth'
    }),

    ...mapState('WorkPanel', {
      workId: 'workId',
      panelWidth: 'panelWidth'
    }),

    ...mapState('AudioPlayer', {
      playerHide: 'hide',
      sleepMode: 'sleepMode'
    }),

    ...mapGetters('AudioPlayer', [
      'hasTrack'
    ]),

    isLabelRoute () {
      return ['/circles', '/tags', '/vas'].includes(this.$route.path)
    },

    // 顶部导航的全部条目，写在一处，顺序就是显示顺序：
    // 业务功能（找作品、听作品）在前，技术入口（控制台、登出）在后。
    // 带 path 的走路由，选中态交给 vue-router；带 action 的是动作项。
    navItems () {
      const isDark = this.$q.dark.isActive === true

      return [
        {
          title: '音声',
          icon: 'widgets',
          path: '/works',
          primary: true
        },
        {
          title: '进度',
          icon: 'bookmarks',
          path: '/progress',
          primary: true
        },
        {
          title: '分类',
          icon: 'category',
          path: this.isLabelRoute ? this.$route.path : '/circles',
          primary: true
        },
        {
          title: this.nsfwMode ? '隐藏封面' : '显示封面',
          icon: this.nsfwMode ? 'hide_image' : 'image',
          showInXs: true,
          keepPanel: true,
          action: this.toggleNsfwMode
        },
        {
          title: isDark ? '深色模式' : '浅色模式',
          icon: isDark ? 'dark_mode' : 'light_mode',
          showInXs: true,
          holdAction: this.activateThemeAutoMode,
          keepPanel: true,
          action: () => setThemeMode(this.$q, this.$q.dark.isActive === true ? 'light' : 'dark')
        },
        {
          title: '播放定时',
          icon: 'schedule',
          showInXs: true,
          active: this.sleepMode,
          keepPanel: true,
          action: () => { this.showTimer = true }
        },
        {
          title: '控制台',
          icon: 'tune',
          path: '/admin',
        },

        // 登出只在开启用户验证时才有，固定排最后
        ...(this.authEnabled === true
          ? [{
              title: '退出登录',
              icon: 'logout',
              action: () => { this.confirm = true }
            }]
          : [])
      ]
    },

    // xs 屏进入“更多”，更宽时展示全部导航项。
    navInMore () {
      return this.$q.screen.gt.xs !== true
    },

    navDisplayItems () {
      if (this.navInMore !== true) return this.navItems

      return this.navItems.filter((item) => item.primary === true || item.showInXs === true)
    },

    navOverflowItems () {
      return this.navInMore
        ? this.navItems.filter((item) => item.primary !== true && item.showInXs !== true)
        : []
    },

    showNavItemLabel () {
      return (item) => item.primary === true || this.$q.screen.gt.md
    },

    // 播放器卡片是否正在展开显示
    playerExpanded () {
      return this.playerHide === false && this.hasTrack
    },

    // 移动端详情面板是浮层，打开时要盖住内容并且不让背后页面滚动
    mobilePanelOpen () {
      return this.workId !== null && this.isMobilePanel === true
    },

    isMobilePanel () {
      return this.$q.screen.lt.md
    },

    // 把 header 实际高度通过 CSS 变量暴露给页面，
    // 页面里的吸顶搜索条要刚好贴在 header 下面（播放器展开时 header 会变高）
    layoutStyle () {
      return {
        '--app-header-height': `${this.headerHeight}px`,
        '--app-footer-height': `${this.footerHeight}px`
      }
    },

  },

  methods: {
    ...mapMutations('AudioPlayer', [
      'SET_REWIND_SEEK_TIME',
      'SET_FORWARD_SEEK_TIME',
      'SET_HIDE'
    ]),
    ...mapMutations('WorkPanel', {
      closeWorkPanel: 'CLOSE'
    }),

    isFirstSecondaryNavItem (index) {
      const current = this.navDisplayItems[index]
      const previous = this.navDisplayItems[index - 1]

      return current && current.primary !== true && previous && previous.primary === true
    },

    measureChrome () {
      const header = this.$refs.header && this.$refs.header.$el;
      const footer = this.$refs.footer && this.$refs.footer.$el;
      this.headerHeight = header ? header.offsetHeight : 0;
      this.footerHeight = footer ? footer.offsetHeight : 0;
    },

    // 面板打开期间锁住页面滚动，避免滚动"漏"到底下看不到的列表上
    toggleBodyScrollLock (locked) {
      if (locked === true) {
        document.body.classList.add('work-panel-locked')
      } else {
        document.body.classList.remove('work-panel-locked')
      }
    },

    // 浮层（中/小屏）详情面板和展开的播放器卡片抢的是同一块屏幕，只能留一个：
    // 面板打开时把播放器收回底部播放条。反方向见 playerExpanded——展开播放器
    // 就收起面板；两边都是"后动手的那个留下"，不会出现两个都开着、互相遮挡
    // 而且播放条还跟着消失（连播放控制都够不到）的状态。
    //
    // 只在播放器真的展开时收：hide 的初值就是 false（还没播过也算"展开"），
    // 这时去写它会让之后第一次播放直接以收起态出现
    collapsePlayer () {
      if (this.playerExpanded === true) {
        this.SET_HIDE(true)
      }
    },

    closePanel () {
      this.closeWorkPanel();
    },

    handlePanelKeyEvent (event) {
      if (event.key !== 'Escape' || this.workId === null) return;

      // 面板里的评论弹层等自己会处理 Esc，不要跟着把面板一起关掉
      if (document.querySelector('.q-dialog') !== null) return;

      this.closePanel();
    },

    // 顶栏不再放搜索按钮：用 / 或 Ctrl/Cmd+K 跳到媒体库并聚焦页面里的搜索框
    handleSearchShortcut (event) {
      const isSlash = event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey
      const isCmdK = (event.ctrlKey || event.metaKey) && (event.key === 'k' || event.key === 'K')
      if (isSlash !== true && isCmdK !== true) return

      // 正在输入框里打字、或弹层打开时不要抢键
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable === true)) return
      if (document.querySelector('.q-dialog') !== null) return

      event.preventDefault()
      const query = this.$route.name === 'works'
        ? { ...this.$route.query, focusSearch: '1' }
        : { focusSearch: '1' }
      this.$router.push({ path: '/works', query }).catch(() => {})
    },

    initUser () {
      this.$axios.get('/api/auth/me')
        .then((res) => {
          this.$store.commit('User/INIT', res.data.user)
          this.$store.commit('User/SET_AUTH', res.data.auth)
        })
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status === 401) {
              // token 失效 / 账号被禁用或被删除：清干净本地会话再回登录页
              // （两个请求同时 401 时只有先到的那个提示）
              if (endSession(this)) {
                this.showWarnNotif(error.response.data.error || '登录状态已失效，请重新登录')
              }
            } else {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    readSharedConfig(){
      this.$axios.get('/api/config/shared')
        .then((response) => {
           this.sharedConfig = response.data.sharedConfig;
        })
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status === 401) {
              // token 失效 / 账号被禁用或被删除：清干净本地会话再回登录页
              // （两个请求同时 401 时只有先到的那个提示）
              if (endSession(this)) {
                this.showWarnNotif(error.response.data.error || '登录状态已失效，请重新登录')
              }
            } else {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    // 详情面板打开时点导航栏上的按钮，等价于点“返回”：先收起面板再执行跳转 / 动作
    onNavClick (item) {
      // 导航优先占据前景：展开的播放器先收回底部播放条，避免挡住下一次浏览
      this.collapsePlayer()

      // keepPanel 的动作（随心听）会自己换掉当前详情，收起再展开只会闪一下
      if (item.keepPanel !== true) {
        this.closePanel()
      }
      item.action && item.action()
    },

    activateThemeAutoMode () {
      if (this.$q.dark.mode === 'auto') return

      this.collapsePlayer()
      setThemeMode(this.$q, 'auto')
      this.showSuccNotif('已进入跟随系统模式')
    },

    // NSFW 模式：本地偏好，逻辑全在 CSS（body.nsfw-mode .cover-mask），
    // 所以这里只负责读写 localStorage 和挂类
    readNsfwMode () {
      this.nsfwMode = localStorage.getItem('nsfwMode') === 'true'
      this.applyNsfwMode()
    },

    applyNsfwMode () {
      document.body.classList.toggle('nsfw-mode', this.nsfwMode === true)
    },

    toggleNsfwMode () {
      this.nsfwMode = this.nsfwMode !== true
      this.applyNsfwMode()
      localStorage.setItem('nsfwMode', String(this.nsfwMode))

      // 锁屏 / 通知栏的封面不在 CSS 管辖范围，要重新推一次媒体信息
      const engine = audioEngine()
      if (engine) engine.setMediaSession()
    },

    logout () {
      // 主动登出：停播 + 清本地会话 + 断开 socket + 回登录页，细节见 services/session.js
      endSession(this)
    }
  },
}
</script>


<style lang="scss" scoped>
.logout-dialog {
  width: min(360px, calc(100vw - 32px));
}

.logout-dialog__account {
  background: color-mix(in srgb, currentColor 8%, transparent);
}

// “更多”下拉菜单：紧凑排布，去掉图标与文字之间的多余留白
  .nav-more-list {
    min-width: 0;

    :deep(.q-item) {
      padding: 2px 12px;
    }

    :deep(.q-item__section--avatar) {
      min-width: 32px;
      padding-right: 8px;
    }

    :deep(.q-item__section--main) {
      white-space: nowrap;
    }
  }

// 移动端作品详情面板：只覆盖内容区（header 与 footer 之间）
  .work-panel-mobile {
    top: var(--app-header-height, 0px);
    bottom: var(--app-footer-height, 0px);
    z-index: 2500;
  }

// 移动端详情面板的滑入/滑出（与桌面端一致，从左侧进出）
  .work-panel-slide-enter-active,
  .work-panel-slide-leave-active {
    transition: transform 0.3s cubic-bezier(0.215, 0.61, 0.355, 1);
  }

  .work-panel-slide-enter-from,
  .work-panel-slide-leave-to {
    transform: translate3d(-100%, 0, 0);
  }
</style>
