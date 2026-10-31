<template>
  <q-input
    ref="input"
    :model-value="modelValue"
    :placeholder="placeholder"
    :aria-label="placeholder"
    dense
    outlined
    rounded
    clearable
    clear-icon="close"
    class="search-input app-control-field"
    v-bind="$attrs"
    @update:model-value="updateValue"
  >
    <template v-slot:append>
      <q-icon v-if="!hasValue" name="search" />
    </template>
  </q-input>
</template>

<script>
export default {
  name: 'SearchInput',

  inheritAttrs: false,

  props: {
    modelValue: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: '搜索…'
    }
  },

  emits: ['update:model-value'],

  computed: {
    hasValue () {
      return this.modelValue !== ''
    }
  },

  methods: {
    updateValue (value) {
      this.$emit('update:model-value', value || '')
    },

    focus () {
      this.$refs.input.focus()
    },

    blur () {
      this.$refs.input.blur()
    }
  }
}
</script>
