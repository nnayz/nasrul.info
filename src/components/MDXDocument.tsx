import components from './MDXComponents';
import type { ComponentType } from 'react';

const modules = import.meta.glob<{
  default: ComponentType<{ components: typeof components }>;
}>('../../content/{writing,highlights}/*.mdx', { eager: true });

export default function MDXDocument({
  collection,
  slug,
}: {
  collection: 'writing' | 'highlights';
  slug: string;
}) {
  const Content = modules[`../../content/${collection}/${slug}.mdx`]?.default;
  if (!Content) return null;
  return <Content components={components} />;
}
