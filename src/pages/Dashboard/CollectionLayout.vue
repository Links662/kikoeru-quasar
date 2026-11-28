<template>
  <q-page>
    <div class="q-px-md q-pt-md">
      <div class="text-h5 text-weight-regular">采集与自动化</div>
      <div class="text-caption app-text-secondary">
        管理本地入库、在线抓取、数据维护和定时执行。
      </div>
    </div>

    <q-tabs
      align="left"
      no-caps
      inline-label
      active-color="app-accent"
      indicator-color="app-accent"
      class="q-px-md q-mt-sm"
      aria-label="采集与自动化页面"
    >
      <q-route-tab
        label="任务运行"
        icon="play_circle_outline"
        to="/admin/collection/run"
        exact
      />
      <q-route-tab
        label="定时任务"
        icon="schedule"
        to="/admin/collection/automations"
        exact
      />
      <q-route-tab
        label="采集参数"
        icon="tune"
        to="/admin/collection/settings"
        exact
      />
    </q-tabs>

    <q-separator />

    <router-view />
  </q-page>
</template>

<script>
export default {
  name: 'CollectionLayout'
}
</script>
