import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft, ArrowRight, Check, CircleAlert, ClipboardList, FileText, LoaderCircle, MessageSquare,
  Send, ShieldCheck,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import type { UserSession } from '@/lib/auth';
import { ApiError, backendApi, type DocumentRecord } from '@/services/backend-api';
import {
  answerInformationRequest, BRIEF_TYPE_LABELS, documentChecklist, formatFileSize, getBrief,
  inferBriefType, type BriefRecord, type InformationRequest,
} from '@/lib/brief';
import { formatDate, formatStage } from '@/lib/presentation';

type BriefCase = {
  id: string;
  code: string | null;
  stage: string;
  title: string;
  category: 'student' | 'general';
  purpose: string;
  problemAddressed: string;
  departmentName: string | null;
  studentNumber: string | null;
  programme: string | null;
  supervisor: string | null;
  receivedAt: string | null;
  updatedAt: string | null;
};

const STAGES = ['DRAFT', 'RECEIVED', 'FACT_FINDING', 'UNDER_REVIEW', 'COMPLETED'];

function stageIndex(stage: string): number {
  if (STAGES.includes(stage)) return STAGES.indexOf(stage);
  if (stage === 'REGISTERED') return 1;
  if (stage === 'REFINEMENT_REQUESTED' || stage === 'AWAITING_ROUTING' || stage === 'FURTHER_HANDLING') return 3;
  return 1;
}

function stageLabel(stage: string): string {
  if (stage === 'DRAFT') return 'Draft';
  if (stage === 'RECEIVED' || stage === 'REGISTERED') return 'Received';
  if (stage === 'FACT_FINDING') return 'Fact-finding';
  if (stage === 'UNDER_REVIEW' || stage === 'REFINEMENT_REQUESTED') return 'Under review';
  if (stage === 'COMPLETED') return 'Decision';
  return formatStage(stage);
}

export function SubmitterBriefPage({
  session,
  onUnauthorized,
}: {
  session: UserSession;
  onUnauthorized: () => void;
}) {
  const { id = '' } = useParams<{ id: string }>();
  const [brief, setBrief] = useState<BriefRecord | null>(() => getBrief(id));
  const [current, setCurrent] = useState<BriefCase | null>(null);
  const [backendDocuments, setBackendDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(() => Boolean(id) && !id.startsWith('local-'));
  const [error, setError] = useState('');
  const localOnly = id.startsWith('local-') || Boolean(brief?.localOnly);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!id || id.startsWith('local-')) return;
    try {
      const value = await backendApi.submissionCaseFile(session.accessToken, id, signal);
      const submission = value.submission;
      setCurrent({
        id: submission.id,
        code: submission.code,
        stage: submission.stage,
        title: submission.title,
        category: submission.category,
        purpose: submission.purpose,
        problemAddressed: submission.problemAddressed,
        departmentName: submission.responsibleSectorName ?? getBrief(id)?.departmentName ?? null,
        studentNumber: submission.studentNumber,
        programme: submission.programme,
        supervisor: submission.supervisor,
        receivedAt: submission.receivedAt,
        updatedAt: submission.updatedAt,
      });
      setBackendDocuments(value.documents);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        onUnauthorized();
        return;
      }
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      try {
        const page = await backendApi.submitterSubmissions(session.accessToken, 0, 100, signal);
        const found = page.items.find((item) => item.id === id);
        if (found) {
          setCurrent({
            id: found.id,
            code: found.code,
            stage: found.stage,
            title: found.title,
            category: found.category,
            purpose: found.purpose,
            problemAddressed: found.problemAddressed,
            departmentName: getBrief(id)?.departmentName ?? null,
            studentNumber: found.studentNumber,
            programme: found.programme,
            supervisor: found.supervisor,
            receivedAt: found.receivedAt,
            updatedAt: found.updatedAt,
          });
        } else if (!getBrief(id)) {
          setError('This brief could not be found.');
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
  }, [id, session.accessToken, onUnauthorized]);

  useEffect(() => {
    if (!id || id.startsWith('local-')) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [id, load]);

  function refreshBrief() {
    setBrief(getBrief(id));
  }

  if (loading && !current && !brief) {
    return <div className="live-loading"><LoaderCircle className="spin" size={22} />Loading your brief…</div>;
  }
  if (!current && !brief) {
    return <div className="live-page">
      <Link to="/my-submissions" className="back-link"><ArrowLeft size={15} />Back to my submissions</Link>
      {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}
      <p className="live-empty">No brief details are available for this case.</p>
    </div>;
  }

  const type = brief?.type ?? inferBriefType(current?.category);
  const stage = current?.stage ?? 'DRAFT';
  const reference = current?.code || brief?.trackingReference || null;
  const checklist = brief ? documentChecklist(brief.type, brief.documents) : [];
  const openRequests = brief?.infoRequests.filter((request) => request.status === 'OPEN') ?? [];
  const answeredRequests = brief?.infoRequests.filter((request) => request.status === 'ANSWERED') ?? [];

  return (
    <div className="live-page page-enter">
      <Link to="/my-submissions" className="back-link"><ArrowLeft size={15} />Back to my submissions</Link>

      <div className="live-page-heading detail-heading">
        <div>
          <p className="eyebrow">MY BRIEF · {reference || (localOnly ? 'SAVED IN THIS BROWSER' : 'NO REFERENCE YET')}</p>
          <h1>{brief?.title || current?.title || 'Your brief'}</h1>
          <p>
            {BRIEF_TYPE_LABELS[type]}
            {brief?.departmentName ? ` · ${brief.departmentName}` : ''}
            {' · '}{localOnly ? 'Not registered yet' : formatStage(stage)}
          </p>
        </div>
        <div className="detail-heading-actions">
          {reference && <span className="confirmation-reference">{reference}</span>}
          <span className={`stage-pill stage-${(localOnly ? 'draft' : stage).toLowerCase()}`}>{localOnly ? 'Saved locally' : stageLabel(stage)}</span>
        </div>
      </div>

      {localOnly && <div className="brief-alert" role="alert">
        <CircleAlert size={16} />
        <span>
          This brief is stored in this browser only. Reception has not received it and no tracking reference has been
          issued. Keep this browser profile available until the backend accepts submitter accounts.
        </span>
      </div>}
      {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}

      {!localOnly && <section className="live-panel brief-progress-panel">
        <p className="eyebrow">PROGRESS</p>
        <ol className="submitter-stepper">
          {STAGES.map((item, index) => {
            const currentIndex = stageIndex(stage);
            const state = index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming';
            return <li key={item} className={`step-${state}`}>
              <span>{state === 'complete' ? <Check size={12} /> : `0${index + 1}`}</span>
              <b>{stageLabel(item)}</b>
            </li>;
          })}
        </ol>
        <div className="submitter-progress-meta">
          <span>Received: {current?.receivedAt ? formatDate(current.receivedAt) : (stage === 'DRAFT' ? 'Not yet' : 'Recorded')}</span>
          <span>Updated: {current?.updatedAt ? formatDate(current.updatedAt) : '—'}</span>
        </div>
      </section>}

      {openRequests.length > 0 && <div className="brief-alert" role="alert">
        <MessageSquare size={16} />
        <span><b>Action needed.</b> UniPod staff asked for more information. Answer the request below so the case can continue.</span>
      </div>}

      <div className="detail-grid">
        <section className="live-panel case-summary">
          <div className="live-panel-heading"><div><p className="eyebrow">BRIEF</p><h2>What you submitted</h2></div></div>
          <div className="case-fields">
            <div className="case-field"><span>Purpose</span><p>{brief?.purpose || current?.purpose || '—'}</p></div>
            <div className="case-field"><span>Problem or need</span><p>{brief?.problemAddressed || current?.problemAddressed || '—'}</p></div>
            <div className="form-grid">
              <div className="case-field"><span>Receiving department</span><p>{brief?.departmentName || current?.departmentName || 'Not specified'}</p></div>
              <div className="case-field"><span>Tracking reference</span><p>{reference || 'Pending — reception issues it on registration.'}</p></div>
            </div>
            {(type === 'student' || current?.studentNumber) && <div className="form-grid">
              <div className="case-field"><span>Student number</span><p>{current?.studentNumber || '—'}</p></div>
              <div className="case-field"><span>Programme</span><p>{current?.programme || '—'}</p></div>
            </div>}
            {(type === 'student' || current?.supervisor) && <div className="case-field"><span>Supervisor</span><p>{current?.supervisor || '—'}</p></div>}
          </div>

          <div className="case-action">
            <p className="form-section-title">Rules</p>
            {brief ? <div className="case-fields">
              <div className="case-field"><span>UniPod general rules</span><p>{brief.rules.general ? `Accepted ${formatDate(brief.rules.acceptedAt)}` : 'Not recorded'}</p></div>
              {brief.rules.departmentName && <div className="case-field"><span>{brief.rules.departmentName} rules</span><p>{brief.rules.departmentRules ? 'Accepted' : 'Not recorded'}</p></div>}
            </div> : <p className="live-note">Rule acceptance is not stored for this case.</p>}
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
            {brief && brief.documents.length > 0 && <ul className="doc-attached-list">
              {brief.documents.map((document) => <li key={document.id}>
                <span><b>{document.name}</b><small>{document.kind}{document.fileName ? ` · ${document.fileName}` : ''}{document.fileSize ? ` · ${formatFileSize(document.fileSize)}` : ''}</small></span>
              </li>)}
            </ul>}
            {backendDocuments.length > 0 && <ul className="document-list">
              {backendDocuments.map((document) => <li key={document.id}>
                <span><b>{document.name}</b><small>{formatStage(document.status)} · {formatDate(document.createdAt)}</small></span>
              </li>)}
            </ul>}
          </section>

          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">INFORMATION REQUESTS</p><h2>Requests for more information</h2></div></div>
            {!brief?.infoRequests.length && <p className="live-empty">No requests for more information yet.</p>}
            {openRequests.map((request) => <InformationRequestCard
              key={request.id}
              request={request}
              onAnswered={refreshBrief}
              submissionId={id}
              respondedBy={session.subject}
            />)}
            {answeredRequests.length > 0 && <div className="answered-requests">
              <p className="eyebrow">ANSWERED</p>
              {answeredRequests.map((request) => <div key={request.id} className="info-request answered">
                <div className="info-request-head"><b>{request.message}</b><span>Answered</span></div>
                {request.items.length > 0 && <ul>{request.items.map((item) => <li key={item.id}>{item.label}</li>)}</ul>}
                {request.response && <p className="info-answer"><b>Your reply:</b> {request.response}</p>}
                <small>{request.respondedBy} · {formatDate(request.respondedAt)}</small>
              </div>)}
            </div>}
            <p className="field-note">
              Replies are saved in this browser until the backend supports a submitter reply thread. Staff can read the
              local record on this device.
            </p>
          </section>

          <section className="live-panel">
            <div className="live-panel-heading"><div><p className="eyebrow">NEXT STEP</p><h2>Keep the case moving</h2></div></div>
            <div className="brief-next-step">
              <ShieldCheck size={17} />
              <p>{localOnly
                ? 'Ask reception to register this brief. Once it is a backend case, progress and information requests appear here.'
                : openRequests.length
                  ? 'Answer the open request above. The receiving officer will see your reply in the local record.'
                  : 'No action is needed right now. Reception and the receiving department will contact you if anything else is required.'}</p>
            </div>
            <Link className="btn btn-outline" to="/submissions/new"><FileText size={14} />Submit another brief<ArrowRight size={14} /></Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function InformationRequestCard({
  request,
  submissionId,
  respondedBy,
  onAnswered,
}: {
  request: InformationRequest;
  submissionId: string;
  respondedBy: string;
  onAnswered: () => void;
}) {
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!response.trim()) {
      setError('Describe the information or document you are providing.');
      return;
    }
    const updated = answerInformationRequest(submissionId, request.id, response, respondedBy);
    if (!updated) {
      setError('The local brief could not be updated. Reload the page and try again.');
      return;
    }
    setResponse('');
    setError('');
    onAnswered();
  }

  return <div className="info-request open">
    <div className="info-request-head">
      <b>{request.message}</b>
      <span>Open</span>
    </div>
    <small>{request.requestedBy} · {formatDate(request.requestedAt)}</small>
    {request.items.length > 0 && <ul>{request.items.map((item) => <li key={item.id}>{item.label}</li>)}</ul>}
    <form className="info-request-reply" onSubmit={submit}>
      <label className="form-field">Your reply
        <textarea rows={3} maxLength={3000} value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Provide the requested information or say which document you have attached." />
      </label>
      {error && <div className="api-error" role="alert">{error}</div>}
      <button className="btn btn-primary" type="submit"><Send size={14} />Send reply</button>
    </form>
  </div>;
}
