import ArticleLayout from '@components/ArticleLayout';
import MDXDocument from '@components/MDXDocument';
import { allWritings } from 'content-collections';

export default function WritingPost({ slug }: { slug: string }) {
  const post = allWritings.find((post) => post.slug === slug);
  if (!post) return null;
  const minutes = Math.max(1, Math.round(post.readingTime.minutes));
  const date = new Date(post.publishedAt)
    .toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
      year: 'numeric',
    })
    .toLowerCase();
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(post.structuredData).replace(/</g, '\\u003c'),
        }}
        type="application/ld+json"
      />
      <ArticleLayout
        editUrl={`https://github.com/nnayz/me/edit/main/content/writing/${slug}.mdx`}
        image={post.image}
        key={slug}
        metadata={
          <>
            <time dateTime={post.publishedAt}>{date}</time>
            <span className="post-meta">
              · <time dateTime={`PT${minutes}M`}>{minutes} min read</time>
            </span>
          </>
        }
        title={post.title}
      >
        <MDXDocument collection="writing" slug={slug} />
      </ArticleLayout>
    </>
  );
}
