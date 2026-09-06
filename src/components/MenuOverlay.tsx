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
  { label: 'highlights', to: '/highlights' },
  { label: 'consulting', to: '/consulting' },
  { label: 'writing', to: '/writing' },
  { label: 'resources', to: '/resources' },
  { label: 'playground', to: '/playground' },
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
            className="pointer-events-auto fixed inset-y-2 right-2 z-[80] flex w-[calc(100%-1rem)] flex-col overflow-hidden bg-neutral-50 p-8 text-neutral-950 shadow-2xl ring-1 ring-black/5 sm:inset-y-3 sm:right-3 sm:w-[min(36rem,calc(100%-1.5rem))] sm:p-10"
            exit={{
              opacity: 0,
              transition: { duration: 0.4, ease: EASE_INOUT },
            }}
            layoutId={MENU_SURFACE}
            style={{ borderRadius: 24 }}
            transition={MENU_MORPH}
          >
            {/* The pill is dark in light mode; hold its colour for a beat so the
                surface doesn't flip white the instant it starts growing. */}
            <motion.span
              animate={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 bg-neutral-950 dark:hidden"
              initial={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: EASE_INOUT }}
            />

            <motion.div
              animate={{ opacity: 1 }}
              className="relative flex justify-end"
              initial={{ opacity: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <button
                className="group flex items-center gap-2 rounded-full bg-[#1EFFB8] py-1 pr-1 pl-4 text-black lowercase"
                onClick={() => {
                  play('open');
                  store.setMenu(false);
                }}
                onMouseEnter={() => play('hover')}
                type="button"
              >
                <span className="font-menu text-base font-medium tracking-[-0.02em] text-black">
                  close
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full text-black transition-transform duration-300 group-hover:rotate-90">
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </span>
              </button>
            </motion.div>

            <div className="relative flex flex-1 flex-col justify-center gap-1">
              {pages.map((p, i) => {
                const active = isActive(pathname, p.to);
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
                        className="group font-menu flex items-baseline gap-4"
                        onMouseEnter={() => play('hover')}
                        to={p.to}
                      >
                        <span
                          className="font-menu inline-flex items-baseline gap-3 font-normal tracking-[-0.045em] opacity-40 transition-opacity group-hover:opacity-100 data-[active]:opacity-100"
                          data-active={active || undefined}
                          style={{
                            fontSize: 'clamp(2.25rem, 7vw, 4.5rem)',
                            lineHeight: 1.05,
                          }}
                        >
                          {p.to === '/playground' && (
                            <Music2
                              aria-hidden="true"
                              className="h-[0.8em] w-[0.8em] shrink-0"
                            />
                          )}
                          {p.label}
                        </span>
                        {active && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-neutral-950" />
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
              <div className="flex gap-3">
                {socials.map((s) => (
                  <a
                    aria-label={s.label}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-950 text-neutral-50 transition-transform duration-300 hover:-translate-y-1"
                    href={s.href}
                    key={s.label}
                    onMouseEnter={() => play('hover')}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <s.icon className="h-4 w-4" />
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
