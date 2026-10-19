/**
 * Placeholder shown by the server render and during hydration. The cached page can't
 * know the viewer's timezone, filters or saved tab, so the feed itself only renders on
 * the client; this keeps the layout steady until then instead of flashing UTC times.
 */
export function FeedSkeleton() {
  return (
    <div aria-busy="true" className="motion-safe:animate-pulse">
      <span className="sr-only">Loading fixtures</span>
      {[3, 2].map((cards, g) => (
        <section key={g} className={g > 0 ? 'mt-14' : undefined} aria-hidden="true">
          <div className="h-3 w-20 rounded bg-zinc-800 mb-3" />
          <div className="space-y-3">
            {Array.from({ length: cards }, (_, i) => (
              <div key={i} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
                  <div className="h-4 w-28 rounded bg-zinc-800" />
                  <div className="h-3 w-16 rounded bg-zinc-800" />
                </div>
                <div className="flex items-center gap-2 px-4 py-4">
                  {[0, 1, 2].map(col => col === 1 ? (
                    <div key={col} className="flex w-20 shrink-0 justify-center">
                      <div className="h-4 w-12 rounded bg-zinc-800" />
                    </div>
                  ) : (
                    <div key={col} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className="h-12 w-12 rounded-lg bg-zinc-800" />
                      <div className="h-3 w-20 rounded bg-zinc-800" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
