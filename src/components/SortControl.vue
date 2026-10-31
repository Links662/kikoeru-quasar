<template>
  <div class="sort-control row items-center no-wrap">
    <q-select
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      :options="options"
      option-label="label"
      options-dense
      options-selected-class="text-primary"
      dense
      outlined
      rounded
      behavior="menu"
      aria-label="排序方式"
      class="app-control-field sort-select text-grey-9"
      :menu-offset="[0, 6]"
    />

    <q-btn
      dense
      round
      unelevated
      color="white"
      text-color="grey-9"
      class="sort-direction-btn app-control-button q-ml-xs"
      aria-label="切换排序方向"
      :icon="direction ? 'arrow_downward' : 'arrow_upward'"
      @click="$emit('toggle-direction')"
    />
  </div>
</template>

<script>
export default {
  name: 'SortControl',

  props: {
    modelValue: {
      type: Object,
      required: true
    },
    options: {
      type: Array,
      required: true
    },
    direction: {
      type: Boolean,
      default: true
    }
  },

  emits: ['update:modelValue', 'toggle-direction']
}
</script>

<style lang="scss" scoped>
.sort-select {
  min-width: 106px;
}

.sort-direction-btn {
  width: $toolbar-control-height;
  height: $toolbar-control-height;
}

</style>
