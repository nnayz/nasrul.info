/**
 * Quiet edge chrome: a small logo mark top-left, and a menu pill + theme
 * toggle top-right. Primary navigation lives in the menu panel, which covers
 * this corner when open and carries its own close button.
 */
import { play } from '@/lib/audio';
import { cn } from '@/lib/className';
import { MENU_MORPH, MENU_SURFACE } from '@/lib/motion';
import { store, useStore } from '@/lib/store';
import { MoonIcon, SunIcon } from '@heroicons/react/24/solid';
import { Link, useRouterState } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

export default function Navbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const menuOpen = useStore((s) => s.menuOpen);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isPlayground = pathname === '/playground';
  const back = pathname.startsWith('/highlights/')
    ? { label: 'Highlights', to: '/highlights' as const }
    : pathname.startsWith('/writing/')
      ? { label: 'Writing', to: '/writing' as const }
      : null;

  return (
    <motion.nav
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'fixed z-[70] flex h-9 items-center',
        isPlayground
          ? 'top-3.5 right-4 justify-end sm:right-6'
          : 'inset-x-[var(--page-inset-x)] top-[var(--page-inset-y)] justify-between',
      )}
      initial={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {!isPlayground && (
        <div className="flex h-9 items-center">
          {back && (
            <Link className="page-back" to={back.to}>
              <span aria-hidden="true" className="back-arrow">
                ↩
              </span>
              {back.label}
            </Link>
          )}
        </div>
      )}

      <div className="flex h-9 items-center gap-2">
        <button
          aria-label="Toggle theme"
          className={cn(
            'pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full',
            'text-tertiary border border-black/15 transition-colors dark:border-white/15',
            'hover:text-primary',
          )}
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          type="button"
        >
          {resolvedTheme === 'dark' ? (
            <SunIcon className="h-4 w-4" />
          ) : (
            <MoonIcon className="h-4 w-4" />
          )}
        </button>

        <button
          aria-expanded={menuOpen}
          aria-label="Open menu"
          className={cn(
            'group pointer-events-auto relative inline-flex h-9 items-center gap-2 rounded-full px-4',
            'font-menu text-sm font-medium tracking-[-0.02em] lowercase transition-colors',
            'text-neutral-50 dark:text-neutral-950',
            // On hover the pill fills with its own inverse, so the label + dot
            // (bg-current) flip to the original background colour.
            'hover:text-neutral-950 dark:hover:text-neutral-50',
          )}
          onClick={() => {
            play('open');
            store.setMenu(true);
          }}
          onMouseEnter={() => play('hover')}
          type="button"
        >
          {/* The pill's surface is the menu card, pre-expansion: while closed it
              lives here, and on open it morphs into the card that owns the same
              layoutId. Only one of the two is ever mounted. */}
          {!menuOpen && (
            <motion.span
              className="absolute inset-0 overflow-hidden bg-neutral-950 dark:bg-neutral-50"
              layoutId={MENU_SURFACE}
              // Half the pill's height, not 9999: framer inverse-scales this
              // radius each frame of the morph, and an out-of-range value
              // clamps to an ellipse (the egg). Keep it = height / 2.
              style={{ borderRadius: 18 }}
              transition={MENU_MORPH}
            >
              <span
                className={cn(
                  'absolute inset-0 origin-left scale-x-0',
                  'transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100',
                  'bg-neutral-50 dark:bg-neutral-950',
                )}
              />
            </motion.span>
          )}
          <span className="relative z-10 h-1.5 w-1.5 rounded-full bg-current transition-transform duration-300 group-hover:scale-150" />
          <span className="relative z-10 block h-4 overflow-hidden">
            <span className="block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-4">
              <span className="flex h-4 items-center">menu</span>
              <span className="flex h-4 items-center">menu</span>
            </span>
          </span>
        </button>
      </div>
    </motion.nav>
  );
}
