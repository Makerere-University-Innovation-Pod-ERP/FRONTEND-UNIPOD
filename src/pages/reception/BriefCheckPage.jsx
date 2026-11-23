import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, MessageSquare, Send, TriangleAlert } from 'lucide-react';
import {
  useAddComment, useAskForMissingInfo, useDepartments, useForwardBrief, useReceptionBrief,
} from '@/hooks/useReception';
import { formatDate, formatStage } from '@/lib/presentation';
import { ErrorBanner, Loading } from './shared';
import './reception.css';
import { categoryLabel, useSignOutOn401 } from './helpers';

const forwardSchema = z.object({
  checked: z.record(z.string(), z.boolean()),
  departmentId: z.string().min(1, 'Choose a department.'),
  comment: z.string(),
});

const missingInfoSchema = z.object({
  items: z.string().trim().min(1, 'List at least one missing item.'),
  note: z.string(),
  dueDate: z.string().min(1, 'Choose a due date.'),
});

const commentSchema = z.object({
  note: z.string().trim().min(1, 'Write a comment first.'),
});

const ACTION_LABELS = {
  SUBMITTED: 'Brief submitted',
  COMMENT: 'Reception comment',
  MISSING_INFO_REQUESTED: 'Missing information requested',
  FORWARDED: 'Forwarded',
};

/** One screen to check a brief, then forward it or ask for missing information. */
export function BriefCheckPage({ token, onUnauthorized }) {
  const { id = '' } = useParams();
  const { data: brief, isLoading, error, refetch } = useReceptionBrief(token, id);
  useSignOutOn401(error, onUnauthorized);

  return (
    <div className="live-page page-enter">
      <Link className="btn btn-outline" to="/reception/home"><ArrowLeft size={15} />Back to reception home</Link>
      {isLoading ? (
        <Loading label="Loading brief…" />
      ) : !brief ? (
        <ErrorBanner error={error} fallback="Could not load this brief." onRetry={() => void refetch()} />
      ) : (
        <>
          <div className="live-page-heading">
            <div>
              <p className="eyebrow">RECEPTION · CHECK A BRIEF · {brief.id}</p>
              <h1>{brief.title}</h1>
              <p>Status: <span className="stage-pill">{formatStage(brief.stage)}</span></p>
            </div>
          </div>
          <BriefDetails brief={brief} />
          {brief.openRequest && <OpenRequestNotice request={brief.openRequest} />}
          {brief.stage === 'RECEIVED' ? (
            <>
              <ForwardPanel token={token} brief={brief} onUnauthorized={onUnauthorized} />
              <MissingInfoPanel token={token} brief={brief} onUnauthorized={onUnauthorized} />
            </>
          ) : (
            <section className="live-panel" role="status">
              <p>This brief has left reception{brief.forwardedTo ? ` and was forwarded to ${brief.forwardedTo}` : ''}.</p>
            </section>
          )}
          <CommentPanel token={token} brief={brief} onUnauthorized={onUnauthorized} />
          <HistoryPanel history={brief.history} />
        </>
      )}
    </div>
  );
}

/** Read-only: the receptionist can see the submitter's content but never edit it. */
function BriefDetails({ brief }) {
  return (
    <section className="live-panel" aria-labelledby="brief-details-heading">
      <div className="live-panel-heading"><div><p className="eyebrow">READ ONLY</p><h2 id="brief-details-heading">Brief details</h2></div></div>
      <dl className="form-grid">
        <div><dt>Type</dt><dd>{categoryLabel(brief.category)}</dd></div>
        <div><dt>Submitted</dt><dd>{formatDate(brief.submittedAt)}</dd></div>
        <div><dt>Submitter</dt><dd>{brief.submitter.name} ({brief.submitter.type})</dd></div>
        <div><dt>Email</dt><dd>{brief.submitter.email}</dd></div>
      </dl>
      <h3>Purpose</h3>
      <p>{brief.purpose}</p>
      <h3>Problem addressed</h3>
      <p>{brief.problemAddressed}</p>
      <h3>Documents</h3>
      <ul>
        {brief.documents.map((document) => (
          <li key={document.id}>
            {document.name} — <b>{document.status === 'MISSING' ? 'Missing' : 'Attached'}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OpenRequestNotice({ request }) {
  return (
    <section className="live-panel" aria-label="Open request to the submitter">
      <p><TriangleAlert size={15} /> <b>Waiting on the submitter</b> — due {formatDate(request.dueDate)}</p>
      <ul>{request.items.map((item) => <li key={item}>{item}</li>)}</ul>
      {request.note && <p>{request.note}</p>}
      <small>Asked by {request.requestedBy} on {formatDate(request.requestedAt)}</small>
    </section>
  );
}

function ForwardPanel({ token, brief, onUnauthorized }) {
  const departments = useDepartments(token);
  const forward = useForwardBrief(token, brief.id);
  useSignOutOn401(forward.error ?? departments.error, onUnauthorized);
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(forwardSchema),
    defaultValues: {
      checked: Object.fromEntries(brief.checklist.map((item) => [item.id, item.checked])),
      departmentId: brief.suggestedDepartmentId ?? '',
      comment: '',
    },
  });
  const checked = useWatch({ control, name: 'checked' }) ?? {};
  const tickedCount = brief.checklist.filter((item) => checked[item.id]).length;
  const allTicked = tickedCount === brief.checklist.length;

  function onSubmit(values) {
    forward.mutate({
      departmentId: values.departmentId,
      comment: values.comment,
      checkedItemIds: brief.checklist.filter((item) => values.checked[item.id]).map((item) => item.id),
    });
  }

  return (
    <section className="live-panel" aria-labelledby="forward-heading">
      <div className="live-panel-heading"><div><p className="eyebrow">STEP 1</p><h2 id="forward-heading">Check and forward</h2></div></div>
      <form className="api-form" onSubmit={handleSubmit(onSubmit)}>
        <fieldset className="checklist reception-fieldset">
          <legend>Check list</legend>
          {brief.checklist.map((item) => (
            <label className="checklist-item reception-choice" key={item.id}>
              <input type="checkbox" {...register(`checked.${item.id}`)} />
              <span className="checklist-item-body">{item.label}</span>
            </label>
          ))}
        </fieldset>
        <p className="live-note" aria-live="polite">
          {allTicked ? 'All checks done — you can forward.' : `Tick every item to unlock Forward (${tickedCount} of ${brief.checklist.length} done).`}
        </p>

        <label htmlFor="forward-department">Department</label>
        <select id="forward-department" disabled={departments.isLoading} {...register('departmentId')}>
          <option value="">Choose a department…</option>
          {(departments.data ?? []).map((department) => (
            <option key={department.id} value={department.id}>{department.name}</option>
          ))}
        </select>
        {errors.departmentId && <p className="api-error" role="alert">{errors.departmentId.message}</p>}

        <label htmlFor="forward-comment">Comment (optional)</label>
        <textarea id="forward-comment" rows={2} {...register('comment')} />

        <ErrorBanner error={forward.error} fallback="Could not forward this brief." />
        <div className="action-row">
          <button type="submit" className="btn btn-primary" disabled={!allTicked || forward.isPending}>
            <Send size={15} />{forward.isPending ? 'Forwarding…' : 'Forward'}
          </button>
        </div>
      </form>
    </section>
  );
}

function MissingInfoPanel({ token, brief, onUnauthorized }) {
  const [open, setOpen] = useState(false);
  const ask = useAskForMissingInfo(token, brief.id);
  useSignOutOn401(ask.error, onUnauthorized);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(missingInfoSchema),
    defaultValues: {
      items: brief.documents.filter((document) => document.status === 'MISSING').map((document) => document.name).join('\n'),
      note: '',
      dueDate: '',
    },
  });

  function onSubmit(values) {
    ask.mutate(
      {
        items: values.items.split('\n').map((item) => item.trim()).filter(Boolean),
        note: values.note,
        dueDate: values.dueDate,
      },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <section className="live-panel" aria-labelledby="missing-heading">
      <div className="live-panel-heading">
        <div><p className="eyebrow">OR</p><h2 id="missing-heading">Ask for missing information</h2></div>
        {!open && <button type="button" className="btn btn-outline" onClick={() => setOpen(true)}>Ask the submitter</button>}
      </div>
      {open && (
        <form className="api-form" onSubmit={handleSubmit(onSubmit)}>
          <label htmlFor="missing-items">What is missing? (one item per line)</label>
          <textarea id="missing-items" rows={3} {...register('items')} />
          {errors.items && <p className="api-error" role="alert">{errors.items.message}</p>}

          <label htmlFor="missing-note">Note to the submitter (optional)</label>
          <textarea id="missing-note" rows={2} {...register('note')} />

          <label htmlFor="missing-due">Due date</label>
          <input id="missing-due" type="date" min={today} {...register('dueDate')} />
          {errors.dueDate && <p className="api-error" role="alert">{errors.dueDate.message}</p>}

          <ErrorBanner error={ask.error} fallback="Could not send the request." />
          <div className="action-row">
            <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={ask.isPending}>
              {ask.isPending ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function CommentPanel({ token, brief, onUnauthorized }) {
  const comment = useAddComment(token, brief.id);
  useSignOutOn401(comment.error, onUnauthorized);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(commentSchema),
    defaultValues: { note: '' },
  });

  function onSubmit(values) {
    comment.mutate({ note: values.note }, { onSuccess: () => reset() });
  }

  return (
    <section className="live-panel" aria-labelledby="comment-heading">
      <div className="live-panel-heading"><div><p className="eyebrow">NOTES</p><h2 id="comment-heading">Add a comment</h2></div></div>
      <form className="api-form" onSubmit={handleSubmit(onSubmit)}>
        <label htmlFor="reception-comment">Comment</label>
        <textarea id="reception-comment" rows={2} {...register('note')} />
        {errors.note && <p className="api-error" role="alert">{errors.note.message}</p>}
        <ErrorBanner error={comment.error} fallback="Could not save the comment." />
        <div className="action-row">
          <button type="submit" className="btn btn-outline" disabled={comment.isPending}>
            <MessageSquare size={15} />{comment.isPending ? 'Saving…' : 'Add comment'}
          </button>
        </div>
      </form>
    </section>
  );
}

function HistoryPanel({ history }) {
  return (
    <section className="live-panel" aria-labelledby="history-heading">
      <div className="live-panel-heading"><div><p className="eyebrow">HISTORY</p><h2 id="history-heading">What has happened</h2></div></div>
      <ol className="history-list">
        {[...history].reverse().map((entry) => (
          <li key={entry.id}>
            <span className="history-dot" />
            <b>{ACTION_LABELS[entry.action] ?? entry.action}{entry.destination ? ` → ${entry.destination}` : ''}</b>
            <small>{entry.by} · {formatDate(entry.at)}</small>
            {entry.note && <p>{entry.note}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
