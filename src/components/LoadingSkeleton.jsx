import { Skeleton } from '@/components/ui/skeleton';

const rowWidths = ['w-4/5', 'w-3/5', 'w-2/3', 'w-5/6'];

export function LoadingSkeleton({
  label,
  variant = 'list',
  className = '',
  columns = 4,
}) {
  return (
    <div
      className={`loading-skeleton loading-skeleton--${variant} ${className}`.trim()}
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      <div className="sr-only">{label}</div>
      <div className="loading-skeleton__content" aria-hidden="true">
        {variant === 'page' && (
          <>
            <div className="loading-skeleton__heading">
              <Skeleton className="h-6 w-48 max-w-full" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
            <div className="loading-skeleton__metrics">
              {Array.from({ length: 3 }, (_, index) => (
                <div className="loading-skeleton__metric" key={index}>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-4 h-7 w-16" />
                  <Skeleton className="mt-3 h-3 w-28 max-w-full" />
                </div>
              ))}
            </div>
            <div className="loading-skeleton__page-grid">
              <section className="loading-skeleton__section">
                <Skeleton className="mb-5 h-5 w-40 max-w-full" />
                <div className="loading-skeleton__chart">
                  {[48, 76, 57, 91, 65, 82, 54, 72].map((height, index) => (
                    <Skeleton className="w-full rounded-t" key={index} style={{ height: `${height}%` }} />
                  ))}
                </div>
                <div className="mt-5 space-y-3">
                  {rowWidths.slice(0, 3).map((width) => (
                    <Skeleton className={`h-3 ${width}`} key={width} />
                  ))}
                </div>
              </section>
              <section className="loading-skeleton__section">
                <Skeleton className="mb-5 h-5 w-36 max-w-full" />
                <div className="space-y-4">
                  {rowWidths.map((width, index) => (
                    <div className="loading-skeleton__list-item" key={width}>
                      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className={`h-3 ${width}`} />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                      {index === 0 && <Skeleton className="h-5 w-12 shrink-0 rounded-full" />}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
        {variant === 'metrics-list' && (
          <>
            <div className="loading-skeleton__heading">
              <Skeleton className="h-6 w-48 max-w-full" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
            <div className="loading-skeleton__metrics">
              {Array.from({ length: 3 }, (_, index) => (
                <div className="loading-skeleton__metric" key={index}>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-4 h-7 w-16" />
                  <Skeleton className="mt-3 h-3 w-28 max-w-full" />
                </div>
              ))}
            </div>
            <section className="loading-skeleton__section">
              <div className="mb-5 flex items-center justify-between gap-4">
                <Skeleton className="h-5 w-40 max-w-full" />
                <Skeleton className="h-4 w-24 shrink-0" />
              </div>
              <div className="loading-skeleton__list">
                {rowWidths.map((width) => (
                  <div className="loading-skeleton__list-item" key={width}>
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className={`h-3 ${width}`} />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                    <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-4 shrink-0" />
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        {variant === 'dashboard' && (
          <>
            <div className="loading-skeleton__heading">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="mt-2 h-7 w-56 max-w-full" />
              <Skeleton className="mt-2 h-3 w-80 max-w-full" />
            </div>
            <div className="loading-skeleton__metrics loading-skeleton__metrics--five">
              {Array.from({ length: 5 }, (_, index) => (
                <div className="loading-skeleton__metric" key={index}>
                  <Skeleton className="h-3 w-24 max-w-full" />
                  <Skeleton className="mt-4 h-8 w-16" />
                  <Skeleton className="mt-3 h-3 w-28 max-w-full" />
                </div>
              ))}
            </div>
            <div className="loading-skeleton__dashboard-middle">
              <section className="loading-skeleton__section">
                <Skeleton className="mb-5 h-5 w-40 max-w-full" />
                <div className="loading-skeleton__pipeline">
                  {Array.from({ length: 6 }, (_, index) => (
                    <div className="loading-skeleton__pipeline-tile" key={index}>
                      <Skeleton className="h-3 w-20 max-w-full" />
                      <Skeleton className="mt-2 h-6 w-10" />
                    </div>
                  ))}
                </div>
              </section>
              <section className="loading-skeleton__section">
                <Skeleton className="mb-5 h-5 w-36 max-w-full" />
                <div className="space-y-4">
                  {rowWidths.map((width) => (
                    <div className="loading-skeleton__list-item" key={width}>
                      <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className={`h-3 ${width}`} />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className="loading-skeleton__dashboard-bottom">
              <section className="loading-skeleton__section">
                <Skeleton className="mb-5 h-5 w-36 max-w-full" />
                <div className="loading-skeleton__chart">
                  {[48, 76, 57, 91, 65, 82, 54].map((height, index) => (
                    <Skeleton className="w-full rounded-t" key={index} style={{ height: `${height}%` }} />
                  ))}
                </div>
              </section>
              <section className="loading-skeleton__section">
                <Skeleton className="mb-5 h-5 w-36 max-w-full" />
                <div className="space-y-4">
                  {rowWidths.map((width) => (
                    <div className="space-y-2" key={width}>
                      <Skeleton className={`h-3 ${width}`} />
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              </section>
              <section className="loading-skeleton__section">
                <Skeleton className="mb-5 h-5 w-32 max-w-full" />
                <div className="space-y-4">
                  {rowWidths.slice(0, 3).map((width) => (
                    <div className="loading-skeleton__list-item" key={width}>
                      <Skeleton className="mt-1 h-2 w-2 shrink-0 rounded-full" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className={`h-3 ${width}`} />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
        {variant === 'reports' && (
          <>
            <div className="loading-skeleton__heading">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-2 h-7 w-60 max-w-full" />
              <Skeleton className="mt-2 h-3 w-72 max-w-full" />
            </div>
            <div className="loading-skeleton__metrics loading-skeleton__metrics--four">
              {Array.from({ length: 4 }, (_, index) => (
                <div className="loading-skeleton__metric" key={index}>
                  <Skeleton className="h-3 w-24 max-w-full" />
                  <Skeleton className="mt-4 h-8 w-16" />
                  <Skeleton className="mt-3 h-3 w-28 max-w-full" />
                </div>
              ))}
            </div>
            <div className="loading-skeleton__report-grid">
              <section className="loading-skeleton__section">
                <Skeleton className="mb-5 h-5 w-44 max-w-full" />
                <div className="space-y-5">
                  {rowWidths.map((width) => (
                    <div className="space-y-2" key={width}>
                      <div className="flex justify-between gap-4">
                        <Skeleton className={`h-3 ${width}`} />
                        <Skeleton className="h-3 w-8" />
                      </div>
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              </section>
              <section className="loading-skeleton__section">
                <Skeleton className="mb-5 h-5 w-40 max-w-full" />
                <div className="loading-skeleton__report-split">
                  <Skeleton className="h-32 w-32 shrink-0 rounded-full" />
                  <div className="space-y-4">
                    {rowWidths.slice(0, 3).map((width) => (
                      <div className="flex items-center gap-2" key={width}>
                        <Skeleton className="h-3 w-3 shrink-0 rounded-full" />
                        <Skeleton className={`h-3 ${width}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
        {variant === 'invoices' && (
          <>
            <div className="loading-skeleton__heading">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="mt-2 h-7 w-56 max-w-full" />
              <Skeleton className="mt-2 h-3 w-80 max-w-full" />
            </div>
            <div className="invoices-overview-grid">
              {Array.from({ length: 5 }, (_, index) => (
                <div className="loading-skeleton__metric" key={index}>
                  <Skeleton className="h-3 w-24 max-w-full" />
                  <Skeleton className="mt-4 h-8 w-16" />
                </div>
              ))}
            </div>
            <div className="invoices-bottom-grid">
              {[0, 1].map((panel) => (
                <section className="loading-skeleton__section" key={panel}>
                  <Skeleton className="mb-5 h-5 w-44 max-w-full" />
                  <div className="loading-skeleton__list">
                    {rowWidths.map((width, index) => (
                      <div className="loading-skeleton__list-item" key={width}>
                        <div className="min-w-0 flex-1 space-y-2">
                          <Skeleton className={`h-3 ${width}`} />
                          {panel === 1 && <Skeleton className="h-3 w-2/3" />}
                        </div>
                        {panel === 0
                          ? <Skeleton className="h-3 w-20 shrink-0" />
                          : (
                            <>
                              <Skeleton className="h-3 w-16 shrink-0" />
                              {index === 0 && <Skeleton className="h-5 w-16 shrink-0 rounded-full" />}
                            </>
                          )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
        {variant === 'detail' && (
          <>
            <div className="loading-skeleton__detail-heading">
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-7 w-64 max-w-full" />
                <Skeleton className="h-3 w-48 max-w-full" />
              </div>
              <Skeleton className="h-7 w-24 shrink-0 rounded-full" />
            </div>
            <div className="loading-skeleton__detail-grid">
              <section className="loading-skeleton__section">
                <Skeleton className="mb-5 h-5 w-40 max-w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-4/5" />
                <div className="loading-skeleton__fields">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div className="loading-skeleton__field" key={index}>
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="mt-2 h-4 w-32 max-w-full" />
                    </div>
                  ))}
                </div>
              </section>
              <aside className="loading-skeleton__section">
                <Skeleton className="mb-5 h-5 w-36 max-w-full" />
                <div className="space-y-4">
                  {rowWidths.slice(0, 3).map((width) => (
                    <div className="space-y-2" key={width}>
                      <Skeleton className={`h-3 ${width}`} />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </>
        )}
        {variant === 'calendar' && (
          <div className="tx-days">
            {Array.from({ length: 7 }, (_, index) => (
              <div className="tx-day-card" key={index}>
                <div className="tx-day-header">
                  <div className="tx-day-date-badge">
                    <Skeleton className="h-7 w-7" />
                    <Skeleton className="h-3 w-9" />
                  </div>
                  {index === 6 && <Skeleton className="h-5 w-14 rounded-md" />}
                  <Skeleton className="mt-1 h-7 w-20 rounded-md" />
                </div>
                <div className="tx-day-slots">
                  <div className="tx-slot tx-slot-open">
                    <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                    <Skeleton className="h-3 w-20 shrink-0" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {variant === 'list' && (
          <div className="loading-skeleton__list">
            {rowWidths.map((width, rowIndex) => (
              <div className="loading-skeleton__list-item" key={rowIndex}>
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className={`h-3 ${width}`} />
                  <Skeleton className="h-3 w-2/5" />
                </div>
                <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-4 shrink-0" />
              </div>
            ))}
          </div>
        )}
        {variant === 'queue-detail' && (
          <div className="loading-skeleton__queue-grid">
            <section className="loading-skeleton__section">
              <div className="mb-4 flex gap-2">
                {[0, 1, 2].map((index) => (
                  <Skeleton className="h-7 w-20 rounded-full" key={index} />
                ))}
              </div>
              <div className="loading-skeleton__list">
                {rowWidths.map((width) => (
                  <div className="loading-skeleton__list-item" key={width}>
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className={`h-3 ${width}`} />
                      <Skeleton className="h-3 w-3/5" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                    <Skeleton className="h-4 w-4 shrink-0" />
                  </div>
                ))}
              </div>
            </section>
            <section className="loading-skeleton__section">
              <Skeleton className="mb-3 h-3 w-28" />
              <Skeleton className="h-6 w-3/4 max-w-full" />
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-5/6" />
              <div className="loading-skeleton__fields">
                {Array.from({ length: 4 }, (_, index) => (
                  <div className="loading-skeleton__field" key={index}>
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="mt-2 h-4 w-28 max-w-full" />
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
        {variant === 'table' && (
          <div className="loading-skeleton__table">
            <div className="loading-skeleton__table-head">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton className="h-3 w-4/5" key={index} />
              ))}
            </div>
            {rowWidths.map((width, rowIndex) => (
              <div className="loading-skeleton__row" key={rowIndex}>
                <div className="loading-skeleton__primary">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className={`h-3 ${width}`} />
                    <Skeleton className="h-3 w-2/5" />
                  </div>
                </div>
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-7 w-16 justify-self-end" />
              </div>
            ))}
          </div>
        )}
        {variant === 'form' && (
          <div className="loading-skeleton__form">
            <section className="loading-skeleton__section">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="mt-3 h-3 w-64 max-w-full" />
              <div className="loading-skeleton__fields">
                {Array.from({ length: 4 }, (_, index) => (
                  <div className="loading-skeleton__form-field" key={index}>
                    <Skeleton className="mb-2 h-3 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
              <div className="loading-skeleton__form-field mt-4">
                <Skeleton className="mb-2 h-3 w-36" />
                <Skeleton className="h-24 w-full" />
              </div>
              <div className="mt-4 flex justify-end">
                <Skeleton className="h-9 w-36" />
              </div>
            </section>
          </div>
        )}
        {variant === 'split' && (
          <div className="loading-skeleton__split">
            <section className="loading-skeleton__section">
              <Skeleton className="mb-5 h-5 w-44 max-w-full" />
              <div className="loading-skeleton__table-head">
                {[0, 1, 2].map((index) => (
                  <Skeleton className="h-3 w-4/5" key={index} />
                ))}
              </div>
              {rowWidths.map((width, index) => (
                <div className="loading-skeleton__row loading-skeleton__row--split" key={width}>
                  <div className="min-w-0 space-y-2">
                    <Skeleton className={`h-3 ${width}`} />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-3 w-4/5" />
                  {index === 0 && <Skeleton className="h-6 w-16 rounded-full" />}
                </div>
              ))}
            </section>
            <section className="loading-skeleton__section">
              <Skeleton className="mb-5 h-5 w-40 max-w-full" />
              <div className="loading-skeleton__fields">
                {Array.from({ length: 4 }, (_, index) => (
                  <div className="loading-skeleton__form-field" key={index}>
                    <Skeleton className="mb-2 h-3 w-20" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ))}
              </div>
              <div className="loading-skeleton__form-field mt-4">
                <Skeleton className="mb-2 h-3 w-28" />
                <Skeleton className="h-20 w-full" />
              </div>
            </section>
          </div>
        )}
        {variant === 'board' && (
          <div
            className="loading-skeleton__board"
            style={{ '--loading-skeleton-board-columns': columns }}
          >
            {Array.from({ length: columns }, (_, columnIndex) => (
              <section className="loading-skeleton__board-column" key={columnIndex}>
                <div className="loading-skeleton__board-heading">
                  <Skeleton className="h-4 w-24 max-w-full" />
                  <Skeleton className="h-5 w-6 rounded-full" />
                </div>
                {Array.from({ length: columnIndex === 0 ? 2 : 1 }, (_, cardIndex) => (
                  <div className="loading-skeleton__board-card" key={cardIndex}>
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-2/5" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="mt-2 h-5 w-20 rounded-full" />
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
        {variant === 'compact' && (
          <div className="loading-skeleton__compact">
            <Skeleton className="h-4 w-36 max-w-full" />
            <Skeleton className="h-3 w-3/4 max-w-full" />
          </div>
        )}
      </div>
    </div>
  );
}
