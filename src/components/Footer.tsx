import ExternalLink from '@components/ExternalLink';

export default function Footer() {
  return (
    <footer className="fixed right-4 bottom-4 left-4 z-40 sm:right-6 sm:bottom-6 sm:left-6 md:right-8 md:left-8 lg:right-12 lg:left-12">
      <div className="text-quaternary flex items-center justify-between px-3 py-2 text-[10px]">
        <div className="flex items-center gap-2">
          <span className="border border-black/30 bg-transparent px-2 py-0.5 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,0.3)] dark:border-white/30 dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,0.2)]">
            © {new Date().getFullYear()}
          </span>
          <span className="hidden sm:inline">Nasrul Huda</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-quaternary hidden md:inline">v.2025.12</span>
          <ExternalLink href="https://github.com/nnayz/me">source</ExternalLink>
        </div>
      </div>
    </footer>
  );
}
