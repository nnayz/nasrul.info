import { AppProviders, AppShell } from '../App';
import appCss from '../assets/styles/globals.css?url';
import proseCss from '../assets/styles/prose.css?url';
import NotFound from '../pages/NotFound';
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    links: [
      { href: '/favicon.svg', rel: 'icon', type: 'image/svg+xml' },
      { href: '/favicon.ico', rel: 'icon', type: 'image/x-icon' },
      {
        href: '/static/favicons/apple-touch-icon-180x180.png',
        rel: 'apple-touch-icon',
      },
      {
        href: '/static/favicons/site.webmanifest',
        rel: 'manifest',
      },
      {
        as: 'font',
        crossOrigin: 'anonymous',
        href: '/static/fonts/satoshi-400.woff2',
        rel: 'preload',
        type: 'font/woff2',
      },
      {
        as: 'font',
        crossOrigin: 'anonymous',
        href: '/static/fonts/satoshi-500.woff2',
        rel: 'preload',
        type: 'font/woff2',
      },
      { href: appCss, rel: 'stylesheet' },
      { href: proseCss, rel: 'stylesheet' },
    ],
    meta: [
      { charSet: 'utf-8' },
      {
        content: 'width=device-width, initial-scale=1.0, viewport-fit=cover',
        name: 'viewport',
      },
      { content: 'AI/ML Engineer.', name: 'description' },
      { content: '#ffffff', name: 'theme-color' },
      { content: 'Nasrul Huda', property: 'og:title' },
      { content: 'website', property: 'og:type' },
      { content: 'https://nasrul.info', property: 'og:url' },
      {
        content: 'https://nasrul.info/static/images/og-v2.png',
        property: 'og:image',
      },
      { content: '1200', property: 'og:image:width' },
      { content: '630', property: 'og:image:height' },
      { content: 'Nasrul Huda', property: 'og:image:alt' },
      { content: 'summary_large_image', name: 'twitter:card' },
      { content: 'Nasrul Huda', name: 'twitter:title' },
      {
        content: 'https://nasrul.info/static/images/og-v2.png',
        name: 'twitter:image',
      },
      { content: 'Nasrul Huda', name: 'twitter:image:alt' },
      { title: 'Nasrul Huda' },
    ],
  }),
  notFoundComponent: RootNotFound,
  shellComponent: RootDocument,
});

function RootComponent() {
  return (
    <AppProviders>
      <AppShell>
        <Outlet />
      </AppShell>
    </AppProviders>
  );
}

function RootNotFound() {
  return (
    <AppProviders>
      <AppShell>
        <NotFound />
      </AppShell>
    </AppProviders>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
