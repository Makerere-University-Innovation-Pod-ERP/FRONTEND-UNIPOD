import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  CircleSlash,
  LoaderCircle,
  Lock,
  RotateCw,
  Save,
} from 'lucide-react';
import { useDecisionView, useRecordDecision } from '@/hooks/useCoordinator';
import { ApiError } from '@/services/api-client';
import { formatDate, formatStage } from '@/lib/presentation';
import { COORDINATOR_OUTCOMES, findOutcome, reviewProgressLabel } from '@/lib/case-status';
import './coordinator.css';

/**
 * Innovation Coordinator — decision page (Assignment 2, page 2).
 *
 * This is the only coordinator screen that renders a reviewer's written
 * comment; page 1 shows status alone. No Figma frame exists for this screen,
 * so the layout follows the "Review actions & decision authority" block of
 * frame 159:3582 (minus the IP Review chip, which is out of scope) and reuses
 * page 1's shell, tokens and stylesheet.
 */

const DECISION_PRESENTATION = {
  pending: { label: 'Pending', Icon: CircleDashed },
  recommended: { label: 'Recommended', Icon: CheckCircle2 },
  changes_needed: { label: 'Changes needed', Icon: CircleAlert },
  not_recommended: { label: 'Not recommended', Icon: CircleSlash },
};

const OUTCOME_CONSEQUENCE = {
  confirmed:
    'The brief moves to Forwarded, a project code is generated, and the responsible department picks it up.',
  needs_improvement:
    'The brief moves to Refinement requested. You then raise the specific changes for the submitter.',
  closed: 'The brief is closed. The written reason is recorded against it and kept in its history.',
};

const decisionSchema = z
  .object({
    outcome: z.enum(['confirmed', 'needs_improvement', 'closed'], {
      message: 'Choose an outcome.',
    }),
    reason: z.string().trim().max(2000, 'Keep the reason under 2000 characters.'),
  })
  .superRefine((values, context) => {
    if (values.outcome !== 'closed') return;
    if (!values.reason) {
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'A closed decision needs a written reason.',
      });
      return;
    }
    if (values.reason.length < 10) {
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Give a bit more detail — at least 10 characters.',
      });
    }
  });

export function CoordinatorDecisionPage({ token, onUnauthorized }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const query = useDecisionView(token, id);
  const { data, isLoading, error } = query;

  const unauthorized = error instanceof ApiError && error.status === 401;

  useEffect(() => {
    if (unauthorized) onUnauthorized();
  }, [unauthorized, onUnauthorized]);

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">COORDINATOR · DECISION</p>
          <h1>Record the decision.</h1>
          <p>Every reviewer&rsquo;s choice and comment, then the outcome for this brief.</p>
        </div>
        <div className="heading-actions">
          <Link className="btn btn-outline" to={id ? `/coordinator/briefs/${id}` : '/coordinator'}>
            <ArrowLeft size={15} aria-hidden="true" />
            Back to the brief
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="live-loading">
          <LoaderCircle className="spin" size={22} />
          Loading the review record…
        </div>
      )}

      {error && !unauthorized && (
        <div className="api-error api-error-banner" role="alert">
          <CircleAlert size={17} />
          <span>{error instanceof Error ? error.message : 'Could not load this decision.'}</span>
          <button type="button" className="btn btn-outline" onClick={() => void query.refetch()}>
            <RotateCw size={14} /> Retry
          </button>
        </div>
      )}

      {!isLoading && !error && !data && (
        <p className="live-empty">This brief could not be found.</p>
      )}

      {data && (
        <DecisionView
          token={token}
          id={id}
          view={data}
          preselected={searchParams.get('outcome')}
        />
      )}
    </div>
  );
}

function DecisionView({ token, id, view, preselected }) {
  const { brief, reviews, canRecordDecision, lockedReason } = view;

  return (
    <>
      <section className="live-panel">
        <div className="coordinator-brief-header">
          <div>
            <p className="coordinator-brief-eyebrow">
              {brief.id} · {brief.category === 'student' ? 'Student project' : 'General innovation'}{' '}
              · {brief.code || 'Uncoded'}
            </p>
            <h2>{brief.title}</h2>
          </div>
          <span className="stage-pill">{formatStage(brief.stage)}</span>
        </div>
        <p className="coordinator-brief-summary">{brief.summary}</p>
        <p className="coordinator-progress" role="status">
          <b>{reviewProgressLabel(brief.reviewPanel)}</b>
          <span className="coordinator-progress-meta">
            · Mode: {brief.reviewPanel.mode === 'sequential' ? 'Sequential' : 'Parallel'}
            {brief.reviewPanel.dueDate ? ` · Due ${formatDate(brief.reviewPanel.dueDate)}` : ''}
          </span>
        </p>
      </section>

      <section className="live-panel">
        <div className="live-panel-heading">
          <div>
            <p className="eyebrow">REVIEWER DECISIONS</p>
            <h2>What each reviewer said</h2>
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
                      No comment recorded — this reviewer has not submitted yet.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="live-empty">No reviewers were assigned to this brief.</p>
        )}
      </section>

      {brief.outcome ? (
        <RecordedOutcome brief={brief} />
      ) : (
        <DecisionForm
          token={token}
          id={id}
          brief={brief}
          canRecordDecision={canRecordDecision}
          lockedReason={lockedReason}
          preselected={preselected}
        />
      )}
    </>
  );
}

function DecisionForm({ token, id, brief, canRecordDecision, lockedReason, preselected }) {
  const recordDecision = useRecordDecision(token, id);
  const [saved, setSaved] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(decisionSchema),
    defaultValues: {
      outcome: findOutcome(preselected) ? preselected : '',
      reason: '',
    },
  });

  const selectedOutcome = watch('outcome');
  const reasonRequired = selectedOutcome === 'closed';

  const onSubmit = (values) =>
    recordDecision
      .mutateAsync({ outcome: values.outcome, reason: values.reason })
      .then((updated) => setSaved(updated))
      .catch(() => {
        // Surfaced through recordDecision.error below; the form keeps its
        // values so the coordinator can correct and resubmit.
      });

  if (saved) return <RecordedOutcome brief={saved} justSaved />;

  return (
    <form className="live-panel" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="live-panel-heading">
        <div>
          <p className="eyebrow">OUTCOME</p>
          <h2>Coordinator decision</h2>
        </div>
      </div>

      {!canRecordDecision && (
        <p className="coordinator-locked-reason" role="note">
          <Lock size={14} aria-hidden="true" />
          {lockedReason}
        </p>
      )}

      <fieldset
        className="coordinator-fieldset"
        disabled={!canRecordDecision}
        aria-describedby={errors.outcome ? 'outcome-error' : undefined}
      >
        <legend>Choose one outcome</legend>
        <div className="coordinator-outcome-options">
          {COORDINATOR_OUTCOMES.map((outcome) => (
            <label className="coordinator-outcome-option" key={outcome.id}>
              <input type="radio" value={outcome.id} {...register('outcome')} />
              <span>
                {outcome.label}
                <small>{OUTCOME_CONSEQUENCE[outcome.id]}</small>
              </span>
            </label>
          ))}
        </div>
        {errors.outcome && (
          <p className="coordinator-error" id="outcome-error" role="alert">
            <CircleAlert size={14} aria-hidden="true" />
            {errors.outcome.message}
          </p>
        )}
      </fieldset>

      <div className="coordinator-field" style={{ marginTop: 20 }}>
        <label htmlFor="decision-reason">
          {reasonRequired ? 'Reason for closing (required)' : 'Note for the record (optional)'}
        </label>
        <textarea
          id="decision-reason"
          rows={5}
          disabled={!canRecordDecision}
          aria-required={reasonRequired}
          aria-invalid={Boolean(errors.reason)}
          aria-describedby={errors.reason ? 'reason-error' : 'reason-hint'}
          placeholder={
            reasonRequired
              ? 'Explain why this brief is being closed…'
              : 'Add any context for the record…'
          }
          {...register('reason')}
        />
        <p className="coordinator-hint" id="reason-hint">
          {reasonRequired
            ? 'A closed decision cannot be saved without a written reason.'
            : 'Optional for this outcome, but it is kept in the brief history.'}
        </p>
        {errors.reason && (
          <p className="coordinator-error" id="reason-error" role="alert">
            <CircleAlert size={14} aria-hidden="true" />
            {errors.reason.message}
          </p>
        )}
      </div>

      {selectedOutcome === 'confirmed' && (
        <p className="coordinator-hint coordinator-code-preview">
          Saving will generate this brief&rsquo;s project code
          {brief.category === 'student' ? ' (STU prefix)' : ' (GEN prefix)'} and display it here.
        </p>
      )}

      <div className="coordinator-form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!canRecordDecision || isSubmitting || recordDecision.isPending}
          title={canRecordDecision ? undefined : lockedReason ?? undefined}
          aria-busy={recordDecision.isPending}
        >
          {recordDecision.isPending ? (
            <LoaderCircle className="spin" size={15} aria-hidden="true" />
          ) : (
            <Save size={15} aria-hidden="true" />
          )}
          Save decision
        </button>
        {!canRecordDecision && <span className="disabled-reason">{lockedReason}</span>}
      </div>

      {recordDecision.isError && (
        <p className="coordinator-error" role="alert" style={{ marginTop: 10 }}>
          <CircleAlert size={14} aria-hidden="true" />
          {recordDecision.error instanceof Error
            ? recordDecision.error.message
            : 'Could not save this decision.'}
        </p>
      )}
    </form>
  );
}

function RecordedOutcome({ brief, justSaved }) {
  const outcome = brief.outcome;
  if (!outcome) return null;

  return (
    <section className="live-panel coordinator-decision-recorded">
      <div className="live-panel-heading">
        <div>
          <p className="eyebrow">{justSaved ? 'DECISION SAVED' : 'DECISION ON RECORD'}</p>
          <h2>{formatStage(outcome.status)}</h2>
        </div>
        <span className="stage-pill">{formatStage(brief.stage)}</span>
      </div>

      {justSaved && (
        <p className="coordinator-success" role="status">
          <CheckCircle2 size={15} aria-hidden="true" />
          The decision has been recorded.
        </p>
      )}

      {outcome.projectCode && (
        <div className="coordinator-code-panel">
          <span>Project code</span>
          <strong className="coordinator-project-code">{outcome.projectCode}</strong>
        </div>
      )}

      {outcome.reason && (
        <div className="coordinator-section">
          <h3>Reason on record</h3>
          <blockquote className="coordinator-review-comment">{outcome.reason}</blockquote>
        </div>
      )}

      <p className="live-note" style={{ marginTop: 16 }}>
        Reviews and earlier versions are kept as they were — a recorded decision cannot be edited
        or replaced from this screen.
      </p>

      <p style={{ marginTop: 12 }}>
        <Link to={`/coordinator/briefs/${brief.id}`}>Back to the brief</Link>
      </p>
    </section>
  );
}
