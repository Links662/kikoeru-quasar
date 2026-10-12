<template>
  <q-layout view="hHh Lpr lFf" class="bg-grey-3">
    <q-header ref="header" class="shadow-4">
      <q-toolbar class="row justify-between">
        <q-btn flat dense round @click="drawerOpen = !drawerOpen" icon="menu" aria-label="Menu" />

        <!-- <q-btn flat size="md" icon="arrow_back_ios" @click="back()" v-if="isNotAtHomePage"/> -->

        <q-toolbar-title class="gt-xs">
          <router-link :to="'/'" class="text-white">
            Kikoeru
          </router-link>
        </q-toolbar-title>

        <q-input dark dense rounded standout v-model="keyword" debounce="500" input-class="text-right" class="q-mr-sm">
          <template v-slot:append>
            <q-icon v-if="keyword === ''" name="search" />
            <q-icon v-else name="clear" class="cursor-pointer" @click="keyword = ''" />
          </template>
        </q-input>

      </q-toolbar>

      <AudioPlayer />
    </q-header>

    <q-drawer
      v-model="drawerOpen"
      show-if-above
      :mini="miniState"
      @mouseover="miniState = false"
      @mouseout="miniState = true"
      mini-to-overlay

      :width="230"
      :breakpoint="500"
      bordered
      content-class="bg-grey-1"
    >
      <q-scroll-area class="fit">
        <q-list>
          <q-item
            clickable
            v-ripple
            exact
            :to="link.path"
            active-class="text-deep-purple text-weight-medium"
            v-for="(link, index) in links"
            :key="index"
            @click="miniState = true"
          >
            <q-item-section avatar>
              <q-icon :name="link.icon" />
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-subtitle1">
                {{link.title}}
              </q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            v-ripple
            exact
            active-class="text-deep-purple text-weight-medium"
            @click="randomPlay"
          >
            <q-item-section avatar>
              <q-icon name="shuffle" />
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-subtitle1">
                随心听
              </q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            v-ripple
            exact
            active-class="text-deep-purple text-weight-medium"
            @click="showTimer = true"
          >
            <q-item-section avatar>
              <q-icon name="bedtime" />
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-subtitle1">
                睡眠模式
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <q-list>
          <q-item
            clickable
            v-ripple
            exact
            active-class="text-deep-purple text-weight-medium"
            @click="confirm = true"
            v-if="authEnabled"
          >
            <q-item-section avatar>
              <q-icon name="exit_to_app" />
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-subtitle1">
                登出
              </q-item-label>
              <q-item-label caption lines="2">{{ userName }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

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

    <!-- 作品详情面板（桌面端）：从右侧滑出并顶开内容，左侧作品列表仍可滚动 -->
    <q-drawer
      v-if="!isMobilePanel"
      side="right"
      :value="workId !== null"
      @input="onPanelInput"
      :width="640"
      bordered
      elevated
      content-class="bg-white"
    >
      <WorkPanel
        v-if="workId !== null"
        :key="workId"
        :workid="workId"
        back-icon="arrow_forward"
        @close="closePanel"
      />
    </q-drawer>

    <q-page-container>
      <!-- <q-page padding> -->
        <keep-alive include="Works">
          <router-view />
        </keep-alive>
      <!-- </q-page> -->
        <q-page-scroller v-if="workId === null" position="bottom-right" :scroll-offset="150" :offset="[18, 18]">
          <q-btn fab icon="keyboard_arrow_up" color="accent" />
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
      <LyricsBar />
      <PlayerBar />
    </q-footer>
  </q-layout>
</template>

<script>
import PlayerBar from 'components/PlayerBar'
import AudioPlayer from 'components/AudioPlayer'
import LyricsBar from 'components/LyricsBar'
import SleepMode from 'components/SleepMode'
import WorkPanel from 'components/WorkPanel'
import NotifyMixin from '../mixins/Notification.js'
import { mapMutations, mapState } from 'vuex'

export default {
  name: 'MainLayout',

  mixins: [NotifyMixin],

  components: {
    PlayerBar,
    AudioPlayer,
    LyricsBar,
    SleepMode,
    WorkPanel
  },

  data () {
    return {
      keyword: '',
      drawerOpen: false,
      miniState: true,
      confirm: false,
      randId: null,
      showTimer: false,
      headerHeight: 0,
      footerHeight: 0,
      chromeObserver: null,
      links: [
        {
          title: '媒体库',
          icon: 'widgets',
          path: '/'
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
    keyword () {
      this.$router.push(this.keyword ? `/works?keyword=${this.keyword}` : `/works`)
    },

    randId () {
      // 跳到 /work/:id 会被路由守卫截获并改成打开详情面板，
      // 所以这里要吞掉被取消的导航抛出的 promise
      this.$router.push(`/work/${this.randId}`).catch(() => {})
    },
    sharedConfig (config) {
      this.SET_REWIND_SEEK_TIME(config.rewindSeekTime);
      this.SET_FORWARD_SEEK_TIME(config.forwardSeekTime);
    },

    // 面板打开期间发生真实跳转（点标签/社团/侧边栏等）时关闭面板
    $route () {
      this.closePanel()
    }
  },

  mounted () {
    this.initUser();
    // this.checkUpdate();
    this.readSharedConfig();
    this.measureChrome();

    window.addEventListener('resize', this.measureChrome);
    window.addEventListener('keydown', this.handlePanelKeyEvent);

    if (typeof ResizeObserver !== 'undefined') {
      this.chromeObserver = new ResizeObserver(this.measureChrome);
      [this.$refs.header, this.$refs.footer].forEach((ref) => {
        ref && this.chromeObserver.observe(ref.$el);
      });
    }
  },

  beforeDestroy () {
    window.removeEventListener('resize', this.measureChrome);
    window.removeEventListener('keydown', this.handlePanelKeyEvent);
    this.chromeObserver && this.chromeObserver.disconnect();
  },

  computed: {
    // isNotAtHomePage () {
    //   const path = this.$route.path
    //   return path && path !=='/' && path !=='/works' && path !== '/favourites';
    // },

    ...mapState('User', {
      userName: 'name',
      authEnabled: 'auth'
    }),

    ...mapState('WorkPanel', {
      workId: 'workId'
    }),

    isMobilePanel () {
      return this.$q.screen.lt.md
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
              // this.showWarnNotif(error.response.data.error)
              // 验证失败，跳转到登录页面
              const path = this.$router.currentRoute.path
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
              // this.showWarnNotif(error.response.data.error)
              // 验证失败，跳转到登录页面
              const path = this.$router.currentRoute.path
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

    randomPlay() {
      this.requestRandomWork();
    },

    requestRandomWork () {
      const params = {
        order: 'betterRandom',
      }
      this.$axios.get('/api/works', { params })
        .then((response) => {
          const works = response.data.works
          this.randId = works.length ? works[0].id : null;
          if(works.length === 0){
            this.showErrNotif("列表中无作品，请增加后再使用此功能")
          }
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
      this.$q.localStorage.set('jwt-token', '')
      this.$router.push('/login')
    },

    back () {
      this.$router.go(-1)
    }
  },
}
</script>


<style lang="scss">
// 侧边栏底部按钮
  aside.q-drawer div.q-scrollarea > div.scroll > div {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
  }

// 移动端作品详情面板：只覆盖内容区（header 与 footer 之间）
  .work-panel-mobile {
    position: fixed;
    left: 0;
    right: 0;
    z-index: 2500;
  }

// 移动端详情面板的滑入/滑出（从右侧进出）
  .work-panel-slide-enter-active,
  .work-panel-slide-leave-active {
    transition: transform 0.3s cubic-bezier(0.215, 0.61, 0.355, 1);
  }

  .work-panel-slide-enter,
  .work-panel-slide-leave-to {
    transform: translate3d(100%, 0, 0);
  }
</style>
