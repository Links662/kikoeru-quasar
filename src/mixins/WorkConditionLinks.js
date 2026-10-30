import { getWorkConditionLinkResult } from '../utils/workQuery'

export default {
  methods: {
    workConditionLink (route, type, id) {
      return getWorkConditionLinkResult(route, type, id).link
    },

    handleWorkConditionClick (event, route, type, id) {
      const result = getWorkConditionLinkResult(route, type, id)
      if (result.allowed) return

      event.preventDefault()
      event.stopPropagation()
      this.$q.notify({
        message: result.message,
        color: 'warning',
        icon: 'warning',
        timeout: 4000
      })
    }
  }
}
