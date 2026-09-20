/** Work index: featured projects, then a year-grouped archive. */
import WorkThumbnail from '@/components/WorkThumbnail';
import { play } from '@/lib/audio';
import { cn } from '@/lib/className';
import ExternalLink from '@components/ExternalLink';
import InternalLink from '@components/InternalLink';
import PageInset from '@components/PageInset';
import {
  featuredWork,
  highlightYear,
  workDescription,
  workHref,
  type Highlight,
} from '@lib/highlights';
import { Link } from '@tanstack/react-router';
import { allHighlights } from 'content-collections';
import { useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';

type FeaturedProject = Highlight & {
  alt?: string;
  context: string;
  href?: string;
  image?: string;
  result: string;
  role: string;
};

export default function Work() {
  const reduce = useReducedMotion();
  const works = allHighlights as Highlight[];
  const featured = useMemo(() => featuredProjects(works), [works]);
  const archive = useMemo(() => archiveByYear(works), [works]);
  const years = works.map(highlightYear).filter((year) => year > 0);
  const firstYear = years.length ? Math.min(...years) : 0;
  const latestYear = years.length ? Math.max(...years) : 0;

  return (
    <PageInset
      animate={{ opacity: 1, y: 0 }}
      className="work-page outliner max-w-[940px]"
      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      wide
    >
      <div className="doc-title">
        work
        <span className="age">, {works.length} projects</span>
      </div>

      <p className="doc-sub">
        selected research, product work, and tools. the complete archive
        follows.
      </p>

      <section aria-labelledby="featured-work-title" className="featured-work">
        <div className="section-heading">
          <h2 id="featured-work-title">featured</h2>
          <span>{featured.length} projects</span>
        </div>

        <div className="featured-grid">
          {featured.map((project, index) => (
            <article
              className={cn(
                'featured-card',
                index === 0 && 'featured-card--lead',
              )}
              key={project.slug}
            >
              <Link
                aria-label={`Read about ${project.title}`}
                className="featured-card-hit"
                params={{ slug: project.slug }}
                to="/highlights/$slug"
              />
              <div className="featured-media">
                {project.image ? (
                  <img
                    alt={project.alt ?? ''}
                    className="featured-image"
                    decoding="async"
                    src={project.image}
                  />
                ) : (
                  <WorkThumbnail
                    meta={project.context}
                    plain
                    title={project.title}
                  />
                )}
              </div>

              <div className="featured-copy">
                <p className="featured-context">{project.context}</p>
                <h3>
                  {project.href ? (
                    <ExternalLink href={project.href}>
                      {project.title}
                    </ExternalLink>
                  ) : (
                    project.title
                  )}
                </h3>
                <p className="featured-summary">{project.summary}</p>
                <dl className="featured-facts">
                  <div>
                    <dt>role</dt>
                    <dd>{project.role}</dd>
                  </div>
                  <div>
                    <dt>result</dt>
                    <dd>{project.result}</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="work-archive-title" className="work-archive">
        <div className="section-heading section-heading--archive">
          <h2 id="work-archive-title">archive</h2>
          {firstYear > 0 && (
            <span>
              {firstYear}–{latestYear}
            </span>
          )}
        </div>

        {archive.fullYears.map((year, index) => {
          const items = archive.yearMap[year] ?? [];
          return (
            <ArchiveYear
              count={items.length}
              defaultOpen={index < 2}
              key={year}
              label={String(year)}
              works={items}
            />
          );
        })}

        {archive.earlierProjects.length >= 2 && (
          <ArchiveYear
            count={archive.earlierProjects.length}
            defaultOpen={false}
            label="earlier"
            works={archive.earlierProjects}
          />
        )}

        {archive.earlierProjects.length === 1 && archive.earlierProjects[0] && (
          <ArchiveRow
            extra={String(highlightYear(archive.earlierProjects[0]))}
            work={archive.earlierProjects[0]}
          />
        )}

        <div className="node">
          <div className="row">
            <span className="bullet-cell">
              <span className="bullet" />
            </span>
            <span className="label work-line">
              <ExternalLink href="https://github.com/nnayz">
                more projects on github
              </ExternalLink>
            </span>
          </div>
        </div>
      </section>

      <div aria-hidden className="write-row">
        <span className="ghost-bullet" />
        <span>
          <span className="caret-blink" />
        </span>
      </div>
    </PageInset>
  );
}

function ArchiveYear({
  count,
  defaultOpen,
  label,
  works,
}: {
  count: number;
  defaultOpen: boolean;
  label: string;
  works: Highlight[];
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('node has-children', open && 'open')}>
      <button
        aria-expanded={open}
        className="row has-children"
        onClick={() => {
          play('click');
          setOpen((value) => !value);
        }}
        type="button"
      >
        <span className="bullet-cell">
          <span className="bullet" />
          <span aria-hidden className="caret">
            <svg fill="none" viewBox="0 0 8 8">
              <path
                d="M2 1l4 3-4 3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.4"
              />
            </svg>
          </span>
        </span>
        <span className="label">
          {label}
          <span className="count">{count}</span>
        </span>
      </button>
      <div className="children">
        {works.map((work) => (
          <ArchiveRow key={work.slug} work={work} />
        ))}
      </div>
    </div>
  );
}

function ArchiveRow({ extra, work }: { extra?: string; work: Highlight }) {
  const description = workDescription(work);
  const href = workHref(work.slug);
  const title = work.title.toLowerCase();

  return (
    <div className="node">
      <div className="row">
        <span className="bullet-cell">
          <span className="bullet" />
        </span>
        <span className="label work-line">
          {href ? (
            <ExternalLink href={href}>{title}</ExternalLink>
          ) : (
            <InternalLink params={{ slug: work.slug }} to="/highlights/$slug">
              {title}
            </InternalLink>
          )}
          {description && (
            <span className="work-desc">{description.toLowerCase()}</span>
          )}
          {work.company && (
            <span className="meta">{work.company.toLowerCase()}</span>
          )}
          {extra && <span className="meta">earlier · {extra}</span>}
        </span>
      </div>
    </div>
  );
}

function featuredProjects(works: Highlight[]): FeaturedProject[] {
  return featuredWork.flatMap((item) => {
    const work = works.find((entry) => entry.slug === item.slug);
    if (!work) return [];
    const year = highlightYear(work);
    return [
      {
        ...work,
        alt: item.alt,
        context: work.company
          ? `${work.company} · ${year}`
          : `independent · ${year}`,
        href: workHref(item.slug),
        image: item.image,
        result: item.result,
        role: item.role,
      },
    ];
  });
}

function archiveByYear(works: Highlight[]) {
  const yearMap = works.reduce<Record<number, Highlight[]>>((acc, work) => {
    const year = highlightYear(work);
    if (!year) return acc;
    acc[year] ??= [];
    acc[year].push(work);
    acc[year].sort((a, b) => (b.start ?? '').localeCompare(a.start ?? ''));
    return acc;
  }, {});

  const years = Object.keys(yearMap)
    .map(Number)
    .sort((a, b) => b - a);
  const fullYears = years.filter((year) => yearMap[year].length >= 2);
  const earlierProjects = years
    .filter((year) => yearMap[year].length < 2)
    .flatMap((year) => yearMap[year]);

  return { earlierProjects, fullYears, yearMap };
}
