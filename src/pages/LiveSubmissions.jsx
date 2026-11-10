import { useEffect, useState } from 'react';
import { CircleAlert, LoaderCircle, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError, backendApi } from '@/services/backend-api';
import { SUBMISSION_INTAKE_ROLES } from '@/lib/auth';
import { SubmissionRows } from '@/components/SubmissionRows';

export function LiveSubmissions({
  token,
  roles,
  onUnauthorized,
  fixedCategory,
}) {
  const [result, setResult] = useState(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stage, setStage] = useState('');
  const [sector, setSector] = useState('');
  const [sectors, setSectors] = useState([]);
  const [sectorError, setSectorError] = useState('');
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const selectedCategory = fixedCategory ?? category;

  useEffect(() => {
    const controller = new AbortController();
    backendApi.sectorFilterOptions(token, controller.signal)
      .then(setSectors)
      .catch((reason) => {
        if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
        else if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
          setSectorError(reason instanceof Error ? reason.message : 'Could not load sector filters.');
        }
      });
    return () => controller.abort();
  }, [token, onUnauthorized]);

  useEffect(() => {
    const controller = new AbortController();
    backendApi.submissions(token, { page, size: 25, q: search, category: selectedCategory, stage, sector }, controller.signal)
      .then(setResult)
      .catch((reason) => {
        if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
        else if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
          setError(reason instanceof Error ? reason.message : 'Could not load submissions.');
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [token, page, search, selectedCategory, stage, sector, onUnauthorized]);

  function submitSearch(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    setPage(0);
    setSearch(query.trim());
  }

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div><p className="eyebrow">WORKSPACE · CASE REGISTER</p><h1>{fixedCategory === 'student' ? 'Student projects' : fixedCategory === 'general' ? 'General innovations' : 'Submissions'}</h1><p>Search and review cases visible to your account.</p></div>
        {roles.some((role) => SUBMISSION_INTAKE_ROLES.includes(role)) && <Link className="btn btn-primary" to="/submissions/new"><Plus size={16} />New submission</Link>}
      </div>
      <section className="live-panel">
        <form className="submission-filters" onSubmit={submitSearch}>
          <label className="live-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title…" aria-label="Search submissions" /></label>
          {!fixedCategory && <select aria-label="Filter by category" value={category} onChange={(event) => { setError(''); setLoading(true); setPage(0); setCategory(event.target.value); }}>
            <option value="">All categories</option><option value="student">Student projects</option><option value="general">General innovations</option>
          </select>}
          <select aria-label="Filter by stage" value={stage} onChange={(event) => { setError(''); setLoading(true); setPage(0); setStage(event.target.value); }}>
            <option value="">All stages</option>{['DRAFT','RECEIVED','REGISTERED','FACT_FINDING','UNDER_REVIEW','REFINEMENT_REQUESTED','FURTHER_HANDLING','FORWARDED','IN_PROGRESS','COMPLETED'].map((value) => <option value={value} key={value}>{value.replaceAll('_', ' ')}</option>)}
          </select>
          <select aria-label="Filter by sector" value={sector} onChange={(event) => { setError(''); setLoading(true); setPage(0); setSector(event.target.value); }}>
            <option value="">All sectors</option>{sectors.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
          <button className="btn btn-outline" type="submit">Search</button>
        </form>
        {sectorError && <div className="api-error api-error-banner" role="alert">{sectorError}</div>}
        {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}
        {loading && !result
          ? <div className="live-loading"><LoaderCircle className="spin" size={20} />Loading submissions…</div>
          : result ? <SubmissionRows rows={result.items} /> : null}
        {result && <div className="pagination">
          <span>{result.totalElements} {result.totalElements === 1 ? 'submission' : 'submissions'}</span>
          <div><button className="btn btn-outline" disabled={page <= 0 || loading} onClick={() => { setError(''); setLoading(true); setPage((value) => Math.max(0, value - 1)); }}>Previous</button><span>Page {result.totalPages ? page + 1 : 0} of {result.totalPages}</span><button className="btn btn-outline" disabled={page + 1 >= result.totalPages || loading} onClick={() => { setError(''); setLoading(true); setPage((value) => value + 1); }}>Next</button></div>
        </div>}
      </section>
    </div>
  );
}
