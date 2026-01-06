const getters = {
  // 当前播放文件，包含 metadata
  currentPlayingFile: (state) => {
    return state.currentPlayingFile || {
      hash: null,
      title: "",
      workTitle: "",
      mediaStreamUrl: "",
      mediaDownloadUrl: ""
    }
  }
}

export default getters