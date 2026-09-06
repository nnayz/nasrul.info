import ArticleLayout from '@components/ArticleLayout';
import MDXDocument from '@components/MDXDocument';
import { highlightMeta, kindLabels, type Highlight } from '@lib/highlights';
import { allHighlights } from 'content-collections';

export default function WorkProject({ slug }: { slug: string }) {
  const highlight = (allHighlights as Highlight[]).find(
    (item) => item.slug === slug,
  );
  if (!highlight) return null;
  return (
    <ArticleLayout
      backTo="/highlights"
      editUrl={`https://github.com/nnayz/me/edit/main/content/highlights/${slug}.mdx`}
      key={slug}
      metadata={highlightMeta(highlight) || kindLabels[highlight.kind]}
      title={highlight.title}
    >
      <p>{highlight.summary}</p>
      <MDXDocument collection="highlights" slug={slug} />
    </ArticleLayout>
  );
}
