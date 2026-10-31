<template>
  <q-form @submit="onSubmit">
    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>播放器设置</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item>
          <q-item-section>
            <q-item-label>后退按钮跳跃秒数</q-item-label>
            <q-item-label caption>播放时后退按钮跳跃秒数</q-item-label>
          </q-item-section>

          <q-item-section side>
            <div class="q-gutter-sm">
              <!-- val 用字符串：本页 UI 状态（data 与 requestConfig）都是字符串，提交时才 parseInt -->
              <q-radio dense v-model="rewindSeekTime" val="5" label="5 秒" />
              <q-radio dense v-model="rewindSeekTime" val="10" label="10 秒" />
              <q-radio dense v-model="rewindSeekTime" val="30" label="30 秒" />
            </div>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>前进按钮跳跃秒数</q-item-label>
            <q-item-label caption>播放时前进按钮跳跃秒数</q-item-label>
          </q-item-section>

          <q-item-section side>
            <div class="q-gutter-sm">
              <q-radio dense v-model="forwardSeekTime" val="5" label="5 秒" />
              <q-radio dense v-model="forwardSeekTime" val="10" label="10 秒" />
              <q-radio dense v-model="forwardSeekTime" val="30" label="30 秒" />
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>爬虫相关设置</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item>
          <q-item-section>
            <q-item-label>标签语言</q-item-label>
            <q-item-label caption>从 DLSite 爬取的标签元数据的语言</q-item-label>
          </q-item-section>

          <q-item-section side>
            <div class="q-gutter-sm">
              <q-radio dense v-model="config.tagLanguage" val="zh-CN" label="简" />
              <q-radio dense v-model="config.tagLanguage" val="zh-TW" label="繁" />
              <q-radio dense v-model="config.tagLanguage" val="ja-JP" label="日" />
            </div>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>DLsite 超时时间</q-item-label>
            <q-item-label caption>默认 10000 毫秒</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-input
              v-model.number="config.dlsiteTimeout"
              aria-label="DLsite 超时时间"
              type="number"
              input-class="text-right"
              class="admin-field"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>HVDB 超时时间</q-item-label>
            <q-item-label caption>默认 10000 毫秒</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-input
              v-model.number="config.hvdbTimeout"
              aria-label="HVDB 超时时间"
              type="number"
              input-class="text-right"
              class="admin-field"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>重新请求间隔时间</q-item-label>
            <q-item-label caption>默认 2000 毫秒</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-input
              v-model.number="config.retryDelay"
              aria-label="重新请求间隔时间"
              type="number"
              input-class="text-right"
              class="admin-field"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>请求最大尝试次数</q-item-label>
            <q-item-label caption>默认 5</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-input
              v-model.number="config.retry"
              aria-label="请求最大尝试次数"
              type="number"
              input-class="text-right"
              class="admin-field"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>爬虫并行任务数量</q-item-label>
            <q-item-label caption>默认 16</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-input
              v-model.number="config.maxParallelism"
              aria-label="爬虫并行任务数量"
              type="number"
              input-class="text-right"
              class="admin-field"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>HTTP 代理服务主机 IP</q-item-label>
            <q-item-label caption>此项为空时默认为本机</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-input
              v-model="config.httpProxyHost"
              aria-label="HTTP 代理服务主机 IP"
              input-class="text-right"
              class="admin-field"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>HTTP 代理服务端口号 </q-item-label>
            <q-item-label caption>此项为 0 时默认不使用代理</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-input
              v-model.number="config.httpProxyPort"
              aria-label="HTTP 代理服务端口号"
              type="number"
              input-class="text-right"
              class="admin-field"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>文件夹扫描相关设置</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item>
          <q-item-section>
            <q-item-label>最大递归扫描深度</q-item-label>
            <q-item-label caption>默认 2</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-input
              v-model.number="config.scannerMaxRecursionDepth"
              aria-label="最大递归扫描深度"
              type="number"
              input-class="text-right"
              class="admin-field"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>扫描时跳过清理失效作品</q-item-label>
            <q-item-label caption>是否跳过清理已不存在的作品（不推荐，默认不跳过）</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-toggle v-model="config.skipCleanup" dense aria-label="扫描时跳过清理失效作品" />
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

    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>Web 服务器相关设置</q-toolbar-title>
        <div class="q-pr-xs">更改此设置需要重启程序</div>
      </q-toolbar>

      <q-list>
        <q-item>
          <q-item-section>
            <q-item-label>用户验证</q-item-label>
            <q-item-label caption>是否启用用户验证（生产环境下无法修改此设置）</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-toggle
              v-model="config.auth"
              dense
              aria-label="启用用户验证"
              :disable="config.production"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>启用Gzip</q-item-label>
            <q-item-label caption>对网络传输启用Gzip压缩</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-toggle v-model="config.enableGzip" dense aria-label="启用 Gzip" />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>设置端口号</q-item-label>
            <q-item-label caption>服务器监听端口号</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-input
              v-model.number="config.listenPort"
              aria-label="服务器监听端口号"
              type="number"
              input-class="text-right"
              class="admin-field"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>屏蔽远程连接</q-item-label>
            <q-item-label caption>只允许本地访问，默认关闭。更改此设置需要重启程序</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-toggle v-model="config.blockRemoteConnection" dense aria-label="屏蔽远程连接" />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>token 过期时间</q-item-label>
            <q-item-label caption>默认 2592000 秒</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-input
              v-model.number="config.expiresIn"
              aria-label="token 过期时间"
              type="number"
              input-class="text-right"
              class="admin-field"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>每页显示的音声数量</q-item-label>
            <q-item-label caption>默认 12</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-input
              v-model.number="config.pageSize"
              aria-label="每页显示的音声数量"
              type="number"
              input-class="text-right"
              class="admin-field"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>历史记录显示数量</q-item-label>
            <q-item-label caption>默认 20</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-input
              v-model.number="config.recentCount"
              aria-label="历史记录显示数量"
              type="number"
              input-class="text-right"
              class="admin-field"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>
    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>其它设置</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item>
          <q-item-section>
            <q-item-label>数据库使用默认路径</q-item-label>
            <q-item-label caption>使用程序所在位置下的sqlite文件夹，并忽略databaseFolderDir设置（如无必要请勿修改，更改此设置需要重启程序）</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-toggle v-model="config.dbUseDefaultPath" dense aria-label="数据库使用默认路径" />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>封面使用默认路径</q-item-label>
            <q-item-label caption>使用程序所在位置下的covers文件夹，并忽略封面文件夹路径设置</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-toggle v-model="config.coverUseDefaultPath" dense aria-label="封面使用默认路径" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <div class="q-ma-lg row justify-end">
      <q-btn :loading="loading" label="保存" type="submit" color="primary" />
    </div>
  </q-form>
</template>

<script>
import NotifyMixin from '../../mixins/Notification.js'

export default {
  name: 'Advanced',

  mixins: [NotifyMixin],

  data () {
    return {
      config: {},
      loading: false,
      // 封面升级只针对这两张缩略图（main 是原图，没有升级一说）
      coverUpgradeOptions: ['sam', '240x240'],
      rewindSeekTime: '5',
      forwardSeekTime: '30'
    }
  },

  methods: {
    requestConfig () {
      this.$axios.get('/api/config/admin')
        .then((response) => {
          this.config = response.data.config;
          this.rewindSeekTime = this.config.rewindSeekTime.toString()
          this.forwardSeekTime = this.config.forwardSeekTime.toString()
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

    onSubmit () {
      this.config.rewindSeekTime = parseInt(this.rewindSeekTime)
      this.config.forwardSeekTime = parseInt(this.forwardSeekTime)

      this.loading = true
      this.$axios.put('/api/config/admin', {
        config: this.config
      })
        .then(() => {
          this.loading = false
          this.showSuccNotif('设置已保存')
        })
        .catch((error) => {
          this.loading = false
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },
  },

  created () {
    this.requestConfig()
  }
}
</script>

<style lang="scss" scoped>
// 控制台里成组的短输入框：Quasar 没有宽度工具类，宽度统一收在这里（6.25rem = 100px）
.admin-field {
  max-width: 6.25rem;
}
</style>
