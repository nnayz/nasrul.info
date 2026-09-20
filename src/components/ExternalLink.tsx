import type { AnchorHTMLAttributes, ReactNode } from 'react';

interface Props extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'children' | 'className' | 'href' | 'rel' | 'target'
> {
  children: ReactNode;
  href: string;
}

const SITE_HOSTNAME = 'nasrul.info';

export function ExternalChevron({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 10 10"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.2 7L7 3.2M7 3.2H3.9M7 3.2V6.3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function isExternalHttpHref(href: string) {
  try {
    const url = new URL(href);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.hostname !== SITE_HOSTNAME
    );
  } catch {
    return false;
  }
}

export default function ExternalLink({ children, href, ...props }: Props) {
  if (!isExternalHttpHref(href)) {
    throw new Error(`ExternalLink requires an off-site HTTP URL: ${href}`);
  }

  return (
    <a
      {...props}
      className="group text-secondary relative isolate -mx-2 inline-flex w-fit items-center bg-black/[0.04] px-2 text-base no-underline before:pointer-events-none before:absolute before:inset-0 before:z-0 before:origin-left before:scale-x-0 before:bg-[#1EFFB8] before:transition-transform before:duration-300 before:ease-[cubic-bezier(0.4,0,0.2,1)] before:content-[''] hover:text-black hover:before:scale-x-100 focus-visible:text-black focus-visible:before:scale-x-100 motion-reduce:before:transition-none dark:bg-white/[0.06]"
      data-link-kind="external"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className="relative z-10">{children}</span>
      <ExternalChevron className="relative z-10 ml-[0.35em] size-[0.62em] opacity-50 transition-all duration-160 group-hover:opacity-[0.85] group-focus-visible:opacity-[0.85] motion-reduce:transition-none" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
