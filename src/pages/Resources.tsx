import ExternalLink from '@components/ExternalLink';
import PageInset from '@components/PageInset';
import { resources } from '@data/resources';
import { motion } from 'framer-motion';

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const fadeInUp = {
  animate: {
    opacity: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
    y: 0,
  },
  initial: { opacity: 0, y: 12 },
};

export default function Resources() {
  return (
    <PageInset
      animate="animate"
      className="flex flex-col gap-8"
      initial="initial"
      variants={stagger}
    >
      <motion.header className="flex flex-col gap-2" variants={fadeInUp}>
        <h1>Resources</h1>
        <p className="text-tertiary text-base">
          A curated collection of articles, essays, and videos that have shaped
          my thinking.
        </p>
      </motion.header>
      <motion.div className="space-y-0.5" variants={fadeInUp}>
        {resources.map((resource) => (
          <Item
            description={resource.description}
            key={resource.title}
            link={resource.link}
            title={resource.title}
          />
        ))}
      </motion.div>
    </PageInset>
  );
}

function Item({
  title,
  description,
  link,
}: {
  description: string;
  link: string;
  title: string;
}) {
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${link}&sz=${64}`;

  return (
    <div className="-mx-2 flex items-center gap-3 rounded px-2 py-2">
      <div className="h-8 w-8 shrink-0">
        <img
          alt=""
          className="h-full w-full rounded-md bg-gray-500/20 object-contain px-0.5 py-0.5"
          src={faviconUrl}
        />
      </div>
      <div className="flex min-w-0 grow flex-col gap-0.5">
        <ExternalLink href={link}>{title}</ExternalLink>
        <span className="text-tertiary truncate text-sm">{description}</span>
      </div>
    </div>
  );
}
