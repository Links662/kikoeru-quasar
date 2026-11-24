<template>
  <q-form @submit="onSubmit">
    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>播放器设置</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item class="setting-choice-item">
          <q-item-section>
            <q-item-label>后退按钮跳跃秒数</q-item-label>
            <q-item-label caption>播放时后退按钮跳跃秒数</q-item-label>
          </q-item-section>

          <q-item-section side class="setting-choice-control">
            <div class="app-control-group seek-time-toggle">
              <q-btn-toggle
                v-model="rewindSeekTime"
                :options="seekTimeOptions"
                class="app-theme-control full-width"
                dense
                unelevated
                spread
                no-caps
                toggle-color="app-accent"
                toggle-text-color="app-accent-contrast"
                aria-label="后退按钮跳跃秒数"
              />
            </div>
          </q-item-section>
        </q-item>

        <q-item class="setting-choice-item">
          <q-item-section>
            <q-item-label>前进按钮跳跃秒数</q-item-label>
            <q-item-label caption>播放时前进按钮跳跃秒数</q-item-label>
          </q-item-section>

          <q-item-section side class="setting-choice-control">
            <div class="app-control-group seek-time-toggle">
              <q-btn-toggle
                v-model="forwardSeekTime"
                :options="seekTimeOptions"
                class="app-theme-control full-width"
                dense
                unelevated
                spread
                no-caps
                toggle-color="app-accent"
                toggle-text-color="app-accent-contrast"
                aria-label="前进按钮跳跃秒数"
              />
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
        <q-item class="setting-choice-item">
          <q-item-section>
            <q-item-label>标签语言</q-item-label>
            <q-item-label caption>从 DLSite 爬取的标签元数据的语言</q-item-label>
          </q-item-section>

          <q-item-section side class="setting-choice-control">
            <div class="app-control-group tag-language-toggle">
              <q-btn-toggle
                v-model="config.tagLanguage"
                :options="tagLanguageOptions"
                class="app-theme-control full-width"
                dense
                unelevated
                spread
                no-caps
                toggle-color="app-accent"
                toggle-text-color="app-accent-contrast"
                aria-label="标签语言"
              />
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
            <q-checkbox
              v-model="config.auth"
              dense
              color="app-accent"
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
            <q-checkbox
              v-model="config.enableGzip"
              dense
              color="app-accent"
              aria-label="启用 Gzip"
            />
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
            <q-checkbox
              v-model="config.blockRemoteConnection"
              dense
              color="app-accent"
              aria-label="屏蔽远程连接"
            />
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
            <q-item-label>列表每页显示数量</q-item-label>
            <q-item-label caption>默认 50</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-input
              v-model.number="config.listPageSize"
              aria-label="列表每页显示数量"
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
    <div class="q-ma-lg row justify-end">
      <q-btn unelevated :loading="loading" label="保存" type="submit" color="primary" />
    </div>
  </q-form>
</template>

<script>
import NotifyMixin from '../../mixins/Notification.js'

const SEEK_TIME_OPTIONS = [
  { label: '5 秒', value: '5' },
  { label: '10 秒', value: '10' },
  { label: '30 秒', value: '30' }
]

const TAG_LANGUAGE_OPTIONS = [
  { label: '简体中文', value: 'zh-CN' },
  { label: '繁體中文', value: 'zh-TW' },
  { label: '日本語', value: 'ja-JP' }
]

export default {
  name: 'Advanced',

  mixins: [NotifyMixin],

  data () {
    return {
      config: {},
      loading: false,
      rewindSeekTime: '5',
      forwardSeekTime: '30',
      seekTimeOptions: SEEK_TIME_OPTIONS,
      tagLanguageOptions: TAG_LANGUAGE_OPTIONS
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

.seek-time-toggle {
  --app-control-item-min-width: 4rem;
}

.tag-language-toggle {
  --app-control-item-min-width: 4.5rem;
}

@media (max-width: $breakpoint-xs-max) {
  .setting-choice-item {
    flex-wrap: wrap;
  }

  .setting-choice-control {
    width: 100%;
    margin-top: 0.25rem;
    margin-left: 0;
    align-items: stretch;
  }

  .setting-choice-control .app-control-group {
    width: 100%;
  }
}
</style>
