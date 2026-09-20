/** Shared UI and sequencer state without pulling in a state dependency. */
import { useSyncExternalStore } from 'react';

export type SoundState = 'on' | 'off';
export type MusicTool = 'draw' | 'erase';

type State = {
  clearSequenceSignal: number;
  gridSize: number;
  loopSteps: number;
  menuOpen: boolean;
  musicTool: MusicTool;
  noteCount: number;
  presetId: string | null;
  presetSignal: number;
  restartSequenceSignal: number;
  sequencerPlaying: boolean;
  sound: SoundState;
  stepsPerBeat: number;
  tempo: number;
  volume: number;
};

let state: State = {
  clearSequenceSignal: 0,
  gridSize: 24,
  loopSteps: 128,
  menuOpen: false,
  musicTool: 'draw',
  noteCount: 0,
  presetId: null,
  presetSignal: 0,
  restartSequenceSignal: 0,
  sequencerPlaying: false,
  sound: 'off',
  stepsPerBeat: 4,
  tempo: 108,
  volume: 0.72,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  emit();
};

export const store = {
  applyPreset: (
    presetId: string,
    tempo: number,
    loopSteps: number,
    stepsPerBeat: number,
  ) =>
    set({
      loopSteps,
      presetId,
      presetSignal: state.presetSignal + 1,
      sequencerPlaying: true,
      stepsPerBeat,
      tempo,
    }),
  clearSequence: () =>
    set({
      clearSequenceSignal: state.clearSequenceSignal + 1,
      loopSteps: 128,
      noteCount: 0,
      presetId: null,
      sequencerPlaying: false,
      stepsPerBeat: 4,
    }),
  get: () => state,
  setGridSize: (gridSize: number) => set({ gridSize }),
  setMenu: (menuOpen: boolean) => set({ menuOpen }),
  setMusicTool: (musicTool: MusicTool) => set({ musicTool }),
  setNoteCount: (noteCount: number) => set({ noteCount }),
  markSequenceEdited: () => set({ presetId: null }),
  setSequencerPlaying: (sequencerPlaying: boolean) => set({ sequencerPlaying }),
  setSound: (sound: SoundState) => set({ sound }),
  setTempo: (tempo: number) =>
    set({ tempo: Math.min(180, Math.max(60, Math.round(tempo))) }),
  setVolume: (volume: number) =>
    set({ volume: Math.min(1, Math.max(0, volume)) }),
  restartSequence: () =>
    set({
      restartSequenceSignal: state.restartSequenceSignal + 1,
      sequencerPlaying: state.noteCount > 0,
    }),
  subscribe: (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  toggleSound: () => store.setSound(state.sound === 'on' ? 'off' : 'on'),
};

export function useStore<T>(selector: (s: State) => T): T {
  const get = () => selector(store.get());
  return useSyncExternalStore(store.subscribe, get, get);
}
