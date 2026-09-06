import InternalLink from '@components/InternalLink';
import PageInset from '@components/PageInset';

export default function NotFound() {
  return (
    <PageInset className="flex flex-col gap-8">
      <h1 className="text-5xl font-medium sm:text-6xl">404</h1>
      <p className="text-secondary">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <InternalLink to="/">Go back home</InternalLink>
    </PageInset>
  );
}
