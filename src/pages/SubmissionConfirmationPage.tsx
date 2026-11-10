import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleAlert, ClipboardList, Copy, LoaderCircle, Send, Workflow } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, backendApi } from '@/services/backend-api';
import {
  BRIEF_TYPE_LABELS, documentChecklist, inferBriefType, setBriefReference, getBrief,
  type BriefRecord,
} from '@/lib/brief';
import { formatDate, formatStage } from '@/lib/presentation';

type ConfirmationCase = {
  id: string;
  code: string | null;
  stage: string;
  title: string;
  category: 'student' | 'general';
  receivedAt: string | null;
};

const INTAKE_ROLES = ['ROLE_ADMINISTRATOR', 'ROLE_INNOVATION_COORDINATOR', 'ROLE_RECEPTIONIST', 'ROLE_FACT_FINDING_OFFICER'];

export function SubmissionConfirmationPage({
  token,
  roles,
  onUnauthorized,
}: {
  token: string;
  roles: string[];
  onUnauthorized: () => void;
}) {
  const { id = '' } = useParams<{ id: string }>();
  const [brief, setBrief] = useState<BriefRecord | null>(() => getBrief(id));
  const [current, setCurrent] = useState<ConfirmationCase | null>(null);
  const [loading, setLoading] = useState(() => Boolean(id) && !id.startsWith('local-'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const localOnly = id.startsWith('local-') || Boolean(brief?.localOnly);
  const canRegister = roles.some((role) => INTAKE_ROLES.includes(role));

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!id || id.startsWith('local-')) return;
    try {
      const value = await backendApi.submissionCaseFile(token, id, signal);
      setCurrent({
        id: value.submission.id,
        code: value.submission.code,
        stage: value.submission.stage,
        title: value.submission.title,
        category: value.submission.category,
        receivedAt: value.submission.receivedAt,
      });
      if (value.submission.code) {
        setBrief(setBriefReference(id, value.submission.code) ?? getBrief(id));
      }
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        onUnauthorized();
        return;
      }
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      try {
        const page = await backendApi.submitterSubmissions(token, 0, 100, signal);
        const found = page.items.find((item) => item.id === id);
        if (found) {
          setCurrent({
            id: found.id,
            code: found.code,
            stage: found.stage,
            title: found.title,
            category: found.category,
            receivedAt: found.receivedAt,
          });
          if (found.code) setBrief(setBriefReference(id, found.code) ?? getBrief(id));
        } else {
          setError('This brief could not be found. It may have been removed.');
        }
      } catch (fallbackReason) {
        if (fallbackReason instanceof ApiError && fallbackReason.status === 401) onUnauthorized();
        else if (!(fallbackReason instanceof DOMException && fallbackReason.name === 'AbortError')) {
          setError(fallbackReason instanceof Error ? fallbackReason.message : 'Could not load this brief.');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [id, token, onUnauthorized]);

  useEffect(() => {
    if (!id || id.startsWith('local-')) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [id, load]);

  async function registerCase() {
    if (!current) return;
    setBusy(true);
    setError('');
    try {
      const registered = await backendApi.register(token, id);
      setCurrent((previous) => previous ? {
        ...previous,
        code: registered.code,
        stage: registered.stage,
        receivedAt: registered.receivedAt,
      } : previous);
      setBrief(setBriefReference(id, registered.code) ?? getBrief(id));
      setFeedback('Reception registered the brief and issued its tracking reference.');
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else setError(reason instanceof Error ? reason.message : 'Could not register the brief.');
    } finally {
      setBusy(false);
    }
  }

  const type = brief?.type ?? inferBriefType(current?.category);
  const checklist = brief ? documentChecklist(brief.type, brief.documents) : [];
  const reference = current?.code || brief?.trackingReference || null;
  const received = current?.stage && !['DRAFT'].includes(current.stage);
  const openRequests = brief?.infoRequests.filter((request) => request.status === 'OPEN').length ?? 0;

  async function copyReference(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback('Tracking reference copied.');
    } catch {
      setFeedback('Could not copy the reference. Select it directly from this page.');
    }
  }

  if (loading && !current && !brief) {
    return <div className="live-loading"><LoaderCircle className="spin" size={22} />Loading confirmation…</div>;
  }

  return (
    <div className="live-page page-enter confirmation-page">
      <Link to="/my-submissions" className="back-link"><ArrowLeft size={15} />Back to my submissions</Link>

      <section className={`confirmation-hero ${localOnly ? 'local' : ''}`}>
        <span className="confirmation-mark">{localOnly ? <CircleAlert size={24} /> : <Check size={24} />}</span>
        <div>
          <p className="eyebrow">WORKFLOW 1.1 · SUBMISSION CONFIRMATION</p>
          <h1>{localOnly ? 'Brief saved in this browser.' : 'Brief submitted to UniPod.'}</h1>
          <p>
            {localOnly
              ? 'The workflow details are complete, but your account cannot create a backend record yet. Reception must register the brief before it becomes an official case.'
              : 'Your brief has been created. Reception will register it, issue the tracking reference and pass it to the relevant department.'}
          </p>
        </div>
      </section>

      {localOnly && <div className="brief-alert" role="alert">
        <CircleAlert size={16} />
        <span>
          This is a local record, not a backend case. My submissions shows it with a “Saved in this browser” label.
          Signing in with an intake account or asking reception to register it is required to move it forward.
        </span>
      </div>}
      {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}
      {feedback && <p className="live-note" role="status">{feedback}</p>}

      <div className="confirmation-grid">
        <section className="live-panel">
          <div className="live-panel-heading">
            <div><p className="eyebrow">CASE</p><h2>{current?.title || brief?.title || 'Your brief'}</h2></div>
            {current && <span className={`stage-pill stage-${current.stage.toLowerCase()}`}>{formatStage(current.stage)}</span>}
          </div>
          <div className="case-fields">
            <div className="form-grid">
              <div className="case-field"><span>Brief type</span><p>{BRIEF_TYPE_LABELS[type]}</p></div>
              <div className="case-field"><span>Receiving department</span><p>{brief?.departmentName || 'To be assigned by reception'}</p></div>
            </div>
            <div className="case-field">
              <span>Tracking reference</span>
              <p>{reference ? <span className="confirmation-reference">{reference}{current?.code && <button className="icon-button" onClick={() => void copyReference(reference)} aria-label="Copy tracking reference"><Copy size={13} /></button>}</span> : 'Pending — reception issues the reference when it registers the brief.'}</p>
            </div>
            <div className="form-grid">
              <div className="case-field"><span>Reception status</span><p>{received ? 'Received by reception' : localOnly ? 'Not sent to reception yet' : 'Waiting for reception to register'}</p></div>
              <div className="case-field"><span>Submitted</span><p>{formatDate(brief?.submittedAt || current?.receivedAt || null)}</p></div>
            </div>
            <div className="case-field">
              <span>Reception notification</span>
              <p>{localOnly
                ? 'No notification was sent. This brief exists only in this browser.'
                : received
                  ? 'The case is in the reception queue. The backend does not send a separate reception notification yet; reception works from the queue.'
                  : 'Pending. Reception is notified when the case is registered as received.'}</p>
            </div>
          </div>
          {canRegister && current?.stage === 'DRAFT' && !localOnly && <div className="case-action">
            <p className="form-section-title">Reception action</p>
            <p className="field-note">Register this draft as received to issue its tracking reference.</p>
            <button className="btn btn-primary" onClick={() => void registerCase()} disabled={busy}>
              {busy ? <LoaderCircle size={14} className="spin" /> : <Workflow size={14} />}
              {busy ? 'Registering…' : 'Register and issue tracking reference'}
            </button>
          </div>}
          <div className="confirmation-actions">
            <Link className="btn btn-primary" to={`/submissions/${id}`}>View the brief<ArrowRight size={14} /></Link>
            <Link className="btn btn-outline" to="/my-submissions">My submissions</Link>
          </div>
        </section>

        <aside className="detail-side">
          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">DOCUMENTS</p><h2>Checklist</h2></div></div>
            {checklist.length ? <ul className="summary-checklist">
              {checklist.map((item) => <li key={item.kind} className={item.present ? 'present' : item.required ? 'missing' : ''}>
                <span>{item.present ? <Check size={12} /> : <ClipboardList size={12} />}</span>
                <b>{item.kind}</b>
                <small>{item.required ? 'Required' : 'Optional'}{item.present ? ' · attached' : item.required ? ' · missing' : ' · not provided'}</small>
              </li>)}
            </ul> : <p className="live-note">No local document checklist is stored for this case.</p>}
          </section>

          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">WHAT HAPPENS NEXT</p><h2>Follow the brief</h2></div></div>
            <ol className="confirmation-next">
              <li><b>Reception registers the brief</b><span>It checks the details and issues the tracking reference.</span></li>
              <li><b>The department reviews the request</b><span>Staff may ask you for more information.</span></li>
              <li><b>You answer from My submissions</b><span>Open requests appear on the brief with a reply form.</span></li>
            </ol>
            {openRequests > 0 && <p className="confirmation-open"><Send size={13} />{openRequests} open {openRequests === 1 ? 'request' : 'requests'} for more information.</p>}
          </section>

          {brief && <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">RULES</p><h2>Accepted</h2></div></div>
            <div className="case-fields">
              <div className="case-field"><span>UniPod general rules</span><p>{brief.rules.general ? `Accepted ${formatDate(brief.rules.acceptedAt)}` : 'Not recorded'}</p></div>
              {brief.rules.departmentName && <div className="case-field"><span>{brief.rules.departmentName} rules</span><p>{brief.rules.departmentRules ? 'Accepted' : 'Not recorded'}</p></div>}
            </div>
          </section>}
        </aside>
      </div>
    </div>
  );
}
