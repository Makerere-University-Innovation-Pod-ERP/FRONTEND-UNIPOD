import { useDeferredValue, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileWarning, RefreshCw, Search, UserPlus } from 'lucide-react';
import { useReceptionHome } from '@/hooks/useReception';
import { BriefTable, Counter, ErrorBanner, Loading } from './shared';
import { useSignOutOn401 } from './helpers';

/** Reception home: work-queue counters and a searchable list of new briefs. */
export function ReceptionHomePage({ token, onUnauthorized }) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const { data, isLoading, isFetching, error, refetch } = useReceptionHome(token, deferredSearch);
  useSignOutOn401(error, onUnauthorized);

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">RECEPTION · HOME</p>
          <h1>Reception home</h1>
          <p>New briefs waiting to be checked and forwarded.</p>
        </div>
        <div className="action-row">
          <Link className="btn btn-primary" to="/reception/walk-in"><UserPlus size={15} />Walk-in submission</Link>
          <Link className="btn btn-outline" to="/reception/missing-documents"><FileWarning size={15} />Missing documents</Link>
          <button type="button" className="btn btn-outline" disabled={isFetching} onClick={() => void refetch()}>
            <RefreshCw size={15} className={isFetching ? 'spin' : ''} />Refresh
          </button>
        </div>
      </div>

      {data && (
        <section className="live-metrics" aria-label="Reception work queue">
          <Counter label="Waiting" value={data.counters.waiting} />
          <Counter label="Missing documents" value={data.counters.missingDocuments} />
          <Counter label="Updated recently" value={data.counters.updatedRecently} />
        </section>
      )}

      <ErrorBanner error={error} fallback="Could not load the reception home." onRetry={() => void refetch()} />

      <section className="live-panel">
        <label className="live-search">
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by reference, title or submitter…"
            aria-label="Search new briefs"
          />
        </label>
        {isLoading ? (
          <Loading label="Loading new briefs…" />
        ) : data?.items.length ? (
          <BriefTable items={data.items} />
        ) : data ? (
          <p className="live-empty">{search ? 'No briefs match your search.' : 'No new briefs are waiting.'}</p>
        ) : null}
      </section>
    </div>
  );
}
