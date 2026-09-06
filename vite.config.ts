import contentCollectionsPlugin from '@content-collections/vite';
import mdx from '@mdx-js/rollup';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import path from 'path';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    nitro(),
    tailwindcss(),
    tanstackStart(),
    react(),
    mdx({
      remarkPlugins: [remarkFrontmatter, remarkGfm] as any,
      rehypePlugins: [
        rehypeSlug as any,
        [
          rehypeAutolinkHeadings as any,
          {
            properties: {
              className: ['anchor'],
            },
          },
        ],
      ],
    }),
    contentCollectionsPlugin({
      configPath: './metadata.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@data': path.resolve(__dirname, './data'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@assets': path.resolve(__dirname, './src/assets'),
      'content-collections': path.resolve(
        __dirname,
        './.content-collections/generated',
      ),
    },
  },
});
