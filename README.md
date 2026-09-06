## nasrul.info

Personal corner of the internet. Minimal design, quirky interactions. Representative of me.

Built with TanStack Start, TanStack Router, Tailwind CSS, and Nitro.

## Content

Long-form content lives outside the application code:

- `content/writing/` contains articles for `/writing/:slug`.
- `content/highlights/` contains project write-ups for `/highlights/:slug`.

Each MDX file owns its frontmatter and body. The content collections in
`metadata.ts` expose that frontmatter to listing pages. Both detail routes use
`src/components/MDXDocument.tsx` to render the body and
`src/components/ArticleLayout.tsx` for the shared reading layout.

Article typography, spacing, and theme colors follow cretu.dev's article
stylesheet, adapted in `src/assets/styles/prose.css`, using the Apple system
font stack (San Francisco on Apple devices).

```bash
bun run dev
bun run build
bun run start
```
