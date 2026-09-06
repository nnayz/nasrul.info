/** Highlights index with compact list and editorial grid views. */
import WorkThumbnail from '@/components/WorkThumbnail';
import { Select } from '@/components/ui/Select';
import { play } from '@/lib/audio';
import { cn } from '@/lib/className';
import { MENU_MORPH } from '@/lib/motion';
import ExternalLink from '@components/ExternalLink';
import PageInset from '@components/PageInset';
import {
  highlightPeriod,
  kindLabels,
  type Highlight,
  type HighlightKind,
} from '@lib/highlights';
import { Link } from '@tanstack/react-router';
import { allHighlights } from 'content-collections';
import { motion, useReducedMotion } from 'framer-motion';
import { LayoutGrid, List } from 'lucide-react';
import { useMemo, useState } from 'react';

type Sort = 'newest' | 'oldest' | 'az';

const sorters: Record<Sort, (a: Highlight, b: Highlight) => number> = {
  az: (a, b) => a.title.localeCompare(b.title),
  // Undated projects sort last either way.
  newest: (a, b) => (b.start ?? '').localeCompare(a.start ?? ''),
  oldest: (a, b) => (a.start ?? '9999').localeCompare(b.start ?? '9999'),
};

const kindOptions = [
  { label: 'All', value: 'all' },
  ...Object.entries(kindLabels).map(([value, label]) => ({
    label,
    value: value as HighlightKind,
  })),
] satisfies { label: string; value: 'all' | HighlightKind }[];

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'A–Z', value: 'az' },
] satisfies { label: string; value: Sort }[];

export default function Highlights() {
  const reduce = useReducedMotion();
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [kind, setKind] = useState<'all' | HighlightKind>('all');
  const [sort, setSort] = useState<Sort>('newest');

  const shown = useMemo(
    () =>
      (allHighlights as Highlight[])
        .filter((work) => kind === 'all' || work.kind === kind)
        .sort(sorters[sort]),
    [kind, sort],
  );

  return (
    <PageInset
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      wide={view === 'grid'}
    >
      <header className="mb-8 flex flex-col items-start gap-6">
        <div className="flex max-w-xl flex-col gap-2">
          <h1>Highlights</h1>
          <p className="text-tertiary max-w-lg text-sm sm:text-base">
            A handful of things I have built at work, at university, and for the
            fun of it.
          </p>
        </div>
        <div className="flex max-w-full shrink-0 flex-wrap items-center gap-3">
          <Select
            ariaLabel="Filter projects"
            onValueChange={setKind}
            options={kindOptions}
            value={kind}
          />
          <Select
            ariaLabel="Sort projects"
            onValueChange={setSort}
            options={sortOptions}
            value={sort}
          />
          <ViewButton
            active={view === 'list'}
            label="List"
            onClick={() => setView('list')}
          >
            <List aria-hidden className="h-3.5 w-3.5" />
          </ViewButton>
          <ViewButton
            active={view === 'grid'}
            label="Grid"
            onClick={() => setView('grid')}
          >
            <LayoutGrid aria-hidden className="h-3.5 w-3.5" />
          </ViewButton>
        </div>
      </header>

      <div
        className={cn(
          view === 'grid'
            ? 'grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3'
            : 'space-y-0.5',
        )}
      >
        {shown.map((work) => (
          <div key={work.title}>
            {view === 'grid' ? <Card work={work} /> : <Row work={work} />}
          </div>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="text-quaternary py-8 text-sm">Nothing here yet.</p>
      )}

      <p className="text-secondary mt-8 text-base">
        For more projects, view my{' '}
        <ExternalLink href="https://github.com/nnayz">GitHub</ExternalLink>.
      </p>
    </PageInset>
  );
}

function Row({ work }: { work: Highlight }) {
  return (
    <Link
      className={cn(
        'group -mx-2 flex items-center justify-between gap-5 rounded px-2 py-1.5 transition-colors duration-150',
        'hover:bg-black/5 dark:hover:bg-white/5',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current',
      )}
      params={{ slug: work.slug }}
      to="/highlights/$slug"
    >
      <span className="text-secondary group-hover:text-primary min-w-0 truncate text-base transition-colors">
        {work.title}
      </span>
      <span className="text-quaternary group-hover:text-tertiary shrink-0 text-right text-xs transition-colors">
        {meta(work)}
      </span>
    </Link>
  );
}

function Card({ work }: { work: Highlight }) {
  return (
    <Link
      className="group -m-2 block rounded p-2 transition-colors duration-150 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current dark:hover:bg-white/5"
      params={{ slug: work.slug }}
      to="/highlights/$slug"
    >
      <div className="aspect-[16/10] overflow-hidden rounded-sm bg-black/[0.03] dark:bg-white/[0.04]">
        <WorkThumbnail meta={meta(work)} title={work.title} />
      </div>
      <div className="pt-3">
        <span className="text-secondary group-hover:text-primary block text-base font-medium transition-colors">
          {work.title}
        </span>
        <span className="text-quaternary mt-1.5 block text-xs">
          {meta(work)}
        </span>
      </div>
    </Link>
  );
}

function ViewButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={`${label} view`}
      aria-pressed={active}
      className={cn(
        'group relative isolate inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full transition-colors duration-300',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current',
        active
          ? 'text-neutral-50 dark:text-neutral-950'
          : 'text-quaternary hover:text-neutral-50 dark:hover:text-neutral-950',
      )}
      onClick={() => {
        play('open');
        onClick();
      }}
      onMouseEnter={() => play('hover')}
      type="button"
    >
      <span className="relative z-10 transition-transform duration-300 group-hover:scale-110">
        {children}
      </span>
      {active ? (
        <motion.span
          aria-hidden
          className="absolute inset-0 -z-10 bg-neutral-950 dark:bg-neutral-50"
          layoutId="highlights-view-surface"
          style={{ borderRadius: 16 }}
          transition={MENU_MORPH}
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 -z-10 rounded-full border border-black/15 dark:border-white/15',
            "after:absolute after:inset-0 after:scale-0 after:rounded-full after:bg-neutral-950 after:transition-transform after:duration-300 after:content-[''] group-hover:after:scale-100",
            'dark:after:bg-neutral-50',
          )}
        />
      )}
    </button>
  );
}

const meta = (work: Highlight) =>
  [work.company ?? kindLabels[work.kind], highlightPeriod(work)]
    .filter(Boolean)
    .join(' · ');
