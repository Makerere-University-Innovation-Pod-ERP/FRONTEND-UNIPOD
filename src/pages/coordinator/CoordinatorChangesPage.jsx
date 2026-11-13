import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  CircleSlash,
  Clock,
  LoaderCircle,
  Plus,
  RotateCw,
  Save,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { useChangesView, useSaveChangeRequest } from '@/hooks/useCoordinator';
import { ApiError } from '@/services/api-client';
import { formatDate, formatStage } from '@/lib/presentation';
import { deadlineLabel } from '@/lib/case-status';
import './coordinator.css';

/**
 * Innovation Coordinator — ask for changes (Assignment 2, page 4).
 *
 * Shows the refinement request for one brief and, when none has been written
 * yet, lets the coordinator write it: the specific changes expected, the
 * instructions to the applicant, and the deadline. Layout follows the Figma
 * Refinement Workspace frames (132:4695 / 159:4528). Recording the improved
 * version is page 5.
 */

const DECISION_PRESENTATION = {
  pending: { label: 'Pending', Icon: CircleDashed },
  recommended: { label: 'Recommended', Icon: CheckCircle2 },
  changes_needed: { label: 'Changes needed', Icon: CircleAlert },
  not_recommended: { label: 'Not recommended', Icon: CircleSlash },
};

const TONE_ICON = {
  overdue: TriangleAlert,
  attention: Clock,
  neutral: CalendarClock,
  none: CalendarClock,
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const changeRequestSchema = z.object({
  changes: z
    .array(z.string().trim())
    .transform((items) => items.filter(Boolean))
    .pipe(z.array(z.string()).min(1, 'List at least one change the applicant must make.')),
  guidance: z
    .string()
    .trim()
    .min(10, 'Write instructions for the applicant — at least 10 characters.')
    .max(2000, 'Keep the instructions under 2000 characters.'),
  dueDate: z
    .string()
    .min(1, 'Set a due date.')
    .refine((value) => value >= todayIso(), 'The due date cannot be in the past.'),
});

export function CoordinatorChangesPage({ token, onUnauthorized }) {
  const { id } = useParams();
  const query = useChangesView(token, id);
  const { data, isLoading, error } = query;

  const unauthorized = error instanceof ApiError && error.status === 401;
  const notFound = error instanceof ApiError && error.status === 404;

  useEffect(() => {
    if (unauthorized) onUnauthorized();
  }, [unauthorized, onUnauthorized]);

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">COORDINATOR · ASK FOR CHANGES</p>
          <h1>Improvement request.</h1>
          <p>What the applicant needs to change, and when the improved version is expected.</p>
        </div>
        <div className="heading-actions">
          <Link className="btn btn-outline" to="/coordinator/improvements">
            <ArrowLeft size={15} aria-hidden="true" />
            Back to Ideas Being Improved
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="live-loading">
          <LoaderCircle className="spin" size={22} />
          Loading the improvement request…
        </div>
      )}

      {notFound && (
        <section className="live-panel">
          <p className="live-empty">No brief exists with the reference {id}.</p>
          <p style={{ marginTop: 12 }}>
            <Link to="/coordinator/improvements">Back to Ideas Being Improved</Link>
          </p>
        </section>
      )}

      {error && !unauthorized && !notFound && (
        <div className="api-error api-error-banner" role="alert">
          <CircleAlert size={17} />
          <span>
            {error instanceof Error ? error.message : 'Could not load this improvement request.'}
          </span>
          <button type="button" className="btn btn-outline" onClick={() => void query.refetch()}>
            <RotateCw size={14} /> Retry
          </button>
        </div>
      )}

      {data && <ChangesView token={token} id={id} view={data} />}
    </div>
  );
}

function ChangesView({ token, id, view }) {
  const { brief, reviews, refinement, suggestedChanges, canRequestChanges, blockedReason } = view;

  return (
    <>
      {/* A — brief summary */}
      <section className="live-panel">
        <div className="coordinator-brief-header">
          <div>
            <p className="coordinator-brief-eyebrow">
              {brief.id} · {brief.code || 'Uncoded'}
            </p>
            <h2>{brief.title}</h2>
          </div>
          <span className="stage-pill">{formatStage(brief.stage)}</span>
        </div>
        <p className="coordinator-brief-summary">{brief.summary}</p>
        <div className="coordinator-field-grid">
          <Field label="Applicant" value={brief.submitterName ?? 'Not recorded'} />
          <Field label="Current version" value={`v${brief.versions}`} />
          <Field label="Current status" value={formatStage(brief.stage)} />
          <Field
            label="Improvement requested"
            value={refinement ? formatDate(refinement.requestedAt) : 'Not yet written'}
          />
        </div>
      </section>

      {/* B — review feedback */}
      <section className="live-panel">
        <div className="live-panel-heading">
          <div>
            <p className="eyebrow">REVIEW FEEDBACK</p>
            <h2>What the reviewers said</h2>
          </div>
        </div>
        {reviews.length ? (
          <ul className="coordinator-review-list">
            {reviews.map((review) => {
              const presentation =
                DECISION_PRESENTATION[review.decisionStatus] ?? DECISION_PRESENTATION.pending;
              const { Icon } = presentation;
              return (
                <li className="coordinator-review" key={review.reviewerId}>
                  <div className="coordinator-review-head">
                    <span className="coordinator-assignment-name">
                      <b>{review.reviewerName}</b>
                      <small>
                        step {review.step}/{review.of}
                        {review.decidedAt ? ` · decided ${formatDate(review.decidedAt)}` : ''}
                      </small>
                    </span>
                    <span className={`decision-badge decision-${review.decisionStatus}`}>
                      <Icon size={12} aria-hidden="true" />
                      {presentation.label}
                    </span>
                  </div>
                  {review.comment ? (
                    <blockquote className="coordinator-review-comment">{review.comment}</blockquote>
                  ) : (
                    <p className="coordinator-review-pending">
                      No comment recorded — this reviewer has not submitted.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="live-empty">No reviews were recorded for this brief.</p>
        )}
      </section>

      {/* C + D — the request itself, and its deadline */}
      {refinement ? (
        <RecordedRequest brief={brief} refinement={refinement} />
      ) : canRequestChanges ? (
        <ChangeRequestForm token={token} id={id} suggestedChanges={suggestedChanges} />
      ) : (
        <section className="live-panel">
          <div className="live-panel-heading">
            <div>
              <p className="eyebrow">REQUIRED IMPROVEMENTS</p>
              <h2>No request can be written yet</h2>
            </div>
          </div>
          <p className="coordinator-locked-reason" role="note">
            <CircleAlert size={14} aria-hidden="true" />
            {blockedReason}
          </p>
          <p className="live-note" style={{ marginTop: 12 }}>
            A brief enters improvement when the coordinator records{' '}
            <b>Needs more improvement</b> on the decision page.
          </p>
          <div className="coordinator-next-step-actions" style={{ marginTop: 12 }}>
            <Link className="btn btn-outline" to={`/coordinator/briefs/${brief.id}`}>
              Open the brief
            </Link>
          </div>
        </section>
      )}

      {/* E — actions */}
      <section className="live-panel">
        <p className="form-section-title">Actions</p>
        <div className="coordinator-next-step-actions">
          <Link className="btn btn-outline" to="/coordinator/improvements">
            <ArrowLeft size={15} aria-hidden="true" />
            Back to Ideas Being Improved
          </Link>
          <Link className="btn btn-outline" to={`/submissions/${brief.id}`}>
            View submission
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
          {refinement ? (
            <Link className="btn btn-primary" to={`/coordinator/briefs/${brief.id}/versions`}>
              Record the improved version
            </Link>
          ) : (
            <span className="disabled-control">
              <button className="btn btn-primary" type="button" disabled>
                Record the improved version
              </button>
              <span className="disabled-reason">
                Available once an improvement request has been written.
              </span>
            </span>
          )}
        </div>
      </section>
    </>
  );
}

function RecordedRequest({ brief, refinement }) {
  const deadline = deadlineLabel(refinement.dueDate);
  const ToneIcon = TONE_ICON[deadline.tone] ?? CalendarClock;

  return (
    <section className="live-panel">
      <div className="live-panel-heading">
        <div>
          <p className="eyebrow">REQUIRED IMPROVEMENTS</p>
          <h2>What the applicant must change</h2>
        </div>
        <span className={`decision-badge decision-${refinement.status === 'resolved' ? 'recommended' : 'changes_needed'}`}>
          {refinement.status === 'resolved' ? 'Resolved' : 'Open'}
        </span>
      </div>

      <p className="coordinator-request-byline">
        Requested by {refinement.requestedBy ?? 'the coordinator'} on{' '}
        {formatDate(refinement.requestedAt)}
      </p>

      {refinement.changes.length ? (
        <ul className="coordinator-change-list">
          {refinement.changes.map((change) => (
            <li key={change}>
              <CheckCircle2 size={14} aria-hidden="true" />
              {change}
            </li>
          ))}
        </ul>
      ) : (
        <p className="live-empty">No specific changes were listed.</p>
      )}

      {refinement.guidance && (
        <div className="coordinator-section">
          <h3>Instructions to the applicant</h3>
          <blockquote className="coordinator-review-comment">{refinement.guidance}</blockquote>
        </div>
      )}

      <div className="coordinator-section">
        <h3>Deadline</h3>
        <div className="coordinator-deadline-row">
          <Field label="Improvement requested" value={formatDate(refinement.requestedAt)} />
          <Field
            label="Improved version due"
            value={refinement.dueDate ? formatDate(refinement.dueDate) : 'Not set'}
          />
          <div className="case-field">
            <span>Time remaining</span>
            <p>
              <span className={`coordinator-deadline deadline-${deadline.tone}`}>
                <ToneIcon size={13} aria-hidden="true" />
                {deadline.label}
              </span>
            </p>
          </div>
        </div>
      </div>

      <p className="live-note" style={{ marginTop: 16 }}>
        A written request is kept as it was sent — version {brief.versions} and the reviews above
        are not changed by it.
      </p>
    </section>
  );
}

function ChangeRequestForm({ token, id, suggestedChanges }) {
  const saveRequest = useSaveChangeRequest(token, id);
  const [customChanges, setCustomChanges] = useState([]);
  const [draft, setDraft] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changeRequestSchema),
    defaultValues: { changes: [], guidance: '', dueDate: '' },
  });

  const selected = watch('changes') ?? [];

  const addCustom = () => {
    const value = draft.trim();
    if (!value || customChanges.includes(value) || suggestedChanges.includes(value)) {
      setDraft('');
      return;
    }
    setCustomChanges((current) => [...current, value]);
    setValue('changes', [...selected, value], { shouldValidate: true });
    setDraft('');
  };

  const removeCustom = (value) => {
    setCustomChanges((current) => current.filter((item) => item !== value));
    setValue(
      'changes',
      selected.filter((item) => item !== value),
      { shouldValidate: true },
    );
  };

  const onSubmit = (values) =>
    saveRequest
      .mutateAsync({
        changes: values.changes,
        guidance: values.guidance,
        dueDate: values.dueDate,
      })
      .catch(() => {
        // Surfaced below; the form keeps its values so it can be resubmitted.
      });

  return (
    <form className="live-panel" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="live-panel-heading">
        <div>
          <p className="eyebrow">REQUIRED IMPROVEMENTS</p>
          <h2>Request specific improvements</h2>
        </div>
      </div>
      <p className="coordinator-hint">
        Turn the reviewers&rsquo; observations into specific, supportive next steps.
      </p>

      <fieldset
        className="coordinator-fieldset"
        aria-describedby={errors.changes ? 'changes-error' : undefined}
        style={{ marginTop: 16 }}
      >
        <legend>Changes expected</legend>
        <div className="coordinator-reviewer-options">
          {[...suggestedChanges, ...customChanges].map((change) => (
            <label className="coordinator-reviewer-option" key={change}>
              <input type="checkbox" value={change} {...register('changes')} />
              <span>{change}</span>
              {customChanges.includes(change) && (
                <button
                  type="button"
                  className="coordinator-icon-button coordinator-remove-change"
                  onClick={() => removeCustom(change)}
                  aria-label={`Remove "${change}"`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              )}
            </label>
          ))}
        </div>

        <div className="coordinator-add-change">
          <label className="visually-hidden" htmlFor="custom-change">
            Add another change
          </label>
          <input
            id="custom-change"
            type="text"
            value={draft}
            placeholder="Add another change…"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              addCustom();
            }}
          />
          <button type="button" className="btn btn-outline" onClick={addCustom} disabled={!draft.trim()}>
            <Plus size={14} aria-hidden="true" />
            Add
          </button>
        </div>

        {errors.changes && (
          <p className="coordinator-error" id="changes-error" role="alert">
            <CircleAlert size={14} aria-hidden="true" />
            {errors.changes.message}
          </p>
        )}
      </fieldset>

      <div className="coordinator-field" style={{ marginTop: 20 }}>
        <label htmlFor="change-guidance">Instructions to the applicant (required)</label>
        <textarea
          id="change-guidance"
          rows={5}
          aria-required="true"
          aria-invalid={Boolean(errors.guidance)}
          aria-describedby={errors.guidance ? 'guidance-error' : 'guidance-hint'}
          placeholder="Explain what to improve and why it matters…"
          {...register('guidance')}
        />
        <p className="coordinator-hint" id="guidance-hint">
          The applicant sees this in full. Internal reviewer comments are never shown to them.
        </p>
        {errors.guidance && (
          <p className="coordinator-error" id="guidance-error" role="alert">
            <CircleAlert size={14} aria-hidden="true" />
            {errors.guidance.message}
          </p>
        )}
      </div>

      <div className="coordinator-field" style={{ marginTop: 20, maxWidth: 280 }}>
        <label htmlFor="change-due">Improved version due by</label>
        <input
          id="change-due"
          type="date"
          min={todayIso()}
          aria-invalid={Boolean(errors.dueDate)}
          aria-describedby={errors.dueDate ? 'due-error' : undefined}
          {...register('dueDate')}
        />
        {errors.dueDate && (
          <p className="coordinator-error" id="due-error" role="alert">
            <CircleAlert size={14} aria-hidden="true" />
            {errors.dueDate.message}
          </p>
        )}
      </div>

      <div className="coordinator-form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || saveRequest.isPending}
          aria-busy={saveRequest.isPending}
        >
          {saveRequest.isPending ? (
            <LoaderCircle className="spin" size={15} aria-hidden="true" />
          ) : (
            <Save size={15} aria-hidden="true" />
          )}
          Save refinement request
        </button>
      </div>

      {saveRequest.isError && (
        <p className="coordinator-error" role="alert" style={{ marginTop: 10 }}>
          <CircleAlert size={14} aria-hidden="true" />
          {saveRequest.error instanceof Error
            ? saveRequest.error.message
            : 'Could not save this request.'}
        </p>
      )}
    </form>
  );
}

function Field({ label, value }) {
  return (
    <div className="case-field">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}
