import PageInset from '@components/PageInset';
import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  editUrl: string;
  image?: string;
  metadata: ReactNode;
  title: string;
};

type Section = { id: string; level: string; title: string };

export default function ArticleLayout({
  children,
  editUrl,
  image,
  metadata,
  title,
}: Props) {
  const prose = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [current, setCurrent] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const body = prose.current;
    if (!body) return;
    let toastTimer: ReturnType<typeof setTimeout>;
    let sectionObserver: IntersectionObserver | undefined;
    let active = true;

    const post = body.closest('.post');
    const railBlock = '.article-prose > *, .post-title, .post-write-row';

    const updateProgress = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      if (bar.current) {
        bar.current.style.width =
          (max > 0 ? Math.min(100, (doc.scrollTop / max) * 100) : 0) + '%';
      }
    };

    const lightRail = (event: Event) => {
      if (!post || !(event.target instanceof Element)) return;
      const block = event.target.closest(railBlock);
      if (!block || !post.contains(block)) return;
      const postBox = post.getBoundingClientRect();
      const blockBox = block.getBoundingClientRect();
      post.style.setProperty(
        '--rail-glow-top',
        `${blockBox.top - postBox.top}px`,
      );
      post.style.setProperty(
        '--rail-glow-bottom',
        `${blockBox.bottom - postBox.top}px`,
      );
    };

    const dimRail = (event: PointerEvent) => {
      if (!post) return;
      const next = event.relatedTarget;
      if (
        next instanceof Element &&
        post.contains(next) &&
        next.closest(railBlock)
      ) {
        return;
      }
      post.style.setProperty('--rail-glow-top', '0px');
      post.style.setProperty('--rail-glow-bottom', '0px');
    };

    const wireHeadings = () => {
      const headings = Array.from(
        body.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6'),
      );
      headings.forEach((heading, i) => {
        heading.tabIndex = 0;
        if (!heading.id) heading.id = 'section-' + i;
        const anchor = heading.querySelector<HTMLAnchorElement>('.anchor');
        if (anchor) {
          anchor.tabIndex = 0;
          anchor.removeAttribute('aria-hidden');
          anchor.setAttribute('aria-label', 'Copy link to section');
        }
      });
      const tocHeadings = headings.filter((heading) =>
        ['H2', 'H3'].includes(heading.tagName),
      );
      const nextSections =
        headings.filter((heading) => heading.tagName === 'H2').length >= 3
          ? tocHeadings.map((heading) => ({
              id: heading.id,
              level: heading.tagName.toLowerCase(),
              title: heading.textContent ?? '',
            }))
          : [];
      setSections((current) =>
        current.length === nextSections.length &&
        current.every(
          (section, index) =>
            section.id === nextSections[index]?.id &&
            section.title === nextSections[index]?.title,
        )
          ? current
          : nextSections,
      );
      sectionObserver?.disconnect();
      sectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setCurrent(entry.target.id);
          });
        },
        { rootMargin: '-40% 0px -55% 0px' },
      );
      tocHeadings.forEach((heading) => sectionObserver?.observe(heading));
      updateProgress();
    };
    const onFocus = (event: FocusEvent) => {
      if (
        event.target instanceof HTMLElement &&
        /^H[1-6]$/.test(event.target.tagName)
      ) {
        setCurrent(event.target.id);
      }
    };
    const onClick = async (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('.anchor')
          : null;
      if (!anchor || !navigator.clipboard) return;
      const heading = anchor.closest('h1,h2,h3,h4,h5,h6');
      if (!heading?.id) return;
      event.preventDefault();
      const url = new URL(window.location.href);
      url.hash = heading.id;
      try {
        await navigator.clipboard.writeText(url.href);
        if (!active) return;
        history.replaceState(history.state, '', url);
        setToast('Copied link to section');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => setToast(''), 1500);
      } catch {
        window.location.hash = heading.id;
      }
    };
    const contentObserver = new MutationObserver(wireHeadings);
    contentObserver.observe(body, { childList: true, subtree: true });
    const resizeObserver = new ResizeObserver(updateProgress);
    resizeObserver.observe(document.documentElement);
    wireHeadings();
    body.addEventListener('click', onClick);
    body.addEventListener('focusin', onFocus);
    post?.addEventListener('pointerover', lightRail);
    post?.addEventListener('pointerout', dimRail);
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      active = false;
      clearTimeout(toastTimer);
      sectionObserver?.disconnect();
      contentObserver.disconnect();
      resizeObserver.disconnect();
      body.removeEventListener('click', onClick);
      body.removeEventListener('focusin', onFocus);
      post?.removeEventListener('pointerover', lightRail);
      post?.removeEventListener('pointerout', dimRail);
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  return (
    <PageInset className="article-page">
      <div aria-hidden="true" className="reading-progress">
        <span ref={bar} />
      </div>
      <article className="post">
        <header className="post-head">
          <p className="post-date">{metadata}</p>
          <h1 className="post-title" tabIndex={0}>
            {title.replace(/[.!?]+$/, '').toLowerCase()}
          </h1>
        </header>
        {image && (
          <img
            alt={title}
            className="post-cover"
            decoding="async"
            src={image}
          />
        )}
        <div className="article-prose" ref={prose}>
          {children}
        </div>
        <div aria-hidden="true" className="post-write-row">
          <span className="post-caret-area">
            <span className="post-caret-blink" />
          </span>
        </div>
        <footer className="post-footer">
          <a href={editUrl} rel="noopener noreferrer" target="_blank">
            edit on github
          </a>
        </footer>
      </article>
      {sections.length > 0 && (
        <aside aria-label="On this page" className="post-toc">
          <ul>
            {sections.map((section) => (
              <li className={'post-toc-' + section.level} key={section.id}>
                <a
                  className={current === section.id ? 'current' : undefined}
                  href={'#' + section.id}
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      )}
      <div
        aria-live="polite"
        className={'article-toast' + (toast ? ' show' : '')}
        hidden={!toast}
        role="status"
      >
        {toast}
      </div>
    </PageInset>
  );
}
