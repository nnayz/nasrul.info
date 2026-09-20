/**
 * Navigation card. It is the navbar's menu pill, morphed: the pill and this
 * card share a layoutId, so clicking the pill grows it into the card and
 * closing shrinks it back. Links stagger in once the surface has settled.
 */
import { play } from '@/lib/audio';
import {
  EASE_EXPO,
  EASE_INOUT,
  EASE_QUART,
  MENU_MORPH,
  MENU_SURFACE,
} from '@/lib/motion';
import { store, useStore } from '@/lib/store';
import { Link, useRouterState } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Github, Linkedin, Mail, Music2, X } from 'lucide-react';
import { useEffect } from 'react';

const pages = [
  { label: 'home', to: '/' },
  { label: 'work', to: '/work' },
  { label: 'consulting', to: '/consulting' },
  { label: 'writing', to: '/writing' },
  { label: 'resources', to: '/resources' },
] as const;

const EMAIL = 'nasrul.huda.ds@gmail.com';

const socials = [
  { href: 'https://github.com/nnayz', icon: Github, label: 'github' },
  {
    href: 'https://www.linkedin.com/in/nasrul-hudaa/',
    icon: Linkedin,
    label: 'linkedin',
  },
  { href: 'https://x.com/nnasrrull', icon: XLogo, label: 'x' },
  { href: `mailto:${EMAIL}`, icon: Mail, label: 'email' },
];

export default function MenuOverlay() {
  const open = useStore((s) => s.menuOpen);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  // Close on route change and on Escape.
  useEffect(() => {
    store.setMenu(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === 'Escape' && store.setMenu(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* Only the dim needs AnimatePresence — the card's exit *is* the morph
          back into the pill, which happens because the pill remounts. */}
      <AnimatePresence>
        {open && (
          <motion.button
            animate={{ opacity: 1 }}
            aria-label="Close menu"
            className="pointer-events-auto fixed inset-0 z-[75] cursor-default bg-black/30"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => store.setMenu(false)}
            transition={{ duration: 0.5, ease: EASE_QUART }}
            type="button"
          />
        )}
      </AnimatePresence>

      {/* The other half of the morph: this card *is* the navbar's menu pill,
          grown. Framer animates it out of the pill's box because they share
          MENU_SURFACE — and on close it crossfades back down into it. */}
      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Primary"
            className="pointer-events-auto fixed top-[var(--page-inset-y)] right-[var(--page-inset-x)] z-[80] flex min-h-0 w-[min(18rem,calc(100%_-_2*var(--page-inset-x)))] flex-col gap-5 overflow-hidden bg-neutral-950 p-4 text-neutral-50 shadow-2xl ring-1 ring-white/10 sm:p-5 dark:bg-neutral-50 dark:text-neutral-950 dark:ring-black/5"
            exit={{
              opacity: 0,
              transition: { duration: 0.4, ease: EASE_INOUT },
            }}
            layoutId={MENU_SURFACE}
            style={{ borderRadius: 18 }}
            transition={MENU_MORPH}
          >
            <motion.div
              animate={{ opacity: 1 }}
              className="relative flex items-center justify-end gap-2"
              initial={{ opacity: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <Link
                aria-label="Playground"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1EFFB8] text-black transition-transform duration-300 ease-out hover:scale-110"
                onClick={() => play('click')}
                to="/playground"
              >
                <Music2 className="h-3.5 w-3.5" strokeWidth={2.25} />
              </Link>
              <button
                aria-label="Close menu"
                className="group flex h-8 w-8 items-center justify-center rounded-full bg-[#FF1E48] text-white transition-transform duration-300 ease-out hover:scale-105"
                onClick={() => {
                  play('click');
                  store.setMenu(false);
                }}
                type="button"
              >
                <X
                  className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-90"
                  strokeWidth={2.5}
                />
              </button>
            </motion.div>

            <div className="relative flex flex-col gap-0">
              {pages.map((p, i) => {
                const active =
                  p.to === '/work'
                    ? pathname.startsWith('/work') ||
                      pathname.startsWith('/highlights')
                    : isActive(pathname, p.to);
                return (
                  <div className="overflow-hidden" key={p.to}>
                    <motion.div
                      animate={{ y: 0 }}
                      initial={{ y: '110%' }}
                      transition={{
                        delay: 0.4 + i * 0.07,
                        duration: 0.9,
                        ease: EASE_EXPO,
                      }}
                    >
                      <Link
                        className="group font-menu flex items-baseline gap-2.5"
                        onClick={() => play('click')}
                        to={p.to}
                      >
                        <span
                          className="font-menu inline-flex items-baseline gap-2 font-normal tracking-[-0.045em] opacity-40 transition-opacity group-hover:opacity-100 data-[active]:opacity-100"
                          data-active={active || undefined}
                          style={{
                            fontSize: 'clamp(1.25rem, 4vh, 2.25rem)',
                            lineHeight: 1.1,
                          }}
                        >
                          {p.label}
                        </span>
                        {active && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-50 dark:bg-neutral-950" />
                        )}
                      </Link>
                    </motion.div>
                  </div>
                );
              })}
            </div>

            <motion.div
              animate={{ opacity: 1 }}
              className="relative"
              initial={{ opacity: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
            >
              <div className="flex gap-2">
                {socials.map((s) => (
                  <a
                    aria-label={s.label}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-50 text-neutral-950 transition-transform duration-300 ease-out hover:scale-110 dark:bg-neutral-950 dark:text-neutral-50"
                    href={s.href}
                    key={s.label}
                    onClick={() => play('click')}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <s.icon className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </motion.div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}

function isActive(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname.startsWith(to);
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
