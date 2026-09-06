import { isExternalHttpHref } from './ExternalLink';
import Flashcard from './Flashcard';
import { Link, type LinkProps } from '@tanstack/react-router';
import type { ComponentPropsWithoutRef } from 'react';

function ContentLink({
  children,
  href = '',
  ...props
}: ComponentPropsWithoutRef<'a'>) {
  if (href.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link {...props} to={href as LinkProps['to']}>
        {children}
      </Link>
    );
  }
  if (isExternalHttpHref(href)) {
    return (
      <a
        {...props}
        data-external=""
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {children}
      </a>
    );
  }
  return (
    <a {...props} href={href}>
      {children}
    </a>
  );
}

function ContentImage({ alt = '', ...props }: ComponentPropsWithoutRef<'img'>) {
  return <img alt={alt} decoding="async" loading="lazy" {...props} />;
}

const components = {
  Flashcard,
  Image: ContentImage,
  a: ContentLink,
  img: ContentImage,
};
export default components;
