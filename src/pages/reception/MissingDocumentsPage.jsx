import { useDeferredValue, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { useMissingDocuments } from '@/hooks/useReception';
import { BriefTable, ErrorBanner, Loading } from './shared';
import { useSignOutOn401 } from './helpers';

/** Briefs where reception has asked the submitter for missing information. */
export function MissingDocumentsPage({ token, onUnauthorized }) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const { data, isLoading, error, refetch } = useMissingDocuments(token, deferredSearch);
  useSignOutOn401(error, onUnauthorized);

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">RECEPTION · MISSING DOCUMENTS</p>
          <h1>Missing documents</h1>
          <p>Briefs waiting for the submitter to send missing information.</p>
        </div>
        <Link className="btn btn-outline" to="/reception/home"><ArrowLeft size={15} />Reception home</Link>
      </div>

      <ErrorBanner error={error} fallback="Could not load the missing documents list." onRetry={() => void refetch()} />

      <section className="live-panel">
        <label className="live-search">
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by reference, title or submitter…"
            aria-label="Search missing documents"
          />
        </label>
        {isLoading ? (
          <Loading label="Loading missing documents…" />
        ) : data?.length ? (
          <BriefTable items={data} showDueDate />
        ) : data ? (
          <p className="live-empty">{search ? 'No briefs match your search.' : 'No briefs are waiting on missing documents.'}</p>
        ) : null}
      </section>
    </div>
  );
}
