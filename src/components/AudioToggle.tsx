/**
 * Persistent audio toggle, pinned bottom-right. Reflects and flips the
 * global sound preference. An equalising bar mark animates when sound is on.
 */
import { initAudio, play } from '@/lib/audio';
import { cn } from '@/lib/className';
import { store, useStore } from '@/lib/store';
import { Volume2, VolumeX } from 'lucide-react';

export default function AudioToggle() {
  const sound = useStore((s) => s.sound);
  const on = sound === 'on';

  const toggle = () => {
    initAudio();
    store.toggleSound();
    play('toggle');
  };

  return (
    <button
      aria-label={on ? 'Turn sound off' : 'Turn sound on'}
      aria-pressed={on}
      className={cn(
        'pointer-events-auto fixed right-[var(--page-inset-x)] bottom-[var(--page-inset-x)] z-40',
        'flex h-9 w-9 items-center justify-center rounded-full',
        'border border-black/15 bg-white/70 backdrop-blur-sm dark:border-white/15 dark:bg-neutral-900/60',
        'text-tertiary hover:text-primary transition-colors',
      )}
      onClick={toggle}
      type="button"
    >
      {on ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
