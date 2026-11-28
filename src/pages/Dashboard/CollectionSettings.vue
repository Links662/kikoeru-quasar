<template>
  <q-form @submit="onSubmit">
    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>在线抓取</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item>
          <q-item-section>
            <q-item-label>每次刷新作品数量</q-item-label>
            <q-item-label caption>每次点击最多选择多少条待刷新作品</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-input
              v-model.number="config.metadataRefreshBatchSize"
              aria-label="每次刷新作品数量"
              type="number"
              input-class="text-right"
              class="admin-field"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>刷新多少天前的作品</q-item-label>
            <q-item-label caption>只选择指定天数以前更新过的数据，0 表示不限</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-input
              v-model.number="config.metadataRefreshStaleDays"
              aria-label="刷新多少天前的作品"
              type="number"
              input-class="text-right"
              class="admin-field"
            />
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
            <q-item-label>抓取并行任务数量</q-item-label>
            <q-item-label caption>默认 16</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-input
              v-model.number="config.maxParallelism"
              aria-label="抓取并行任务数量"
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
            <q-item-label>HTTP 代理服务端口号</q-item-label>
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
        <q-toolbar-title>本地扫描与维护</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item>
          <q-item-section>
            <q-item-label>扫描时跳过清理失效作品</q-item-label>
            <q-item-label caption>
              是否跳过清理已不存在的作品（不推荐，默认不跳过）
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-checkbox
              v-model="config.skipCleanup"
              dense
              color="app-accent"
              aria-label="扫描时跳过清理失效作品"
            />
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
              sam 是原图的等比缩略图；240x240 与 DLsite 原图的差异主要是多一次压缩。
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

    <div class="q-ma-lg row justify-end">
      <q-btn unelevated :loading="loading" label="保存" type="submit" color="primary" />
    </div>
  </q-form>
</template>

<script>
import NotifyMixin from '../../mixins/Notification.js'

export default {
  name: 'CollectionSettings',

  mixins: [NotifyMixin],

  data () {
    return {
      config: {},
      loading: false,
      coverUpgradeOptions: ['sam', '240x240']
    }
  },

  methods: {
    showRequestError (error, fallback) {
      if (error.response && error.response.status === 401) return
      if (!error.response) {
        this.showErrNotif(error.message || fallback)
        return
      }
      this.showErrNotif(
        error.response.data.error ||
        `${error.response.status} ${error.response.statusText || fallback}`
      )
    },

    async requestConfig () {
      try {
        const response = await this.$axios.get('/api/config/admin')
        this.config = response.data.config || {}
      } catch (error) {
        this.showRequestError(error, '加载采集参数失败')
      }
    },

    async onSubmit () {
      if (this.loading) return
      this.loading = true
      try {
        const response = await this.$axios.put('/api/config/admin', {
          config: this.config
        })
        this.config = response.data.config || this.config
        this.showSuccNotif('采集参数已保存')
      } catch (error) {
        this.showRequestError(error, '保存采集参数失败')
      } finally {
        this.loading = false
      }
    }
  },

  created () {
    this.requestConfig()
  }
}
</script>
