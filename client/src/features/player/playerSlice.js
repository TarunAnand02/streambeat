import { createSlice } from '@reduxjs/toolkit';

// Tracks the currently "active" upload-sourced video across navigation, so a
// mini-player can pick up roughly where the full Watch page left off instead
// of playback just stopping when you browse away. Only ever one video at a
// time (like a real player) — YouTube-sourced videos aren't tracked here,
// since their playback lives entirely inside YouTube's own iframe.
const initialState = {
  currentVideo: null, // { id, title, uploaderName, uploaderId }
  currentTime: 0,
  isPlaying: false,
  volume: 1,
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    playVideo(state, action) {
      // Switching to a different video resets progress; re-entering the
      // same one (e.g. navigating back to its Watch page) keeps it.
      if (state.currentVideo?.id !== action.payload.id) {
        state.currentTime = 0;
      }
      state.currentVideo = action.payload;
      state.isPlaying = true;
    },
    updateProgress(state, action) {
      state.currentTime = action.payload;
    },
    setPlaying(state, action) {
      state.isPlaying = action.payload;
    },
    setVolume(state, action) {
      state.volume = action.payload;
    },
    stopPlayer(state) {
      state.currentVideo = null;
      state.currentTime = 0;
      state.isPlaying = false;
    },
  },
});

export const { playVideo, updateProgress, setPlaying, setVolume, stopPlayer } = playerSlice.actions;
export default playerSlice.reducer;
