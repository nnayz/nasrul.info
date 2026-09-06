import { cn } from '@/lib/className';
import AudioToggle from '@components/AudioToggle';
import Background from '@components/Background';
import CursorTrail from '@components/CursorTrail';
import MenuOverlay from '@components/MenuOverlay';
import Navbar from '@components/Navbar';
import SoundGate from '@components/SoundGate';
import { useRouterState } from '@tanstack/react-router';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from 'next-themes';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isHome = pathname === '/';
  const isArticle =
    pathname.startsWith('/writing/') || pathname.startsWith('/highlights/');
  const isEditorial =
    pathname === '/writing' || pathname === '/highlights' || isArticle;
  const isPlayground = pathname === '/playground';

  return (
    <div
      className={cn('relative min-h-screen', isEditorial && 'article-shell')}
    >
      {isEditorial ? (
        <div className="article-surface" />
      ) : (
        <Background showGrid={isHome} />
      )}
      {isHome && <CursorTrail />}
      {!isPlayground && <div aria-hidden className="nav-fade" />}
      <SoundGate />
      <Navbar />
      <MenuOverlay />

      <main
        className={cn(
          'relative z-10 w-full font-sans antialiased',
          isPlayground
            ? 'min-h-[100svh]'
            : 'pointer-events-none flex min-h-screen flex-col justify-start',
          '[&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_input]:pointer-events-auto [&_nav]:pointer-events-auto',
          '[&_canvas]:pointer-events-auto [&_div[class*="cursor-pointer"]]:pointer-events-auto',
        )}
      >
        {children}
      </main>

      {!isPlayground && <AudioToggle />}
      <Analytics />
    </div>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      {children}
    </ThemeProvider>
  );
}
