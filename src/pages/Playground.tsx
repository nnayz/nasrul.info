import MusicControls from '@/components/MusicControls';
import MusicSequencer from '@/components/MusicSequencer';
import { PRESETS } from '@/lib/presets';
import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';

/** A single instrument surface: identity, score and transport share one frame. */
export default function Playground() {
  const state = useStore((current) => current);
  const activePreset = PRESETS.find((preset) => preset.id === state.presetId);
  const status = activePreset
    ? `${activePreset.label} · ${activePreset.artist}`
    : state.noteCount > 0
      ? `${state.noteCount} ${state.noteCount === 1 ? 'note' : 'notes'} · your score`
      : 'Spatial sequencer';
  const instruction = state.sequencerPlaying
    ? 'Notes sound as they cross the white gate.'
    : activePreset
      ? 'Swipe to inspect the score. Press play to resume.'
      : state.noteCount > 0
        ? 'Swipe to explore. Click or drag to keep composing.'
        : 'Click or drag to add notes. High notes are on the left. Playback runs bottom to top.';

  return (
    <motion.section
      animate={{ opacity: 1 }}
      aria-label="Spatial music sequencer"
      className="flex h-[100svh] min-h-0 flex-col px-[var(--page-inset-x)] pt-[var(--page-inset-y)] pb-[var(--page-inset-y)]"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="flex shrink-0 flex-col gap-0.5 pr-28">
        <h1>Playground</h1>
        <p className="text-tertiary text-xs font-medium tracking-wide">
          {status}
        </p>
      </header>

      <div className="relative mt-6 min-h-0 flex-1 overflow-hidden">
        <MusicSequencer />
        <p className="text-quaternary pointer-events-none absolute top-4 left-4 z-[3] max-w-[18rem] text-[10px] leading-snug sm:top-5 sm:left-5 sm:max-w-none sm:text-xs">
          {instruction}
        </p>
      </div>

      <MusicControls />
    </motion.section>
  );
}
