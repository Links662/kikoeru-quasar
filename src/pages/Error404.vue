<template>
  <div class="fixed-center text-center">
    <p>
      <img
        src="~assets/sad.svg"
        class="error-logo"
      >
    </p>
    
    <p class="text-faded">
      抱歉，页面不存在。<strong>(404)</strong>
    </p>
    <q-btn
      color="secondary"
      class="error-btn"
      to="/"
      label="返回首页"
    />
  </div>
</template>

<script>
export default {
  name: 'Error404'
}
</script>

<style lang="scss" scoped>
// 图标按视口宽度缩放，但不要超过 150px
.error-logo {
  width: 30vw;
  max-width: 150px;
}

.error-btn {
  width: 200px;
}
</style>
