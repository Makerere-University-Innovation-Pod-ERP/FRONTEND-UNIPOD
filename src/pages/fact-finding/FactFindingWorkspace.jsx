import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowUpRight, CircleAlert, LoaderCircle, Save } from 'lucide-react';
import { useFactFindingQueue, useFactFindingCase, useSaveAssessment } from '@/hooks/useFactFinding';
import { checklistItemSchema } from '@/services/fact-finding';
import { ApiError } from '@/services/api-client';
import { formatStage } from '@/lib/presentation';

const assessmentFormSchema = z.object({
  checklist: z.array(checklistItemSchema),
  assessment: z.string(),
  nextAction: z.string().min(1, 'Choose a next action before saving.'),
});

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
        <div><p className="eyebrow">FACT-FINDING OFFICER · FACT-FINDING</p><h1>Assess a case.</h1><p>Check completeness and relevance, then record the next action.</p></div>
      </div>
      {queueError && !(queueError instanceof ApiError && queueError.status === 401) && (
        <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{queueError instanceof Error ? queueError.message : 'Could not load the fact-finding queue.'}</div>
      )}
      {queueLoading ? (
        <div className="live-loading"><LoaderCircle className="spin" size={22} />Loading queue…</div>
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
  const { data: caseFile, isLoading, error } = useFactFindingCase(token, id);
  const saveAssessment = useSaveAssessment(token, id);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(assessmentFormSchema),
    values: caseFile ? { checklist: caseFile.checklist, assessment: caseFile.assessment, nextAction: '' } : undefined,
  });

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) onUnauthorized();
  }, [error, onUnauthorized]);

  if (isLoading) return <section className="live-panel"><div className="live-loading"><LoaderCircle className="spin" size={20} />Loading case…</div></section>;
  if (!caseFile) return <section className="live-panel"><p className="live-empty">Select a case to begin.</p></section>;

  const onSubmit = handleSubmit((values) => {
    void saveAssessment.mutateAsync(values);
  });

  return (
    <section className="live-panel">
      <div className="live-panel-heading">
        <div><p className="eyebrow">CASE · {caseFile.code || 'UNCODED'}</p><h2>{caseFile.title}</h2></div>
        <Link to={`/fact-finding/cases/${caseFile.id}`}>Open case file <ArrowUpRight size={14} /></Link>
      </div>
      <form onSubmit={onSubmit}>
        <div className="checklist">
          {caseFile.checklist.map((item, index) => (
            <label className="checklist-item" key={item.id}>
              <input type="checkbox" {...register(`checklist.${index}.checked`)} defaultChecked={item.checked} />
              <span className="checklist-item-body">
                <b>{item.label}</b>
                <input type="text" placeholder="Optional note" defaultValue={item.note} {...register(`checklist.${index}.note`)} />
              </span>
            </label>
          ))}
        </div>
        <label className="form-field">Assessment summary
          <textarea rows={3} {...register('assessment')} placeholder="Summarize completeness and relevance for this case" />
        </label>
        <div className="next-action-card">
          <p className="form-section-title" style={{ margin: 0 }}>Next action</p>
          <label className="form-field" style={{ margin: '8px 0 0' }}>
            <select {...register('nextAction')} defaultValue="">
              <option value="" disabled>Choose the next action</option>
              {caseFile.nextAction.options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          {errors.nextAction && <p className="api-error" role="alert" style={{ marginTop: 8 }}>{errors.nextAction.message}</p>}
          <p>Suggested: {caseFile.nextAction.recommendation}</p>
        </div>
        {saveAssessment.isError && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />Could not save this assessment.</div>}
        {saveAssessment.isSuccess && <p className="live-note" role="status">Assessment saved.</p>}
        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={saveAssessment.isPending}>
            {saveAssessment.isPending ? <LoaderCircle size={15} className="spin" /> : <Save size={15} />}
            Save assessment
          </button>
        </div>
      </form>
    </section>
  );
}
