// 曲目自己的字段（和后端 /api/tracks 返回的 audio 节点一致）。
// 队列里所有曲目都属于同一个作品，作品级的字段（作品名、社团、R18）只在
// queueWork 上存一份，不往每个 track 上抄。
export const EMPTY_TRACK = {
  hash: null,
  title: "",
  mediaStreamUrl: "",
  mediaDownloadUrl: ""
}

// 队列所属作品：album 是作品名，artist 是社团名（沿用播放器里的叫法）
export const EMPTY_WORK = {
  id: null,
  album: "",
  artist: "",
  nsfw: false
}

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
  queue: [], // [{ hash, title, mediaStreamUrl, mediaDownloadUrl }]
  queueIndex: -1, // -1 = 没有选中曲目（队列为空，或当前这首被移除）
  queueWork: null, // 队列所属作品，整个队列共用一份，见 EMPTY_WORK
  volume: 0,
  // 播放器展开时能弹出来的两块内容：当前播放列表，和封面下沿的歌词。
  // 两块各管各的，可以同时开着（歌词压在封面下沿，正好在列表上方）
  queueOpen: false,
  lyricsOpen: false,
  currentLyric: '',
  // 当前曲目有没有歌词文件 / 引擎是不是还在查。
  // 查的过程中没有歌词文件这件事"还没定"，UI 要靠 lyricLoading 区分，
  // 否则每次切歌按钮都会先闪一下灰
  lyricAvailable: false,
  lyricLoading: false,
  // 用户想不想要歌词（点过歌词按钮）。中间夹一首没有歌词的曲目时歌词会收起，
  // 但"想要"留着，下一首有歌词就自动展开
  lyricsWanted: false,
  sleepTime: null,
  sleepMode: false,
  rewindSeekTime: 5,
  forwardSeekTime: 30,
  seekTime: -1
}
