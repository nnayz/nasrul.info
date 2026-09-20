import Work from '../pages/Work';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/work')({
  component: Work,
  head: () => ({ meta: [{ title: 'Work · Nasrul Huda' }] }),
});
