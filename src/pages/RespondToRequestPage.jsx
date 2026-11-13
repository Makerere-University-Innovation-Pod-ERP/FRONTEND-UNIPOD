import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CircleAlert, LoaderCircle, Send } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, backendApi } from '@/services/backend-api';

export function RespondToRequestPage({ token, onUnauthorized }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [caseFile, setCaseFile] = useState(null);
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [problemAddressed, setProblemAddressed] = useState('');
  const [responseNote, setResponseNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (signal) => {
    try {
      const current = await backendApi.caseFile(token, id, signal);
      setCaseFile(current);
      setTitle(current.submission.title);
      setPurpose(current.submission.purpose);
      setProblemAddressed(current.submission.problemAddressed);
    } catch (thrown) {
      if (thrown instanceof ApiError && thrown.status === 401) onUnauthorized();
      else if (!(thrown instanceof DOMException && thrown.name === 'AbortError')) {
        setError(thrown instanceof Error ? thrown.message : 'Could not load this case.');
      }
    } finally {
      setLoading(false);
    }
  }, [token, id, onUnauthorized]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function submit(event) {
    event.preventDefault();
    if (!responseNote.trim()) {
      setNoteError('Describe what you changed before submitting your response.');
      return;
    }
    setNoteError('');
    setBusy(true);
    setError('');
    try {
      await backendApi.respondToRequest(token, id, {
        title: title.trim(),
        purpose: purpose.trim(),
        problemAddressed: problemAddressed.trim(),
        note: responseNote.trim(),
      });
      navigate(`/submissions/${id}`);
    } catch (thrown) {
      if (thrown instanceof ApiError && thrown.status === 401) onUnauthorized();
      else setError(thrown instanceof Error ? thrown.message : 'Could not submit your response.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="live-loading"><LoaderCircle className="spin" size={22} />Loading case…</div>;
  if (!caseFile) {
    return (
      <div className="live-page">
        <Link to={`/submissions/${id}`} className="back-link"><ArrowLeft size={15} />Back to my brief</Link>
        {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}
      </div>
    );
  }

  const snapshot = caseFile.submission.previousVersionSnapshot;

  return (
    <div className="live-page page-enter">
      <Link to={`/submissions/${id}`} className="back-link"><ArrowLeft size={15} />Back to my brief</Link>
      <div className="live-page-heading compact-heading"><div><p className="eyebrow">RESPOND TO A REQUEST</p><h1>Update your brief.</h1><p>Make the requested changes, then submit — this returns your brief to review.</p></div></div>
      {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}
      <form className="live-panel create-form" onSubmit={submit}>
        <div className="form-grid">
          <div>
            <p className="form-section-title" style={{ marginBottom: 10 }}>BEFORE</p>
            <div className="case-fields">
              <div className="case-field"><span>Title</span><p>{snapshot?.title ?? caseFile.submission.title}</p></div>
              <div className="case-field"><span>Purpose</span><p>{snapshot?.purpose ?? caseFile.submission.purpose}</p></div>
              <div className="case-field"><span>Problem addressed</span><p>{snapshot?.problemAddressed ?? caseFile.submission.problemAddressed}</p></div>
            </div>
          </div>
          <div>
            <p className="form-section-title" style={{ marginBottom: 10 }}>AFTER <span>Edit as needed</span></p>
            <label className="form-field">Title<input required maxLength={240} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="form-field">Purpose<textarea required maxLength={5000} rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} /></label>
            <label className="form-field">Problem addressed<textarea required maxLength={5000} rows={3} value={problemAddressed} onChange={(event) => setProblemAddressed(event.target.value)} /></label>
          </div>
        </div>
        <label className="form-field">What did you change? <span className="field-note">Required</span>
          <textarea rows={3} maxLength={2000} value={responseNote} onChange={(event) => { setResponseNote(event.target.value); setNoteError(''); }} placeholder="Summarize how you addressed the reviewer's request" />
        </label>
        {noteError && <p className="api-error" role="alert">{noteError}</p>}
        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />}
            Submit response
          </button>
        </div>
      </form>
    </div>
  );
}
