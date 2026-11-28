<template>
  <q-card class="collection-log-panel">
    <q-expansion-item expand-separator default-opened>
      <template v-slot:header>
        <q-item-section avatar>
          <q-spinner-gears v-if="state === 'running'" color="app-accent" size="2em" />
          <q-icon v-else-if="state === 'finished'" name="done" color="positive" size="2em" />
          <q-icon v-else-if="state === 'error'" name="error" color="app-danger" size="2em" />
          <q-icon v-else name="subject" color="app-accent" size="2em" />
        </q-item-section>

        <q-item-section>
          <q-item-label>运行日志</q-item-label>
          <q-item-label caption class="ellipsis">
            {{ logs.length > 0 ? logs[logs.length - 1].message : '暂无运行日志，任务启动后会在这里显示执行过程。' }}
          </q-item-label>
        </q-item-section>
      </template>

      <q-scroll-area class="log-scroll bg-dark text-white q-pa-md">
        <ScannerLogList v-if="logs.length > 0" :logs="logs" dark />
        <div v-else class="log-empty">
          <q-icon name="subject" size="2em" class="q-mb-sm" />
          <div>暂无运行日志</div>
        </div>
      </q-scroll-area>
    </q-expansion-item>
  </q-card>
</template>

<script>
import ScannerLogList from './ScannerLogList.vue'

export default {
  name: 'CollectionLogPanel',

  components: {
    ScannerLogList
  },

  props: {
    logs: {
      type: Array,
      default: () => []
    },
    state: {
      type: String,
      default: null
    }
  }
}
</script>

<style lang="scss" scoped>
.collection-log-panel {
  height: 100%;
}

.log-scroll {
  height: 256px;
}

.log-empty {
  display: flex;
  min-height: 220px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.65);
  text-align: center;
}
</style>
