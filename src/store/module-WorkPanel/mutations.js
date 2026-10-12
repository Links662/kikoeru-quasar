const mutations = {
  OPEN (state, workId) {
    state.workId = workId
  },

  CLOSE (state) {
    state.workId = null
  }
}

export default mutations
