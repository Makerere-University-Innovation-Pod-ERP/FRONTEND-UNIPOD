import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, CircleAlert, FileCheck2, LoaderCircle, Undo2 } from 'lucide-react';
import {
  factFindingKeys,
  useFactFindingQueue,
  useFactFindingCase,
  useCompleteFactFinding,
  useRequestImprovement,
} from '@/hooks/useFactFinding';
import { backendApi } from '@/services/backend-api';
import { ApiError } from '@/services/api-client';
import { formatStage } from '@/lib/presentation';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DOCUMENT_STATUS_OPTIONS = ['SUBMITTED', 'VERIFIED', 'ONE_FILE', 'NOT_REQUIRED'];

export function FactFindingWorkspace({ token, onUnauthorized }) {
  const { data: queue, isLoading: queueLoading, error: queueError } = useFactFindingQueue(token);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (!selectedId && queue?.length) setSelectedId(queue[0].id);
  }, [queue, selectedId]);

  useEffect(() => {
    if (queueError instanceof ApiError && queueError.status === 401) onUnauthorized();
  }, [queueError, onUnauthorized]);

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div><p className="eyebrow">FACT-FINDING OFFICER · FACT-FINDING</p><h1>Assess a case.</h1><p>Check completeness and relevance, then send it on to review or back for improvement.</p></div>
      </div>
      {queueError && !(queueError instanceof ApiError && queueError.status === 401) && (
        <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{queueError instanceof Error ? queueError.message : 'Could not load the fact-finding queue.'}</div>
      )}
      {queueLoading ? (
        <LoadingSkeleton label="Loading queue…" variant="table" />
      ) : !queue?.length ? (
        <p className="live-empty">Nothing is waiting for fact-finding right now.</p>
      ) : (
        <div className="queue-grid">
          <nav className="queue-list" aria-label="Fact-finding queue">
            {queue.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`queue-row ${item.id === selectedId ? 'active' : ''}`}
                onClick={() => setSelectedId(item.id)}
                aria-current={item.id === selectedId}
              >
                <b>{item.title}</b>
                <small>{item.code || 'Uncoded'} · {formatStage(item.stage)}</small>
                <small className="queue-reason">{item.reason}</small>
              </button>
            ))}
          </nav>
          {selectedId && <AssessmentPanel token={token} id={selectedId} onUnauthorized={onUnauthorized} />}
        </div>
      )}
    </div>
  );
}

function AssessmentPanel({ token, id, onUnauthorized }) {
  const queryClient = useQueryClient();
  const { data: caseFile, isLoading, error } = useFactFindingCase(token, id);
  const completeFactFinding = useCompleteFactFinding(token, id);
  const requestImprovement = useRequestImprovement(token, id);
  const [note, setNote] = useState('');
  const [documentBusyId, setDocumentBusyId] = useState('');
  const [documentError, setDocumentError] = useState('');

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) onUnauthorized();
  }, [error, onUnauthorized]);

  if (isLoading) return <section className="live-panel"><LoadingSkeleton label="Loading case…" variant="detail" /></section>;
  if (!caseFile) return <section className="live-panel"><p className="live-empty">Select a case to begin.</p></section>;

  const { submission, documents, capabilities } = caseFile;
  const busy = completeFactFinding.isPending || requestImprovement.isPending;

  async function updateDocumentStatus(documentId, status) {
    setDocumentBusyId(documentId);
    setDocumentError('');
    try {
      const updatedCaseFile = await backendApi.updateDocumentStatus(
        token,
        id,
        documentId,
        { status, version: submission.version },
      );
      if (updatedCaseFile?.submission && Array.isArray(updatedCaseFile.documents)) {
        queryClient.setQueryData(factFindingKeys.case(token, id), updatedCaseFile);
      } else {
        await queryClient.invalidateQueries({ queryKey: factFindingKeys.case(token, id) });
      }
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else setDocumentError(reason instanceof Error ? reason.message : 'Could not update this document.');
    } finally {
      setDocumentBusyId('');
    }
  }

  return (
    <section className="live-panel">
      <div className="live-panel-heading">
        <div><p className="eyebrow">CASE · {submission.code || 'UNCODED'}</p><h2>{submission.title}</h2></div>
        <Link to={`/fact-finding/cases/${id}`}>Open case file <ArrowUpRight size={14} /></Link>
      </div>
      <div className="case-fields">
        <div className="case-field"><span>Purpose</span><p>{submission.purpose}</p></div>
        <div className="case-field"><span>Problem addressed</span><p>{submission.problemAddressed}</p></div>
      </div>
      <div className="requirement-block" style={{ marginTop: 16 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Documents</h3>
        {documentError && <p className="api-error" role="alert">{documentError}</p>}
        {documents.length ? (
          <ul className="document-list">
            {documents.map((document) => (
              <li key={document.id}>
                <span><b>{document.name}</b><small>{formatStage(document.status)}</small></span>
                {capabilities.updateDocumentStatus.enabled && (
                  <Select
                    value={document.status}
                    disabled={documentBusyId === document.id}
                    onValueChange={(value) => void updateDocumentStatus(document.id, value)}
                  >
                    <SelectTrigger aria-label={`Update ${document.name} status`} className="submission-detail-select-trigger"><SelectValue /></SelectTrigger>
                    <SelectContent className="submission-select-content submission-detail-select-content" sideOffset={6}>
                      {DOCUMENT_STATUS_OPTIONS.map((value) => <SelectItem key={value} value={value}>{formatStage(value)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="live-empty">No documents have been added to this case.</p>}
      </div>
      <div className="next-action-card" style={{ marginTop: 16 }}>
        <p className="form-section-title" style={{ margin: 0 }}>Next action</p>
        <label className="form-field" style={{ margin: '8px 0 0' }}>Note
          <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for the stage history" />
        </label>
        {(completeFactFinding.isError || requestImprovement.isError) && (
          <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />Could not record this action.</div>
        )}
        {(completeFactFinding.isSuccess || requestImprovement.isSuccess) && <p className="live-note" role="status">Recorded.</p>}
        <div className="form-actions">
          <button
            className="btn btn-outline"
            type="button"
            disabled={busy}
            onClick={() => void requestImprovement.mutateAsync({ note: note.trim() || undefined, version: submission.version })}
          >
            {requestImprovement.isPending ? <LoaderCircle size={15} className="spin" /> : <Undo2 size={15} />}
            Request improvement
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={busy}
            onClick={() => void completeFactFinding.mutateAsync({ note: note.trim() || undefined, version: submission.version })}
          >
            {completeFactFinding.isPending ? <LoaderCircle size={15} className="spin" /> : <FileCheck2 size={15} />}
            Send to review
          </button>
        </div>
      </div>
    </section>
  );
}
