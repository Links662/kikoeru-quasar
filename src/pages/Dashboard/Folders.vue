<template>
  <div>
    <q-card class="q-ma-md">
      <q-form @submit="onSubmitRootFolder">
        <q-toolbar>
          <q-toolbar-title>添加新文件夹</q-toolbar-title>
        </q-toolbar>

        <div class="q-pa-sm">
          <q-input
            outlined
            dense
            v-model="rootFolder.name"
            required
            lazy-rules
            :rules="[val => !config.rootFolders.find(rootFolder => rootFolder.name === val) || '该别名已存在，文件夹别名不能重复']"
            label="文件夹别名"
          />

          <q-input
            outlined
            dense
            v-model="rootFolder.path"
            required
            lazy-rules
            :rules="[val => !config.rootFolders.find(rootFolder => rootFolder.path === val) || '该路径已存在，文件夹路径不能重复']"
            label="绝对路径"
          />

          <div class="row justify-end">
            <q-btn unelevated type="submit" color="primary" label="添加" />
          </div>
        </div>
      </q-form>
    </q-card>

    <q-form @submit="onSubmit">
      <q-card class="q-ma-md" v-show="config.rootFolders.length">
        <q-toolbar>
          <q-toolbar-title>文件夹列表</q-toolbar-title>
        </q-toolbar>

        <q-list>
          <q-item v-for="rootFolder in config.rootFolders" :key="rootFolder.name">
            <q-item-section avatar>
              <q-icon color="amber" name="folder" />
            </q-item-section>

            <q-item-section>
              <q-item-label>{{rootFolder.name}}</q-item-label>
              <q-item-label caption>{{rootFolder.path}}</q-item-label>
            </q-item-section>

            <q-item-section avatar>
              <q-btn flat round color="negative" icon="delete" aria-label="删除文件夹"
                @click="removeFromRootFolders(index)" />
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
          <q-toolbar-title>封面文件夹路径</q-toolbar-title>
        </q-toolbar>

        <div v-if="config.coverUseDefaultPath" class="q-pa-md">已指定为默认路径，即程序所在位置下的covers文件夹。如需修改，请前往高级设置并取消“封面使用默认路径”。</div>
        <div v-else class="q-pa-sm">
          <q-input outlined dense required v-model="config.coverFolderDir" aria-label="封面文件夹路径" />
        </div>
      </q-card>

      <div class="q-ma-lg row justify-end">
        <q-btn unelevated :loading="loading" label="保存" type="submit" color="primary" />
      </div>
    </q-form>
  </div>
</template>

<script>
import NotifyMixin from '../../mixins/Notification.js'

export default {
  name: 'Folders',

  mixins: [NotifyMixin],

  data () {
    return {
      config: {
        rootFolders: []
      },
      rootFolder: {
        name: '',
        path: ''
      },
      // 封面升级只针对这两张缩略图（main 是原图，没有升级一说）
      coverUpgradeOptions: ['sam', '240x240'],
      loading: false
    }
  },

  methods: {
    requestConfig () {
      this.$axios.get('/api/config/admin')
        .then((response) => {
          this.config = response.data.config
          this.rootFolder.path = response.data.config.voiceWorkDefaultPath
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
      this.loading = true
      this.$axios.put('/api/config/admin', {
        config: this.config
      })
        .then(() => {
          this.showSuccNotif('设置已保存')
          this.loading = false
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

    onSubmitRootFolder () {
      if (this.rootFolder.name !== '' && this.rootFolder.path !== '') {
        this.config.rootFolders.push({
          name: this.rootFolder.name,
          path: this.rootFolder.path
        })
        this.rootFolder.name = ''
        this.rootFolder.path = ''
        this.onSubmit()
      }
    },

    removeFromRootFolders (index) {
      this.config.rootFolders.splice(index, 1)
      this.onSubmit()
    },
  },

  created () {
    this.requestConfig()
  }
}
</script>

<style lang="scss" scoped>
.admin-field {
  max-width: 6.25rem;
}
</style>
