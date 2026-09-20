/** Circular view-transition: the new theme grows out of the toggle. */
import { flushSync } from 'react-dom';

type ThemeName = 'light' | 'dark';

type ViewTransition = {
  finished: Promise<void>;
  ready: Promise<void>;
};

type DocumentWithViewTransition = Document & {
  startViewTransition?: (update: () => void) => ViewTransition;
};

let running = false;

export function revealThemeFrom(
  origin: HTMLElement,
  nextTheme: ThemeName,
  setTheme: (theme: string) => void,
) {
  const apply = () => {
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    flushSync(() => setTheme(nextTheme));
  };

  const doc = document as DocumentWithViewTransition;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (running || reduced || typeof doc.startViewTransition !== 'function') {
    apply();
    return;
  }

  const rect = origin.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  running = true;
  const transition = doc.startViewTransition(apply);

  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 700,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'both',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    })
    .catch(() => {
      /* Transition was skipped or aborted. */
    });

  transition.finished.finally(() => {
    running = false;
  });
}
