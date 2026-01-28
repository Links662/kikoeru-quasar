export default {
  hide: false,
  playing: false,
  currentTime: 0,
  duration: 0,
  queue: [], // 每个 track 含 metadata + source
  queueIndex: 0,
  playMode: { id: 0, name: "order" },
  muted: false,
  volume: 0,
  currentLyric: '',
  sleepTime: null,
  sleepMode: false,
  rewindSeekTime: 5,
  forwardSeekTime: 30,
  seekTime: -1,
  currentPlayingFile: { // 只存 metadata，source 预加载但不自动播放
    hash: null,
    title: "",
    workTitle: "",
    mediaStreamUrl:"",
    mediaDownloadUrl:""
  }
}
