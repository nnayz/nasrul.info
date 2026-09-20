import { play } from '@/lib/audio';
import { cn } from '@/lib/className';
import DateViewer from '@components/DateView';
import EmailLink from '@components/EmailLink';
import ExternalLink from '@components/ExternalLink';
import InternalLink from '@components/InternalLink';
import PageInset from '@components/PageInset';
import { Link } from '@tanstack/react-router';
import { allWritings } from 'content-collections';
import { motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';

type Post = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
};

function getData(): { posts: Post[] } {
  try {
    const posts = ((allWritings as any[]) || [])
      .map((post: any): Post => ({
        slug: post.slug,
        title: post.title,
        summary: post.summary,
        publishedAt: post.publishedAt,
      }))
      .sort(
        (a: Post, b: Post) =>
          Number(new Date(b.publishedAt)) - Number(new Date(a.publishedAt)),
      )
      .slice(0, 3);

    return { posts };
  } catch {
    return { posts: [] };
  }
}

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function Home() {
  return (
    <PageInset
      className="flex flex-col gap-8"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      <Header />
      <Contact />
      <AboutMe />
      <RecentWritings />
    </PageInset>
  );
}

function Header() {
  return (
    <motion.div variants={fadeInUp} className="flex flex-col gap-0.5">
      <h1>Nasrul Huda</h1>
      <p className="text-tertiary text-xs font-medium tracking-wide">
        AI Engineer
      </p>
    </motion.div>
  );
}

function AboutMe() {
  return (
    <motion.div variants={fadeInUp} className="flex flex-col gap-3">
      <p className="text-tertiary text-xs font-medium tracking-wider uppercase">
        About me
      </p>
      <p className="text-secondary text-base">
        I enjoy building software that feels natural and dependable, where
        thoughtful engineering meets clean, purposeful design. I like exploring
        new tools, experimenting with prototypes, and understanding how AI and
        data can shape more intuitive digital experiences.
      </p>
      <div className="outliner pointer-events-auto">
        <OutlinerParent count={2} defaultOpen label={<NowLabel />}>
          <OutlinerLeaf>
            ai engineer at{' '}
            <Mention external href='https://pharos-labs.com'>
              pharoslabs
            </Mention>
          </OutlinerLeaf>
          <OutlinerLeaf>
            studying data science and AI at{' '}
            <Mention external href="https://www.uni-hamburg.de">
              University of Hamburg
            </Mention>
          </OutlinerLeaf>
          <OutlinerLeaf>reading, making, and exploring new ideas</OutlinerLeaf>
        </OutlinerParent>
        <OutlinerLeaf>
          check out my <Mention to="/work">work</Mention> if you want to learn
          more about me
        </OutlinerLeaf>
        <OutlinerParent count={1} defaultOpen label="consulting">
          <OutlinerLeaf>
            if you have an AI or data problem,{' '}
            <Mention to="/consulting">book a call</Mention> and let&rsquo;s talk
          </OutlinerLeaf>
        </OutlinerParent>
      </div>
    </motion.div>
  );
}

function ContactLink({
  href,
  title,
  website,
  email,
}: {
  email?: string;
  href?: string | string[];
  title: string | string[];
  website?: string | string[];
}) {
  const hrefs = Array.isArray(href) ? href : href ? [href] : [];
  const titles = Array.isArray(title) ? title : title ? [title] : [];

  return (
    <div className="min-w-0">
      {website && (
        <p className="text-tertiary mb-0.5 text-[10px] font-medium tracking-wider uppercase">
          {website}
        </p>
      )}
      <div className="flex flex-col gap-1">
        {hrefs.map((link, index) => (
          <ExternalLink key={index} href={link}>
            {titles[index] ?? link}
          </ExternalLink>
        ))}
      </div>
      {email && (
        <EmailLink aria-label={`Email ${email}`} href={`mailto:${email}`}>
          {typeof title === 'string' ? title : (title[0] ?? '')}
        </EmailLink>
      )}
    </div>
  );
}

function Contact() {
  return (
    <motion.div variants={fadeInUp} className="flex flex-col gap-3 text-base">
      <div className="grid w-max max-w-full grid-cols-1 gap-x-8 gap-y-4 min-[380px]:grid-cols-2 sm:grid-cols-3">
        <ContactLink
          href="https://www.linkedin.com/in/nasrul-hudaa/"
          title="Nasrul Huda"
          website="LinkedIn"
        />
        <ContactLink
          href="https://github.com/nnayz"
          title="@nnayz"
          website="GitHub"
        />
        <ContactLink
          href="https://x.com/nnasrrull"
          title="@nnasrrull"
          website="X"
        />
        <ContactLink
          email="hi@nasrul.info"
          title="hi[at]nasrul[dot]info"
          website="Email"
        />
        <ContactLink
          href="https://resume.nasrul.info"
          title="View"
          website="Resume"
        />
      </div>
    </motion.div>
  );
}

function RecentWritings() {
  try {
    const { posts } = getData();

    if (posts.length === 0) {
      return null;
    }

    return (
      <motion.div variants={fadeInUp} className="flex flex-col gap-3">
        <p className="text-tertiary text-xs font-medium tracking-wider uppercase">
          Recent writing
        </p>
        <div className="space-y-0.5">
          {posts.map((post: Post) => (
            <Link
              className={cn(
                '-mx-2 flex flex-row items-center justify-between px-2 py-1.5',
                'hover:bg-black/5 dark:hover:bg-white/5',
                'rounded transition-all duration-150',
                'group',
              )}
              params={{ slug: post.slug }}
              to="/writing/$slug"
              key={post.slug}
            >
              <span className="text-secondary group-hover:text-primary mr-2 grow truncate text-base transition-colors">
                {post.title}
              </span>
              <span className="text-quaternary shrink-0 text-xs tabular-nums">
                <DateViewer date={post.publishedAt} />
              </span>
            </Link>
          ))}
        </div>
      </motion.div>
    );
  } catch {
    return null;
  }
}

function NowLabel() {
  const [stamp, setStamp] = useState('');

  useEffect(() => {
    const now = new Date();
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const day = days[now.getDay()];
    const month = now.toLocaleString('en-US', { month: 'short' }).toLowerCase();
    setStamp(`${day} · ${now.getDate()} ${month}`);
  }, []);

  return (
    <>
      now
      {stamp ? <span className="meta">{stamp}</span> : null}
    </>
  );
}

function Caret() {
  return (
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
  );
}

function OutlinerLeaf({ children }: { children: ReactNode }) {
  return (
    <div className="node">
      <div className="row">
        <span className="bullet-cell">
          <span className="bullet" />
        </span>
        <span className="label">{children}</span>
      </div>
    </div>
  );
}

function OutlinerParent({
  children,
  count,
  defaultOpen = true,
  label,
}: {
  children: ReactNode;
  count?: number;
  defaultOpen?: boolean;
  label: ReactNode;
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
          <Caret />
        </span>
        <span className="label">
          {label}
          {count != null ? <span className="count">{count}</span> : null}
        </span>
      </button>
      <div className="children">{children}</div>
    </div>
  );
}

function Mention({
  children,
  external = false,
  href,
  to,
}: {
  children: ReactNode;
  external?: boolean;
  href?: string;
  to?: '/consulting' | '/work';
}) {
  if (to) {
    return <InternalLink to={to}>{children}</InternalLink>;
  }

  if (!href || !external) {
    throw new Error('Mention requires an internal `to` or an external `href`');
  }

  return <ExternalLink href={href}>{children}</ExternalLink>;
}
