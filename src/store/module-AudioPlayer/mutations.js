const mutations = {
  TOGGLE_HIDE(state) {
    state.hide = !state.hide;
  },

  PLAY(state) {
    state.playing = true;
  },
  PAUSE(state) {
    state.playing = false;
  },
  TOGGLE_PLAYING(state) {
    state.playing = !state.playing;
  },

  // 只记录媒体元素的事实状态，绝不反向影响 playing（意图）
  SET_ELEMENT_PLAYING(state, value) {
    state.elementPlaying = Boolean(value);
  },

  // 播放队列中的指定 track
  SET_TRACK(state, index) {
    if (index < 0 || index >= state.queue.length) return;

    state.queueIndex = index;
    state.playing = true;

    // 同步 metadata 到 currentPlayingFile
    state.currentPlayingFile = { ...state.queue[index] };
  },

  NEXT_TRACK(state) {
    if (state.queueIndex < state.queue.length - 1) {
      state.queueIndex += 1;
      state.playing = true;
      state.currentPlayingFile = { ...state.queue[state.queueIndex] };
    }
  },

  PREVIOUS_TRACK(state) {
    if (state.queueIndex > 0) {
      state.queueIndex -= 1;
      state.playing = true;
      state.currentPlayingFile = { ...state.queue[state.queueIndex] };
    }
  },

  SET_QUEUE(state, payload) {
    state.queue = payload.queue;
    state.queueIndex = payload.index;

    if (payload.queue[payload.index]) {
      state.currentPlayingFile = { ...payload.queue[payload.index] };
    }
  },

  // 彻底复位（登出等认证边界使用）：停止播放并清空所有与"当前播放内容"相关的状态
  RESET(state) {
    state.playing = false;
    state.elementPlaying = false;
    state.currentTime = 0;
    state.duration = 0;
    state.queue = [];
    state.queueIndex = 0;
    state.queueOpen = false;
    state.lyricsOpen = false;
    state.currentLyric = "";
    state.lyricAvailable = false;
    state.lyricLoading = false;
    state.lyricsWanted = false;
    state.seekTime = -1;
    state.sleepTime = null;
    state.sleepMode = false;
    state.currentPlayingFile = {
      hash: null,
      title: "",
      album: "",
      artist: "",
      mediaStreamUrl: "",
      mediaDownloadUrl: ""
    };
  },

  EMPTY_QUEUE(state) {
    state.playing = false;
    state.queue = [];
    state.queueIndex = 0;
    state.currentPlayingFile = {
      hash: null,
      title: "",
      album: "",
      artist: "",
      mediaStreamUrl: "",
      mediaDownloadUrl: ""
    };
  },

  ADD_TO_QUEUE(state, file) {
    state.queue.push(file);
  },

  REMOVE_FROM_QUEUE(state, index) {
    state.queue.splice(index, 1);

    if (index === state.queueIndex) {
      state.playing = false;
      state.queueIndex = 0;
      state.currentPlayingFile = {
        hash: null,
        title: "",
        album: "",
        artist: "",
        mediaStreamUrl: "",
        mediaDownloadUrl: ""
      };
    } else if (index < state.queueIndex) {
      state.queueIndex -= 1;
    }
  },

  SET_DURATION(state, second) {
    state.duration = second
  },

  SET_CURRENT_TIME(state, second) {
    state.currentTime = second
  },

  // 添加文件到当前 track 后面播放
  PLAY_NEXT(state, file) {
    state.queue.splice(state.queueIndex + 1, 0, file);
  },

  TOGGLE_MUTED(state) {
    state.muted = !state.muted;
  },

  SET_VOLUME(state, val) {
    if (val < 0 || val > 1) return;
    state.volume = val;
  },

  SET_REWIND_SEEK_TIME(state, value) {
    state.rewindSeekTime = value;
  },

  SET_FORWARD_SEEK_TIME(state, value) {
    state.forwardSeekTime = value;
  },

  SET_REWIND(state) {
    state.seekTime = Math.max(state.currentTime - state.rewindSeekTime, 0);
  },

  SET_FORWARD(state) {
    state.seekTime = Math.min(state.currentTime + state.forwardSeekTime, state.duration);
  },

  SET_SEEKTIME(state, value) {
    state.seekTime = value
  },

  SET_CURRENT_LYRIC(state, line) {
    state.currentLyric = line;
  },

  SET_QUEUE_OPEN(state, value) {
    state.queueOpen = Boolean(value);
  },

  SET_LYRICS_OPEN(state, value) {
    state.lyricsOpen = Boolean(value);
  },

  SET_LYRIC_AVAILABLE(state, value) {
    state.lyricAvailable = Boolean(value);
  },

  SET_LYRIC_LOADING(state, value) {
    state.lyricLoading = Boolean(value);
  },

  // 播放列表：点一次展开、再点一次收起。和歌词互不影响，两者可以同时开着
  TOGGLE_QUEUE(state) {
    state.queueOpen = !state.queueOpen;
  },

  // 歌词开关：打开时同时记住"想要歌词"（换到没有歌词的曲目只是暂时收起，
  // 下一首有歌词会自动展开），关掉时就是真的关掉
  TOGGLE_LYRICS(state) {
    const wanted = state.lyricsOpen !== true;

    state.lyricsWanted = wanted;
    state.lyricsOpen = wanted;
  },

  SET_SLEEP_TIMER(state, time) {
    state.sleepTime = time;
    state.sleepMode = true;
  },
  CLEAR_SLEEP_MODE(state) {
    state.sleepTime = null;
    state.sleepMode = false;
  },

};

export default mutations;
