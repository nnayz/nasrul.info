/** Web Audio engine for UI feedback and the spatial piano sequencer. */
import { store } from './store';

type Blip = 'click' | 'hover' | 'toggle' | 'open' | 'enter' | 'grid';
export type PianoStatus = 'idle' | 'loading' | 'ready' | 'error';

type PianoNoteOptions = {
  delay?: number;
  duration?: number;
  gain?: number;
  pan?: number;
  velocity?: number;
};

type MusicVoice = {
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
  startAt: number;
  stopAt: number;
};

type Spec = {
  attack: number;
  cutoff: number;
  cutoffEnd?: number;
  dur: number;
  freq: number;
  gain: number;
  glide?: number;
  subGain?: number;
  type: OscillatorType;
};

const specs: Record<Blip, Spec> = {
  enter: {
    attack: 0.12,
    cutoff: 900,
    dur: 1.6,
    freq: 196,
    gain: 0.05,
    glide: 261.63,
    type: 'sine',
  },
  grid: {
    attack: 0.008,
    cutoff: 460,
    cutoffEnd: 180,
    dur: 0.15,
    freq: 174.61,
    gain: 0.018,
    glide: 130.81,
    subGain: 0.45,
    type: 'sine',
  },
  click: {
    attack: 0.002,
    cutoff: 640,
    cutoffEnd: 180,
    dur: 0.07,
    freq: 168,
    gain: 0.028,
    type: 'sine',
  },
  hover: {
    attack: 0.03,
    cutoff: 1400,
    dur: 0.32,
    freq: 523.25,
    gain: 0.014,
    type: 'sine',
  },
  open: {
    attack: 0.05,
    cutoff: 1000,
    dur: 0.75,
    freq: 261.63,
    gain: 0.045,
    glide: 392,
    type: 'sine',
  },
  toggle: {
    attack: 0.025,
    cutoff: 1200,
    dur: 0.4,
    freq: 392,
    gain: 0.03,
    type: 'triangle',
  },
};

const PIANO_SAMPLES = [
  [30, 'Fs1'],
  [33, 'A1'],
  [36, 'C2'],
  [39, 'Ds2'],
  [42, 'Fs2'],
  [45, 'A2'],
  [48, 'C3'],
  [51, 'Ds3'],
  [54, 'Fs3'],
  [57, 'A3'],
  [60, 'C4'],
  [63, 'Ds4'],
  [66, 'Fs4'],
  [69, 'A4'],
  [72, 'C5'],
  [75, 'Ds5'],
  [78, 'Fs5'],
  [81, 'A5'],
  [84, 'C6'],
] as const;

const MAX_MUSIC_VOICES = 64;
const VOICE_RELEASE = 0.055;
const activeMusicVoices: MusicVoice[] = [];
const lastPlayed: Partial<Record<Blip, number>> = {};
const pianoBuffers = new Map<number, AudioBuffer>();
const pianoStatusListeners = new Set<() => void>();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let pianoLoad: Promise<void> | null = null;
let pianoStatus: PianoStatus = 'idle';

const emitPianoStatus = () =>
  pianoStatusListeners.forEach((listener) => listener());

function createRoomImpulse(ac: AudioContext) {
  const length = Math.floor(ac.sampleRate * 1.8);
  const impulse = ac.createBuffer(2, length, ac.sampleRate);
  let seed = 19;

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      seed = (seed * 16807) % 2147483647;
      const noise = (seed / 2147483647) * 2 - 1;
      data[index] = noise * Math.pow(1 - index / length, 3.4);
    }
  }

  return impulse;
}

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;

  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.85;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 8;
    limiter.ratio.value = 10;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    master.connect(limiter);
    limiter.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = store.get().volume;

    const dry = ctx.createGain();
    dry.gain.value = 0.88;
    musicBus.connect(dry);
    dry.connect(master);

    const room = ctx.createConvolver();
    const wet = ctx.createGain();
    room.buffer = createRoomImpulse(ctx);
    wet.gain.value = 0.16;
    musicBus.connect(room);
    room.connect(wet);
    wet.connect(master);

  }

  return ctx;
}

function forgetMusicVoice(voice: MusicVoice) {
  const index = activeMusicVoices.indexOf(voice);
  if (index >= 0) activeMusicVoices.splice(index, 1);
}

function releaseMusicVoice(ac: AudioContext, voice: MusicVoice) {
  forgetMusicVoice(voice);
  const now = ac.currentTime;
  const stopAt = now + VOICE_RELEASE;
  const gain = voice.gain.gain;

  gain.cancelScheduledValues(now);
  gain.setValueAtTime(Math.max(gain.value, 0.0001), now);
  gain.exponentialRampToValueAtTime(0.0001, stopAt);

  for (const source of voice.sources) {
    try {
      source.stop(stopAt + 0.01);
    } catch {
      /* already stopped */
    }
  }
}

function reserveVoice(ac: AudioContext) {
  for (const voice of [...activeMusicVoices]) {
    if (voice.stopAt <= ac.currentTime) forgetMusicVoice(voice);
  }
  while (activeMusicVoices.length >= MAX_MUSIC_VOICES) {
    releaseMusicVoice(ac, activeMusicVoices[0]);
  }
}

/** Resume the context after a user gesture (browser autoplay policy). */
export function initAudio() {
  const ac = context();
  if (ac && ac.state === 'suspended') void ac.resume();
}

export function getPianoStatus() {
  return pianoStatus;
}

export function subscribePianoStatus(listener: () => void) {
  pianoStatusListeners.add(listener);
  return () => {
    pianoStatusListeners.delete(listener);
  };
}

/** Decode the local sample set once, then keep it in memory for the session. */
export function preloadPiano(): Promise<void> {
  const ac = context();
  if (!ac || pianoStatus === 'ready') return Promise.resolve();
  if (pianoLoad) return pianoLoad;

  pianoStatus = 'loading';
  emitPianoStatus();
  const root = `${import.meta.env.BASE_URL}static/audio/piano`;

  pianoLoad = Promise.all(
    PIANO_SAMPLES.map(async ([midi, filename]) => {
      const response = await fetch(`${root}/${filename}.mp3`);
      if (!response.ok) throw new Error(`Unable to load ${filename}`);
      const buffer = await ac.decodeAudioData(await response.arrayBuffer());
      pianoBuffers.set(midi, buffer);
    }),
  )
    .then(() => {
      pianoStatus = 'ready';
      emitPianoStatus();
    })
    .catch(() => {
      pianoStatus = 'error';
      pianoLoad = null;
      emitPianoStatus();
    });

  return pianoLoad;
}

export function setMusicVolume(volume: number) {
  const ac = context();
  if (!ac || !musicBus) return;
  musicBus.gain.setTargetAtTime(
    Math.min(1, Math.max(0, volume)),
    ac.currentTime,
    0.02,
  );
}

export function stopMusic() {
  const ac = context();
  if (!ac) return;
  for (const voice of [...activeMusicVoices]) releaseMusicVoice(ac, voice);
}

/** Soft hover pitch: higher rows are a little brighter, never trebly. */
export function gridHoverDetune(row: number, rows: number) {
  if (rows <= 1) return 0;
  const t = Math.min(1, Math.max(0, 1 - row / (rows - 1)));
  return (t - 0.4) * 320;
}

function playSoftClick(ac: AudioContext, now: number) {
  if (!master) return;

  const length = Math.floor(ac.sampleRate * 0.028);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }

  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const low = ac.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 520;
  low.Q.value = 0.4;
  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(0.1, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
  noise.connect(low);
  low.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(now);
}

export function play(name: Blip, detune = 0) {
  if (store.get().sound !== 'on') return;
  const ac = context();
  if (!ac || !master) return;
  if (ac.state === 'suspended') void ac.resume();

  const now = ac.currentTime;
  if (now - (lastPlayed[name] ?? -1) < 0.07) return;
  lastPlayed[name] = now;

  if (name === 'click') {
    playSoftClick(ac, now);
    return;
  }

  const { attack, cutoff, cutoffEnd, dur, freq, gain, glide, subGain, type } =
    specs[name];
  const oscillator = ac.createOscillator();
  const filter = ac.createBiquadFilter();
  const voice = ac.createGain();
  const stopAt = now + dur + 0.05;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, now);
  oscillator.detune.setValueAtTime(detune, now);
  if (glide) {
    oscillator.frequency.exponentialRampToValueAtTime(glide, now + dur * 0.7);
  }

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoff, now);
  if (cutoffEnd) {
    filter.frequency.exponentialRampToValueAtTime(cutoffEnd, now + dur);
  }
  filter.Q.value = 0.7;
  voice.gain.setValueAtTime(0.0001, now);
  voice.gain.linearRampToValueAtTime(gain, now + attack);
  voice.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  oscillator.connect(filter);
  filter.connect(voice);
  voice.connect(master);
  oscillator.start(now);
  oscillator.stop(stopAt);

  if (subGain) {
    const sub = ac.createOscillator();
    const subAmp = ac.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(freq / 2, now);
    sub.detune.setValueAtTime(detune, now);
    if (glide) {
      sub.frequency.exponentialRampToValueAtTime(glide / 2, now + dur * 0.7);
    }
    subAmp.gain.value = subGain;
    sub.connect(subAmp);
    subAmp.connect(filter);
    sub.start(now);
    sub.stop(stopAt);
  }
}

function nearestPianoSample(midi: number) {
  let nearest: number = PIANO_SAMPLES[0][0];
  for (const [candidate] of PIANO_SAMPLES) {
    if (Math.abs(candidate - midi) < Math.abs(nearest - midi))
      nearest = candidate;
  }
  return nearest;
}

function playSampledPiano(
  ac: AudioContext,
  midi: number,
  at: number,
  duration: number,
  peak: number,
  pan: number,
  velocity: number,
) {
  const sampleMidi = nearestPianoSample(midi);
  const buffer = pianoBuffers.get(sampleMidi);
  if (!buffer || !musicBus) return false;

  reserveVoice(ac);
  const source = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const panner = ac.createStereoPanner();
  const voice = ac.createGain();
  const releaseAt = at + Math.max(0.1, duration);
  const stopAt = releaseAt + 0.68;

  source.buffer = buffer;
  source.playbackRate.setValueAtTime(Math.pow(2, (midi - sampleMidi) / 12), at);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(5800 + velocity * 10500, at);
  filter.Q.value = 0.3;
  panner.pan.setValueAtTime(Math.min(1, Math.max(-1, pan)), at);
  voice.gain.setValueAtTime(0.0001, at);
  voice.gain.linearRampToValueAtTime(peak, at + 0.009);
  voice.gain.setValueAtTime(peak * 0.88, releaseAt);
  voice.gain.exponentialRampToValueAtTime(0.0001, stopAt);

  source.connect(filter);
  filter.connect(voice);
  voice.connect(panner);
  panner.connect(musicBus);
  source.start(at, Math.min(0.018, buffer.duration * 0.05));
  source.stop(stopAt + 0.03);

  const musicVoice = {
    gain: voice,
    sources: [source],
    startAt: at,
    stopAt: stopAt + 0.03,
  };
  activeMusicVoices.push(musicVoice);
  source.addEventListener('ended', () => forgetMusicVoice(musicVoice), {
    once: true,
  });
  return true;
}

function playFallbackPiano(
  ac: AudioContext,
  midi: number,
  at: number,
  duration: number,
  peak: number,
  pan: number,
) {
  if (!musicBus) return;
  reserveVoice(ac);

  const panner = ac.createStereoPanner();
  const filter = ac.createBiquadFilter();
  const voice = ac.createGain();
  const frequency = 440 * Math.pow(2, (midi - 69) / 12);
  const stopAt = at + Math.max(0.35, duration) + 0.75;
  const sources: OscillatorNode[] = [];

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(4200, frequency * 7), at);
  panner.pan.setValueAtTime(Math.min(1, Math.max(-1, pan)), at);
  voice.gain.setValueAtTime(0.0001, at);
  voice.gain.linearRampToValueAtTime(peak * 0.12, at + 0.012);
  voice.gain.exponentialRampToValueAtTime(0.0001, stopAt);
  voice.connect(filter);
  filter.connect(panner);
  panner.connect(musicBus);

  for (const [ratio, level, type] of [
    [1, 0.86, 'sine'],
    [2, 0.1, 'triangle'],
    [3, 0.04, 'sine'],
  ] as const) {
    const oscillator = ac.createOscillator();
    const partial = ac.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency * ratio, at);
    partial.gain.value = level;
    oscillator.connect(partial);
    partial.connect(voice);
    oscillator.start(at);
    oscillator.stop(stopAt + 0.03);
    sources.push(oscillator);
  }

  const musicVoice = {
    gain: voice,
    sources,
    startAt: at,
    stopAt: stopAt + 0.03,
  };
  activeMusicVoices.push(musicVoice);
  sources[0]?.addEventListener('ended', () => forgetMusicVoice(musicVoice), {
    once: true,
  });
}

/** Schedule a piano note. Detune remains relative to C4 for the grid API. */
export function playGridNote(
  detune = 0,
  {
    delay = 0,
    duration = 1.8,
    gain: gainScale = 1,
    pan = 0,
    velocity = 0.72,
  }: PianoNoteOptions = {},
) {
  if (store.get().sound !== 'on') return;
  const ac = context();
  if (!ac || !musicBus) return;
  if (ac.state === 'suspended') void ac.resume();

  const at = ac.currentTime + Math.min(Math.max(delay, 0), 0.2);
  const midi = Math.round(60 + detune / 100);
  const safeVelocity = Math.min(1, Math.max(0.08, velocity));
  const peak =
    0.34 * Math.min(1, Math.max(0, gainScale)) * Math.pow(safeVelocity, 1.15);

  if (!playSampledPiano(ac, midi, at, duration, peak, pan, safeVelocity)) {
    playFallbackPiano(ac, midi, at, duration, peak, pan);
  }
}
