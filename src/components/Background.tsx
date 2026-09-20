/** The shared near-black (or near-white) page surface. */
export default function Background({ showGrid = false }: { showGrid?: boolean }) {
  return (
    <div className="fixed inset-0 z-0 bg-paper dark:bg-neutral-950">
      {showGrid && <div aria-hidden className="stage-grid" />}
    </div>
  );
}
