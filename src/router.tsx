import { routeTree } from './routeTree.gen';
import { createRouter } from '@tanstack/react-router';

export function getRouter() {
  return createRouter({
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 60_000,
    defaultStaleTime: Infinity,
    routeTree,
    scrollRestoration: true,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
