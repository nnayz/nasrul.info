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

function faviconSrc(href: string) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(href).hostname}&sz=32`;
  } catch {
    return '';
  }
}

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
      <motion.div className="resources-page outliner" variants={fadeInUp}>
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
  const faviconUrl = faviconSrc(link);

  return (
    <div className="node">
      <div className="row">
        <span className="bullet-cell">
          {faviconUrl ? (
            <img alt="" className="resource-favicon" src={faviconUrl} />
          ) : (
            <span className="bullet" />
          )}
        </span>
        <span className="label work-line">
          <ExternalLink href={link}>{title}</ExternalLink>
          {description ? (
            <span className="work-desc">{description}</span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
