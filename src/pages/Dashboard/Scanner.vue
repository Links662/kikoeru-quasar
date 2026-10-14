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
          color="teal"
          label="扫描本地音声库"
          :disable="state === 'running' || !socketConnected"
          @click="performScan()"
        />
      </div>

      <div class="col-xs-6 col-sm-4 row q-pa-sm">
        <q-btn
          class="col"
          color="primary"
          label="刷新音声库信息"
          :disable="state === 'running' || !socketConnected"
          @click="performUpdate()"
        />
      </div>

      <div class="col-xs-6 col-sm-4 row q-pa-sm">
        <q-btn
          class="col"
          color="brown"
          label="修复封面"
          :disable="state === 'running' || !socketConnected"
          @click="repairCovers()"
        />
      </div>

      <div class="col-xs-12 col-sm-4 row q-pa-sm">
        <q-btn
          class="col"
          color="negative"
          label="终止扫描进程"
          :disable="state !== 'running' || !socketConnected"
          @click="killScanProceess()"
        />
      </div>
    </div>

    <q-card v-show="state" class="q-ma-md">
      <q-expansion-item expand-separator>
        <template v-slot:header>
          <q-item-section avatar>
            <q-spinner-gears v-if="state === 'running'" color="primary" size="2em" />
            <q-icon v-else-if="state === 'finished'" name="done" color="positive" size="2em" />
            <q-icon v-else-if="state === 'error'" name="bug_report" color="red" size="2em" />
          </q-item-section>

          <q-item-section>
            <q-item-label v-if="allLogs.length > 1" class="ellipsis">{{allLogs[allLogs.length - 2].message}}</q-item-label>
            <q-item-label v-if="allLogs.length > 0" class="ellipsis">{{allLogs[allLogs.length - 1].message}}</q-item-label>
          </q-item-section>
        </template>
        
        <q-scroll-area class="log-scroll bg-dark text-white q-pa-md">
          <div v-for="(log, index) in allLogs" :key="index" >
            <span :class="log.level === 'error' ? 'text-red' : ''">➜ {{log.message}}</span>
          </div>
        </q-scroll-area>
      </q-expansion-item>
    </q-card>

    <q-card v-show="(tasks.length > 0) || (failedTasks.length > 0)" class="q-ma-md">
      <q-tabs
        v-model="tab"
        dense
        inline-label
        class="text-grey"
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
          <q-badge v-show="failedTasks.length > 0" color="red" floating>{{failedTasks.length}}</q-badge>
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
                    <q-spinner-hourglass color="primary" size="2em" />
                  </q-item-section>

                  <q-item-section>
                    <q-item-label v-if="item.logs.length > 0" class="ellipsis">{{item.logs[item.logs.length - 1].message}}</q-item-label>
                    <q-item-label caption>{{`RJ${item.rjcode}`}}</q-item-label>
                  </q-item-section>
                </template>
                
                <q-card>
                  <q-card-section class="bg-dark text-white">
                    <div v-for="(log, index) in item.logs" :key="index">
                      <span :class="log.level === 'error' ? 'text-red' : ''">➜ {{log.message}}</span>
                    </div>
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
                header-class="bg-negative"
              >
                <template v-slot:header>
                  <q-item-section avatar>
                    <q-icon name="bug_report" color="white" size="2em" />
                  </q-item-section>

                  <q-item-section>
                    <q-item-label class="text-white ellipsis" >
                      {{item.logs[item.logs.length - 1].message}}
                    </q-item-label>

                    <q-item-label caption class="text-white">
                      {{`RJ${item.rjcode}`}}
                    </q-item-label>
                  </q-item-section>
                </template>
                
                <q-card>
                  <q-card-section class="bg-dark text-white">
                    <div v-for="(log, index) in item.logs" :key="index">
                      <span :class="log.level === 'error' ? 'text-red' : ''">➜ {{log.message}}</span>
                    </div>
                  </q-card-section>
                </q-card>
              </q-expansion-item>
              
            </template>
          </q-virtual-scroll>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </div>
</template>

<script>
import NotifyMixin from '../../mixins/Notification.js'

// socket 不可用时的轮询间隔
const POLL_INTERVAL = 2000

export default {
  name: 'Scanner',

  mixins: [NotifyMixin],

  data () {
    return {
      tab: 'tasks',
      state: null, // ['running', 'finished', 'error']
      socketConnected: false, // socket 是否可用（响应式，模板据此禁用按钮）
      polling: false, // 是否正在用轮询兜底
      pollTimer: null,
      finishedMessage: null, // 扫描结束时服务端给出的总结
      tasks: [], // 正在处理中的并行任务
      failedTasks: [], // 处理失败的任务
      mainLogs: [],
      results: []
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
      this.$socket.emit('COUNT_UPDATE')
    },
    SCAN_ERROR () {
      this.state = 'error'
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

    // 只维护封面：补缺失、重新生成过期缩略图、把本地生成的降级图换成 DLsite 原图
    repairCovers () {
      this.resetScanState()
      this.state = 'running'
      this.$socket.emit('PERFORM_COVER_REPAIR')
    },

    killScanProceess () {
      this.$socket.emit('KILL_SCAN_PROCESS')
    },

    resetScanState () {
      this.tasks = []
      this.failedTasks = []
      this.mainLogs = []
      this.results = []
      this.finishedMessage = null
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
    }
  },

  computed: {
    allLogs () {
      const resultLogs = this.results.map(res => {
        if (res.result === 'added') {
          return { level: 'info', message: `[RJ${res.rjcode}] 添加成功! Added: ${res.count}` }
        } else if (res.result === 'repaired') {
          return { level: 'info', message: `[RJ${res.rjcode}] 封面修复成功! Repaired: ${res.count}` }
        } else if (res.result === 'upgraded') {
          return { level: 'info', message: `[RJ${res.rjcode}] 封面升级成功! Upgraded: ${res.count}` }
        } else if (res.result === 'updated') {
          return { level: 'info', message: `[RJ${res.rjcode}] 更新成功! Updated: ${res.count}` }
        } else {
          return { level: 'error', message: `[RJ${res.rjcode}] 处理失败! Failed: ${res.count}` }
        }
      })

      const logs = this.mainLogs.concat(resultLogs)

      // 结束语由 SCAN_FINISHED 单独给出，不混进 mainLogs / results
      if (this.finishedMessage) {
        logs.push({ level: 'info', message: this.finishedMessage })
      }

      return logs
    }
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
