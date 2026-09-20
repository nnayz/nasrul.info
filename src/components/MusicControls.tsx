import { Select } from '@/components/ui/Select';
import {
  getPianoStatus,
  initAudio,
  play,
  preloadPiano,
  setMusicVolume,
  stopMusic,
  subscribePianoStatus,
} from '@/lib/audio';
import { cn } from '@/lib/className';
import { PRESETS, type Preset } from '@/lib/presets';
import { store, useStore } from '@/lib/store';
import {
  Eraser,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const GRID_SIZES = [16, 24, 32];

const GRID_SIZE_OPTIONS = GRID_SIZES.map((size) => ({
  label: String(size),
  value: size,
}));

function formatDuration(preset: Preset) {
  const seconds = Math.round(
    (preset.steps / preset.stepsPerBeat / preset.tempo) * 60,
  );
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function toggleGlobalSound() {
  initAudio();
  if (store.get().sound === 'on') {
    play('click');
    stopMusic();
    store.setSound('off');
  } else {
    store.setSound('on');
    void preloadPiano();
    play('click');
  }
}

export default function MusicControls() {
  const state = useStore((current) => current);
  const pianoStatus = useSyncExternalStore(
    subscribePianoStatus,
    getPianoStatus,
    getPianoStatus,
  );
  const [loadingPresetId, setLoadingPresetId] = useState<string | null>(null);
  const selectionRequest = useRef(0);
  const hasNotes = state.noteCount > 0;
  const activePreset = PRESETS.find((preset) => preset.id === state.presetId);

  useEffect(() => {
    setMusicVolume(state.volume);
  }, [state.volume]);

  useEffect(() => {
    if (state.sound === 'on') void preloadPiano();
  }, [state.sound]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.defaultPrevented ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLButtonElement ||
        target instanceof HTMLAnchorElement ||
        (target instanceof HTMLElement && target.closest('[role="listbox"]')) ||
        (target instanceof HTMLElement && target.isContentEditable)
      )
        return;

      if (event.code === 'Space' && store.get().noteCount > 0) {
        event.preventDefault();
        initAudio();
        store.setSequencerPlaying(!store.get().sequencerPlaying);
      }
      if (event.key.toLowerCase() === 'd') store.setMusicTool('draw');
      if (event.key.toLowerCase() === 'e') store.setMusicTool('erase');
      if (event.key.toLowerCase() === 'm') toggleGlobalSound();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const togglePlayback = () => {
    if (!hasNotes) return;
    initAudio();
    store.setSequencerPlaying(!state.sequencerPlaying);
  };

  const selectPreset = async (preset: Preset) => {
    const request = selectionRequest.current + 1;
    selectionRequest.current = request;
    initAudio();
    setLoadingPresetId(preset.id);
    await preloadPiano();
    if (selectionRequest.current !== request) return;
    store.applyPreset(
      preset.id,
      preset.tempo,
      preset.steps,
      preset.stepsPerBeat,
    );
    setLoadingPresetId(null);
  };

  const pianoLabel =
    pianoStatus === 'loading'
      ? 'Loading piano…'
      : pianoStatus === 'error'
        ? 'Synth fallback'
        : 'Grand piano';

  return (
    <section
      aria-label="Sequencer controls"
      className="pointer-events-auto relative z-10 shrink-0 border-t border-black/10 bg-paper pb-[env(safe-area-inset-bottom)] select-none dark:border-white/10 dark:bg-neutral-950"
      role="toolbar"
    >
      <div className="flex h-10 items-stretch border-b border-black/10 px-3 sm:px-6 dark:border-white/10">
        <span className="text-quaternary hidden shrink-0 items-center pr-4 text-[10px] font-medium lowercase md:flex">
          scores
        </span>
        <div
          aria-label="Preset arrangements"
          className="scrollbar-hide flex min-w-0 flex-1 items-stretch overflow-x-auto"
        >
          <button
            aria-pressed={!state.presetId}
            className={trackClass(!state.presetId)}
            onClick={() => {
              selectionRequest.current += 1;
              setLoadingPresetId(null);
              store.clearSequence();
            }}
            type="button"
          >
            {hasNotes && !state.presetId ? 'your score' : 'new score'}
          </button>

          {PRESETS.map((preset) => {
            const active = preset.id === state.presetId;
            const loading = preset.id === loadingPresetId;
            return (
              <button
                aria-busy={loading}
                aria-pressed={active}
                className={trackClass(active)}
                key={preset.id}
                onClick={() => void selectPreset(preset)}
                type="button"
              >
                {loading && (
                  <span className="size-1 animate-pulse rounded-full bg-current opacity-50 motion-reduce:animate-none" />
                )}
                <span>{preset.label}</span>
                <span className="text-quaternary text-[9px] tabular-nums">
                  {formatDuration(preset)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-quaternary flex shrink-0 items-center gap-1.5 border-l border-black/10 pl-3 text-[10px] sm:pl-4 dark:border-white/10">
          <span className="hidden sm:inline">grid</span>
          <Select
            ariaLabel="Grid resolution"
            onValueChange={store.setGridSize}
            options={GRID_SIZE_OPTIONS}
            size="tiny"
            value={state.gridSize}
          />
        </div>
      </div>

      <div className="grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6">
        <button
          aria-label={state.sequencerPlaying ? 'Pause (Space)' : 'Play (Space)'}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-20 dark:bg-neutral-50 dark:text-neutral-950"
          disabled={!hasNotes}
          onClick={togglePlayback}
          type="button"
        >
          {state.sequencerPlaying ? (
            <Pause className="size-3.5" fill="currentColor" />
          ) : (
            <Play className="size-3.5 translate-x-px" fill="currentColor" />
          )}
        </button>

        <div className="min-w-0">
          <p className="text-primary truncate text-xs leading-tight font-medium sm:text-sm">
            {activePreset?.label ??
              (hasNotes ? 'Your score' : 'New composition')}
          </p>
          <p className="text-quaternary mt-1 hidden truncate text-[10px] leading-none sm:block">
            {activePreset
              ? `${activePreset.artist} · ${formatDuration(activePreset)}`
              : pianoLabel}
          </p>
        </div>

        <div className="flex items-center">
          <IconButton
            disabled={!hasNotes}
            label="Restart score"
            onClick={() => {
              initAudio();
              store.restartSequence();
            }}
          >
            <RotateCcw className="size-3.5" />
          </IconButton>
          <IconButton
            active={state.musicTool === 'draw'}
            label="Draw notes (D)"
            onClick={() => store.setMusicTool('draw')}
          >
            <Pencil className="size-3.5" />
          </IconButton>
          <IconButton
            active={state.musicTool === 'erase'}
            label="Erase notes (E)"
            onClick={() => store.setMusicTool('erase')}
          >
            <Eraser className="size-3.5" />
          </IconButton>
          <IconButton
            className="hidden sm:flex"
            disabled={!hasNotes}
            label="Clear all notes"
            onClick={() => store.clearSequence()}
          >
            <Trash2 className="size-3.5" />
          </IconButton>

          <span className="mx-2 hidden h-4 w-px bg-black/10 lg:block dark:bg-white/10" />
          <label
            className="hidden items-center gap-2 lg:flex"
            htmlFor="music-volume"
          >
            <Volume1 className="text-quaternary size-3.5" />
            <input
              aria-label="Piano volume"
              className="h-1 w-14 cursor-pointer accent-neutral-950 dark:accent-neutral-50"
              id="music-volume"
              max="1"
              min="0"
              onChange={(event) => store.setVolume(Number(event.target.value))}
              step="0.01"
              type="range"
              value={state.volume}
            />
          </label>
          <IconButton
            label={state.sound === 'on' ? 'Mute (M)' : 'Unmute (M)'}
            onClick={toggleGlobalSound}
          >
            {state.sound === 'on' ? (
              <Volume2 className="size-3.5" />
            ) : (
              <VolumeX className="size-3.5" />
            )}
          </IconButton>
        </div>
      </div>
    </section>
  );
}

function trackClass(active: boolean) {
  return cn(
    'flex shrink-0 items-center gap-1.5 border-b px-2.5 text-left text-[10px] font-medium whitespace-nowrap transition-colors sm:px-3',
    'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-current',
    active
      ? 'text-primary border-current'
      : 'text-quaternary hover:text-secondary border-transparent',
  );
}

function IconButton({
  active,
  children,
  className,
  disabled,
  label,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex size-8 items-center justify-center border-b transition-colors sm:size-9',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current',
        active
          ? 'text-primary border-current'
          : 'text-quaternary hover:text-primary border-transparent',
        'disabled:pointer-events-none disabled:opacity-25',
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
