/**
 * Mike Matas-style custom cursor from cretu.dev. Smooth follow, grows on
 * interactive targets, becomes an I-beam over text, and presses on click.
 * Fine-pointer devices only.
 */
import { useEffect, useRef } from 'react';

const HOVER =
  'a, button, [role="button"], input, textarea, select, summary, .bullet-cell, .row.has-children, [class*="cursor-pointer"]';
const TEXT =
  'p, h1, h2, h3, h4, h5, h6, li, label, .label, .prose, .article-prose, .doc-title, .doc-sub, .featured-summary, .featured-context';

export default function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = ref.current;
    if (!cursor) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    document.documentElement.classList.add('has-site-cursor');

    let mx = -100;
    let my = -100;
    let cx = -100;
    let cy = -100;
    let visible = false;
    let raf = 0;

    const onMove = (event: MouseEvent) => {
      mx = event.clientX;
      my = event.clientY;
      if (!visible) {
        cursor.classList.add('visible');
        visible = true;
      }

      const el = event.target;
      if (el instanceof Element && el.closest(HOVER)) {
        cursor.classList.add('grow');
        cursor.classList.remove('text');
      } else if (el instanceof Element && el.closest(TEXT)) {
        cursor.classList.add('text');
        cursor.classList.remove('grow');
      } else {
        cursor.classList.remove('grow', 'text');
      }
    };

    const onDown = () => cursor.classList.add('press');
    const onUp = () => cursor.classList.remove('press');
    const onLeave = () => {
      cursor.classList.remove('visible');
      visible = false;
    };

    const draw = () => {
      if (reduced) {
        cx = mx;
        cy = my;
      } else {
        cx += (mx - cx) * 0.35;
        cy += (my - cy) * 0.35;
      }
      cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      raf = requestAnimationFrame(draw);
    };

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('mouseleave', onLeave);
    raf = requestAnimationFrame(draw);

    return () => {
      document.documentElement.classList.remove('has-site-cursor');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div aria-hidden className="site-cursor" ref={ref} />;
}
