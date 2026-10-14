<template>
  <q-layout view="hHh Lpr lFf" class="bg-grey-3" :style="layoutStyle">
    <q-header ref="header" class="shadow-4">
      <q-toolbar>
        <!-- 屏幕变窄时收掉 Kikoeru 标签，给导航和搜索让位 -->
        <q-toolbar-title shrink class="gt-xs q-mr-md">
          <router-link :to="'/'" class="text-white text-weight-bold">
            Kikoeru
          </router-link>
        </q-toolbar-title>

        <!-- 导航：固定一行，一行放不下的项收进末尾的下拉菜单 -->
        <div ref="navRow" class="nav-scroll row no-wrap items-center">
          <q-btn
            v-for="(item, index) in shownNavItems"
            :key="'nav' + index"
            flat
            dense
            class="nav-btn"
            :class="{ 'nav-active': item.active === true }"
            :icon="item.icon"
            :label="showNavLabel ? item.title : undefined"
            :aria-label="showNavLabel ? undefined : item.title"
            :to="item.path"
            exact
            active-class="nav-active"
            @click="onNavClick(item)"
          />

          <q-btn v-if="hiddenNavItems.length" ref="navMore" flat dense round class="nav-btn"
            icon="keyboard_arrow_down" aria-label="更多">
            <q-menu anchor="bottom right" self="top right" :offset="[0, 4]">
              <q-list dense class="nav-more-list">
                <q-item
                  v-for="(item, index) in hiddenNavItems"
                  :key="'more' + index"
                  clickable
                  v-ripple
                  exact
                  :to="item.path"
                  active-class="text-primary text-weight-medium"
                  @click="onNavClick(item)"
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

        <!-- 只用来量按钮宽度的隐藏行 -->
        <div ref="navMeasure" class="nav-measure row no-wrap items-center" aria-hidden="true">
          <q-btn
            v-for="(item, index) in navItems"
            :key="'measure' + index"
            flat
            dense
            class="nav-btn"
            :icon="item.icon"
            :label="showNavLabel ? item.title : undefined"
            tabindex="-1"
          />
        </div>

        <!-- 搜索不放在顶栏：媒体库页面内有搜索框，其他页面用 / 或 Ctrl+K 跳过去 -->
      </q-toolbar>

      <AudioPlayer />
    </q-header>

    <q-dialog v-model="confirm" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="power_settings_new" color="primary" text-color="white" />
          <span class="q-ml-sm">是否退出登录？（若未开启用户验证，则操作无效）</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" color="primary" v-close-popup />
          <q-btn flat label="退出" color="primary" @click="logout()" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <SleepMode v-model="showTimer" />

    <!-- 作品详情面板（桌面端）：从左侧滑出并顶开内容，右侧作品列表仍可滚动 -->
    <q-drawer
      v-if="!isMobilePanel"
      side="left"
      :model-value="workId !== null"
      @update:model-value="onPanelInput"
      :width="panelWidth"
      bordered
      elevated
      content-class="bg-white"
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
      <q-page-scroller v-if="workId === null" position="bottom-right" :scroll-offset="150" :offset="[18, 18]">
        <q-btn fab-mini icon="keyboard_arrow_up" color="accent" />
      </q-page-scroller>

      <!-- 作品详情面板（移动端）：只覆盖内容区，header/footer 保持可见可操作 -->
      <transition name="work-panel-slide">
        <div
          v-if="isMobilePanel && workId !== null"
          class="work-panel-mobile bg-white"
          :style="mobilePanelStyle"
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
      navRowObserver: null,
      navMeasureTimer: null,
      navVisibleCount: null, // null 表示所有导航项都放得下
      nsfwMode: false, // 封面打码模式，存 localStorage（每台设备各自记）
      links: [
        {
          title: '媒体库',
          icon: 'widgets',
          path: '/works'
        },
        {
          title: '我的进度',
          icon: 'list',
          path: '/progress'
        },
        {
          title: '社团',
          icon: 'group',
          path: '/circles'
        },
        {
          title: '标签',
          icon: 'label',
          path: '/tags'
        },
        {
          title: '声优',
          icon: 'mic',
          path: '/vas'
        },
        {
          title: '设定',
          icon: 'settings',
          path: '/admin'
        },
      ],
      sharedConfig: {}
    }
  },

  watch: {
    // 导航项或按钮文字显隐变化后重新量一次
    navItems () {
      this.scheduleMeasureNav()
    },

    showNavLabel () {
      this.scheduleMeasureNav()
    },

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

    // 导航栏宽度变化（窗口缩放、标题显隐、搜索展开）时重算能放下几个
    this.$nextTick(this.measureNav);
    if (typeof ResizeObserver !== 'undefined' && this.$refs.navRow) {
      this.navRowObserver = new ResizeObserver(this.scheduleMeasureNav);
      this.navRowObserver.observe(this.$refs.navRow);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(this.scheduleMeasureNav);
    }
  },

  beforeUnmount () {
    window.removeEventListener('resize', this.measureChrome);
    window.removeEventListener('keydown', this.handlePanelKeyEvent);
    window.removeEventListener('keydown', this.handleSearchShortcut);
    this.chromeObserver && this.chromeObserver.disconnect();
    this.navRowObserver && this.navRowObserver.disconnect();
    clearTimeout(this.navMeasureTimer);
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
      playerHide: 'hide'
    }),

    ...mapGetters('AudioPlayer', [
      'hasTrack'
    ]),

    // 顶部导航是否显示文字（窄屏只显示图标）
    showNavLabel () {
      return this.$q.screen.gt.sm
    },

    // 顶部导航的全部条目（路由 + 动作），顺序就是显示顺序
    navItems () {
      const items = this.links.map(link => ({
        title: link.title,
        icon: link.icon,
        path: link.path
      }))

      items.push({
        title: '健全模式',
        icon: this.nsfwMode ? 'blur_on' : 'blur_off',
        active: this.nsfwMode,
        keepPanel: true,
        action: this.toggleNsfwMode
      })

      items.push({
        title: '随心听',
        icon: 'shuffle',
        // 面板打开时不收起，直接在当前详情里换成随机到的作品
        keepPanel: true,
        action: this.randomPlay
      })

      if (this.authEnabled === true) {
        items.push({
          title: '登出',
          icon: 'exit_to_app',
          action: () => { this.confirm = true }
        })
      }

      return items
    },

    shownNavItems () {
      return this.navVisibleCount === null
        ? this.navItems
        : this.navItems.slice(0, this.navVisibleCount)
    },

    hiddenNavItems () {
      return this.navVisibleCount === null
        ? []
        : this.navItems.slice(this.navVisibleCount)
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
        '--app-header-height': `${this.headerHeight}px`
      }
    },

    // 移动端面板只覆盖内容区，所以要用 header / footer 的实际高度定位
    mobilePanelStyle () {
      return {
        top: `${this.headerHeight}px`,
        bottom: `${this.footerHeight}px`
      }
    }
  },

  methods: {
    ...mapMutations('AudioPlayer', [
      'SET_REWIND_SEEK_TIME',
      'SET_FORWARD_SEEK_TIME'
    ]),
    ...mapMutations('WorkPanel', {
      closeWorkPanel: 'CLOSE'
    }),

    measureChrome () {
      const header = this.$refs.header && this.$refs.header.$el;
      const footer = this.$refs.footer && this.$refs.footer.$el;
      this.headerHeight = header ? header.offsetHeight : 0;
      this.footerHeight = footer ? footer.offsetHeight : 0;
    },

    scheduleMeasureNav () {
      clearTimeout(this.navMeasureTimer)
      this.navMeasureTimer = setTimeout(() => {
        this.$nextTick(this.measureNav)
      }, 50)
    },

    // 量出这一行能放下几个导航项，剩下的交给下拉菜单
    measureNav () {
      const nav = this.$refs.navRow
      const measure = this.$refs.navMeasure
      if (!nav || !measure) return

      // 导航被临时隐藏（小屏展开搜索）时不重算，保持原样
      const available = nav.clientWidth
      if (available === 0) return

      const buttons = measure.children
      if (buttons.length === 0) return

      // 直接累加按钮自身宽度 + 间距，不能用绝对坐标（隐藏行和导航行起点不同）
      const widths = []
      for (let i = 0; i < buttons.length; i++) {
        const el = buttons[i]
        const marginRight = parseFloat(getComputedStyle(el).marginRight) || 0
        widths.push(el.getBoundingClientRect().width + marginRight)
      }

      let fit = buttons.length
      let overflowed = false
      let used = 0

      for (let i = 0; i < buttons.length; i++) {
        used += widths[i]
        if (used > available) {
          fit = i
          overflowed = true
          break
        }
      }

      if (overflowed === true) {
        // 末尾还要放一个下拉按钮，按剩下给它的宽度再算一次
        const moreWidth = 46
        used = 0
        for (let i = 0; i < buttons.length; i++) {
          used += widths[i]
          if (used + moreWidth > available) {
            fit = i
            break
          }
        }
      }

      const next = fit >= buttons.length ? null : fit
      if (next !== this.navVisibleCount) {
        this.navVisibleCount = next
      }
    },

    // 面板打开期间锁住页面滚动，避免滚动"漏"到底下看不到的列表上
    toggleBodyScrollLock (locked) {
      if (locked === true) {
        document.body.classList.add('work-panel-locked')
      } else {
        document.body.classList.remove('work-panel-locked')
      }
    },

    closePanel () {
      this.closeWorkPanel();
    },

    onPanelInput (value) {
      value === false && this.closePanel();
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
      this.$router.push({ path: '/works', query: { focusSearch: '1' } }).catch(() => {})
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
              // 验证失败，跳转到登录页面
              const path = this.$route.path
              if (path !=='/login') {
                this.$router.push('/login');
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
              // 验证失败，跳转到登录页面
              const path = this.$route.path
              if (path !=='/login') {
                this.$router.push('/login');
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
      // keepPanel 的动作（随心听）会自己换掉当前详情，收起再展开只会闪一下
      if (item.keepPanel !== true) {
        this.closePanel()
      }
      item.action && item.action()
    },

    randomPlay() {
      this.requestRandomWork();
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

    requestRandomWork () {
      const params = {
        order: 'betterRandom',
      }
      this.$axios.get('/api/works', { params })
        .then((response) => {
          const works = response.data.works

          if (works.length === 0) {
            this.showErrNotif("列表中无作品，请增加后再使用此功能")
            return
          }

          // 跳到 /work/:id 会被路由守卫截获并改成打开详情面板，
          // 所以这里要吞掉被取消的导航抛出的 promise
          this.$router.push(`/work/${works[0].id}`).catch(() => {})
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

    logout () {
      // 认证边界：显式停播并清空播放器状态
      // （播放引擎已经和路由解耦，不再有"离开布局顺带销毁播放器"这种副作用）
      const engine = audioEngine()
      if (engine) engine.stop()

      this.$q.localStorage.set('jwt-token', '')
      // socket 连接也是带着 token 建立的，一并断开
      if (this.$socket) this.$socket.close()
      this.$router.push('/login')
    },

    back () {
      this.$router.go(-1)
    }
  },
}
</script>


<style lang="scss" scoped>
// 顶部导航：固定一行，放不下的项由下拉菜单接管
  .nav-scroll {
    flex: 1 1 0%;
    min-width: 0;
    overflow: hidden;
  }

// 只用于量宽度，不参与布局
  .nav-measure {
    position: absolute;
    top: 0;
    left: 0;
    visibility: hidden;
    pointer-events: none;
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
    position: fixed;
    left: 0;
    right: 0;
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
