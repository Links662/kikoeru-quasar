import { EMPTY_TRACK, EMPTY_WORK } from './state'

const getters = {
  // 当前曲目：只含曲目自己的字段
  currentTrack: (state) => state.queue[state.queueIndex] || EMPTY_TRACK,

  // 当前队列所属作品：作品名、社团、R18，整个队列共用一份
  currentWork: (state) => state.queueWork || EMPTY_WORK,

  // 有没有正在播放的曲目（播放器是否该显示，看这个）
  hasTrack: (state) => Boolean(state.queue[state.queueIndex]),

  // 当前曲目有可用的歌词文件（引擎异步查出来的结果）
  hasLyric: (state) => state.lyricAvailable === true
}

export default getters
