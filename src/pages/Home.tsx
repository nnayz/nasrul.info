import { cn } from '@/lib/className';
import DateViewer from '@components/DateView';
import EmailLink from '@components/EmailLink';
import ExternalLink from '@components/ExternalLink';
import InternalLink from '@components/InternalLink';
import PageInset from '@components/PageInset';
import { Link } from '@tanstack/react-router';
import { allWritings } from 'content-collections';
import { motion } from 'framer-motion';

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
      <div className="text-secondary flex flex-col gap-3 text-base">
        <p>
          I enjoy building software that feels natural and dependable, where
          thoughtful engineering meets clean, purposeful design. I like
          exploring new tools, experimenting with prototypes, and understanding
          how AI and data can shape more intuitive digital experiences.
        </p>
        <p>
          I study Data Science and AI at the{' '}
          <ExternalLink href="https://www.uni-hamburg.de">
            University of Hamburg
          </ExternalLink>{' '}
          and keep learning by reading, making, and exploring new ideas.
        </p>
        <p>
          Check out my{' '}
          <InternalLink to="/highlights">highlights and projects</InternalLink>{' '}
          if you want to learn more about me.
        </p>
        <p>
          I also take on{' '}
          <InternalLink to="/consulting">consulting work</InternalLink>. If you
          have an AI or data problem, book a call and let&rsquo;s talk.
        </p>
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
    <motion.div variants={fadeInUp} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 min-[380px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] sm:grid-cols-[minmax(12rem,1.5fr)_minmax(6rem,1fr)_minmax(6rem,1fr)]">
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
