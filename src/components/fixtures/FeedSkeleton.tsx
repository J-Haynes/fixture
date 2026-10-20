/**
 * Placeholder shown by the server render and during hydration. The cached page can't
 * know the viewer's timezone, filters or saved tab, so the feed itself only renders on
 * the client; this keeps the layout steady until then instead of flashing UTC times.
 * It mirrors DateGroup: a day heading, then league blocks of stacked-team rows.
 */
export function FeedSkeleton() {
  return (
    <div aria-busy="true" className="motion-safe:animate-pulse">
      <span className="sr-only">Loading fixtures</span>
      {[[2, 1], [3]].map((blocks, d) => (
        <section key={d} className={d > 0 ? 'mt-8' : undefined} aria-hidden="true">
          <div className="flex items-baseline gap-2.5 pb-2.5 pt-4">
            <div className="h-7 w-24 rounded bg-stand-2" />
            <div className="h-3.5 w-20 rounded bg-stand" />
          </div>
          <div className="space-y-4">
            {blocks.map((rows, b) => (
              <div key={b} className="overflow-hidden rounded-xl bg-stand">
                <div className="h-11 bg-stand-2" />
                <div className="divide-y divide-line">
                  {Array.from({ length: rows }, (_, r) => (
                    <div key={r} className="grid grid-cols-[3.75rem_1fr] gap-x-2 py-3 pl-3.5 pr-4">
                      <div className="mt-1 h-5 w-11 rounded bg-stand-2" />
                      <div className="space-y-2">
                        {[0, 1].map(t => (
                          <div key={t} className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-stand-2" />
                            <div className="h-3.5 w-32 rounded bg-stand-2" />
                          </div>
                        ))}
                      </div>
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
