export default {
  hide: false,
  // playing: 用户意图 —— “应该播放吗”。只有用户操作（播放按钮、曲目、线控/锁屏确认过的控制）
  // 和 app 自己的策略（睡眠定时等）能写它；它是 UI 图标和“接下来该怎样”的唯一依据。
  playing: false,
  // elementPlaying: 事实 —— 媒体元素此刻真的在出声吗。只由 <audio> 的 play/playing/pause/ended
  // 事件写入，任何逻辑都不应因为它去调用 play()/pause()，它只用于显示和“意图与事实不一致”时的判定。
  elementPlaying: false,
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
    album: "",
    artist: "",
    mediaStreamUrl: "",
    mediaDownloadUrl: ""
  }
}
