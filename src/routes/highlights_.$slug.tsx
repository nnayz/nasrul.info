import WorkProject from '../pages/WorkProject';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { allHighlights } from 'content-collections';

export const Route = createFileRoute('/highlights_/$slug')({
  beforeLoad: ({ params }) => {
    if (!allHighlights.some((highlight) => highlight.slug === params.slug)) {
      throw notFound();
    }
  },
  component: HighlightProjectRoute,
});

function HighlightProjectRoute() {
  const { slug } = Route.useParams();
  return <WorkProject slug={slug} />;
}
