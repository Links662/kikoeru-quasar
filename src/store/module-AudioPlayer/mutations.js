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

  EMPTY_QUEUE(state) {
    state.playing = false;
    state.queue = [];
    state.queueIndex = 0;
    state.currentPlayingFile = {
      hash: null,
      title: "",
      workTitle: "",
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
        workTitle: "",
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

  CHANGE_PLAY_MODE(state) {
    const playModes = [
      { id: 0, name: "order" },
      { id: 1, name: "all repeat" },
      { id: 2, name: "repeat once" },
      { id: 3, name: "shuffle" }
    ];

    const index = (state.playMode.id >= playModes.length - 1) ? 0 : (state.playMode.id + 1);
    state.playMode = playModes[index];
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
