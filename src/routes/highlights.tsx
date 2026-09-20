import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/highlights')({
  beforeLoad: () => {
    throw redirect({ replace: true, to: '/work' });
  },
});
