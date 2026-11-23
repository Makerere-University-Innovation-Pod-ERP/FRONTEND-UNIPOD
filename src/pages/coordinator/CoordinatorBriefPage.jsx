import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  CircleSlash,
  Clock,
  LoaderCircle,
  RotateCw,
  UserPlus,
} from 'lucide-react';
import {
  useAssignReviewers,
  useCoordinatorBrief,
  useCoordinatorBriefs,
  useReviewerPool,
} from '@/hooks/useCoordinator';
import { ApiError } from '@/services/api-client';
import { formatDate, formatStage } from '@/lib/presentation';
import { coordinatorNextStep, reviewProgressLabel } from '@/lib/case-status';
import './coordinator.css';

const QUEUE_FILTERS = [
  { id: 'all', label: 'All', stages: null },
  { id: 'awaiting', label: 'Awaiting assessment', stages: ['FACT_FINDING', 'REFINEMENT_REQUESTED'] },
  { id: 'in-progress', label: 'In progress', stages: ['UNDER_REVIEW'] },
];

/**
 * Status-only presentation of a reviewer's decision. The coordinator brief
 * page deliberately never renders a reviewer's written comment — those are
 * summarised on the decision page instead.
 */
const DECISION_PRESENTATION = {
  pending: { label: 'Pending', Icon: CircleDashed },
  recommended: { label: 'Recommended', Icon: CheckCircle2 },
  changes_needed: { label: 'Changes needed', Icon: CircleAlert },
  not_recommended: { label: 'Not recommended', Icon: CircleSlash },
};

const todayIso = () => new Date().toISOString().slice(0, 10);

function buildAssignmentSchema(alreadyAssignedIds, alreadyAssignedNames) {
  return z
    .object({
      reviewerIds: z
        .array(z.string())
        .min(1, 'Choose at least one reviewer.')
        .refine(
          (ids) => new Set(ids).size === ids.length,
          'A reviewer can only be assigned once to this brief.',
        )
        .refine(
          (ids) => !ids.some((id) => alreadyAssignedIds.includes(id)),
          (ids) => {
            const clash = ids.find((id) => alreadyAssignedIds.includes(id));
            const name = alreadyAssignedNames[clash] ?? 'That reviewer';
            return { message: `${name} is already assigned to this brief.` };
          },
        ),
      mode: z.enum(['parallel', 'sequential'], { message: 'Choose parallel or sequential.' }),
      requiredReviews: z.coerce
        .number({ message: 'Enter how many reviews are required.' })
        .int('Enter a whole number.')
        .min(1, 'At least 1 review is required.'),
      dueDate: z
        .string()
        .min(1, 'Set a due date.')
        .refine((value) => value >= todayIso(), 'The due date cannot be in the past.'),
    })
    .superRefine((values, context) => {
      const total = values.reviewerIds.length + alreadyAssignedIds.length;
      if (values.requiredReviews > total) {
        context.addIssue({
          code: 'custom',
          path: ['requiredReviews'],
          message: `Required reviews (${values.requiredReviews}) cannot exceed the ${total} reviewer${
            total === 1 ? '' : 's'
          } assigned.`,
        });
      }
    });
}

export function CoordinatorBriefPage({ token, onUnauthorized }) {
  const { id: routeId } = useParams();
  const [filterId, setFilterId] = useState('all');

  const briefsQuery = useCoordinatorBriefs(token);
  const briefQuery = useCoordinatorBrief(token, routeId);

  const unauthorized =
    (briefsQuery.error instanceof ApiError && briefsQuery.error.status === 401) ||
    (briefQuery.error instanceof ApiError && briefQuery.error.status === 401);

  useEffect(() => {
    if (unauthorized) onUnauthorized();
  }, [unauthorized, onUnauthorized]);

  const activeFilter = QUEUE_FILTERS.find((item) => item.id === filterId) ?? QUEUE_FILTERS[0];
  const visibleBriefs = (briefsQuery.data ?? []).filter(
    (brief) => !activeFilter.stages || activeFilter.stages.includes(brief.stage),
  );

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">COORDINATOR · REVIEW QUEUE</p>
          <h1>Coordinator briefs.</h1>
          <p>Assign reviewers, follow review progress and take the next allowed step.</p>
        </div>
      </div>

      {briefsQuery.error && !unauthorized && (
        <div className="api-error api-error-banner" role="alert">
          <CircleAlert size={17} />
          <span>
            {briefsQuery.error instanceof Error
              ? briefsQuery.error.message
              : 'Could not load coordinator briefs.'}
          </span>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => void briefsQuery.refetch()}
          >
            <RotateCw size={14} /> Retry
          </button>
        </div>
      )}

      {briefsQuery.isLoading ? (
        <div className="live-loading">
          <LoaderCircle className="spin" size={22} />
          Loading coordinator briefs…
        </div>
      ) : (
        <div className="queue-grid">
          <section aria-label="Case queue">
            <div className="coordinator-queue-filters" role="group" aria-label="Filter by stage">
              {QUEUE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className="coordinator-filter"
                  aria-pressed={filter.id === filterId}
                  onClick={() => setFilterId(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            {visibleBriefs.length ? (
              <nav className="queue-list" aria-label="Briefs waiting on the coordinator">
                {visibleBriefs.map((brief) => (
                  <Link
                    key={brief.id}
                    to={`/coordinator/briefs/${brief.id}`}
                    className={`queue-row coordinator-queue-row ${brief.id === routeId ? 'active' : ''}`}
                    aria-current={brief.id === routeId ? 'page' : undefined}
                  >
                    <b>{brief.title}</b>
                    <small>
                      {brief.code || 'Uncoded'} · {formatDate(brief.updatedAt)} ·{' '}
                      {formatStage(brief.stage)}
                    </small>
                    <small className="queue-reason">{brief.pendingAction}</small>
                  </Link>
                ))}
              </nav>
            ) : (
              <p className="live-empty">
                {briefsQuery.data?.length
                  ? 'No briefs match this filter.'
                  : 'No briefs are waiting on you.'}
              </p>
            )}
          </section>

          {routeId ? (
            <BriefPanel
              token={token}
              id={routeId}
              query={briefQuery}
              unauthorized={unauthorized}
            />
          ) : (
            <section className="live-panel">
              <p className="live-empty">Select a brief to open it.</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function BriefPanel({ token, id, query, unauthorized }) {
  const { data: brief, isLoading, error } = query;

  if (isLoading) {
    return (
      <section className="live-panel">
        <div className="live-loading">
          <LoaderCircle className="spin" size={20} />
          Loading brief…
        </div>
      </section>
    );
  }

  if (error && !unauthorized) {
    return (
      <section className="live-panel">
        <div className="api-error api-error-banner" role="alert">
          <CircleAlert size={17} />
          <span>{error instanceof Error ? error.message : 'Could not load this brief.'}</span>
          <button type="button" className="btn btn-outline" onClick={() => void query.refetch()}>
            <RotateCw size={14} /> Retry
          </button>
        </div>
      </section>
    );
  }

  if (!brief) {
    return (
      <section className="live-panel">
        <p className="live-empty">This brief could not be found.</p>
      </section>
    );
  }

  const panel = brief.reviewPanel;
  const nextStep = coordinatorNextStep(brief.stage, panel);
  const overdue = Boolean(panel.dueDate) && panel.dueDate < todayIso() && !nextStep.unlocked;

  return (
    <section className="live-panel">
      <div className="coordinator-brief-header">
        <div>
          <p className="coordinator-brief-eyebrow">
            {brief.id} · {brief.category === 'student' ? 'Student project' : 'General innovation'} ·{' '}
            {brief.code || 'Uncoded'}
          </p>
          <h2>{brief.title}</h2>
        </div>
        <span className="stage-pill">{formatStage(brief.stage)}</span>
      </div>
      <p className="coordinator-brief-summary">{brief.summary}</p>

      <div className="coordinator-field-grid">
        <Field label="Responsible officer" value={brief.responsibleOfficer ?? 'Unassigned'} />
        <Field label="Assigned sector" value={brief.assignedSector ?? 'Unassigned'} />
        <Field
          label="Documentation"
          value={
            brief.documentCount
              ? `${brief.documentCount} supporting file(s)`
              : 'No documents'
          }
        />
        <Field label="Brief lifecycle" value={formatStage(brief.stage)} />
        <Field
          label="Outcome"
          value={brief.outcome ? formatStage(brief.outcome.status) : 'In progress'}
        />
        <Field label="Versions" value={brief.versions > 1 ? `${brief.versions} versions` : 'Original'} />
      </div>

      <AssignmentForm token={token} id={id} brief={brief} />

      <ProgressLine panel={panel} overdue={overdue} />

      <div className="coordinator-section">
        <h3>Reviewer assignments</h3>
        {panel.assignments.length ? (
          <ul className="coordinator-assignment-list">
            {panel.assignments.map((assignment) => {
              const presentation =
                DECISION_PRESENTATION[assignment.decisionStatus] ?? DECISION_PRESENTATION.pending;
              const { Icon } = presentation;
              return (
                <li className="coordinator-assignment" key={assignment.reviewerId}>
                  <span className="coordinator-assignment-name">
                    <b>{assignment.reviewerName}</b>
                    <small>
                      {assignment.mode === 'sequential' ? 'Sequential' : 'Parallel'} · step{' '}
                      {assignment.step}/{assignment.of} · assigned {formatDate(assignment.assignedAt)}
                    </small>
                  </span>
                  <span className={`decision-badge decision-${assignment.decisionStatus}`}>
                    <Icon size={12} aria-hidden="true" />
                    {presentation.label}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="live-empty">No reviewers assigned yet.</p>
        )}
        <p className="live-note" style={{ marginTop: 10 }}>
          Reviewer status only. Written review comments are shown on the decision page.
        </p>
      </div>

      <NextStepBox brief={brief} nextStep={nextStep} />

      <p style={{ marginTop: 16 }}>
        <Link to={`/submissions/${brief.id}`}>
          Open audit history <ArrowUpRight size={13} />
        </Link>
      </p>
    </section>
  );
}

function AssignmentForm({ token, id, brief }) {
  const reviewerPoolQuery = useReviewerPool(token);
  const assignReviewers = useAssignReviewers(token, id);
  const [successMessage, setSuccessMessage] = useState('');

  const assignedIds = brief.reviewPanel.assignments.map((item) => item.reviewerId);
  const assignedNames = useMemo(() => {
    const map = {};
    for (const item of brief.reviewPanel.assignments) map[item.reviewerId] = item.reviewerName;
    return map;
  }, [brief.reviewPanel.assignments]);

  const schema = useMemo(
    () => buildAssignmentSchema(assignedIds, assignedNames),
    // assignedIds is derived from the same source as assignedNames.
    [assignedNames], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      reviewerIds: [],
      mode: brief.reviewPanel.mode ?? 'parallel',
      requiredReviews: Math.max(1, brief.reviewPanel.requiredReviews || 1),
      dueDate: brief.reviewPanel.dueDate ?? '',
    },
  });

  const selectedIds = watch('reviewerIds') ?? [];
  const mode = watch('mode');
  const pool = reviewerPoolQuery.data ?? [];

  const move = (index, delta) => {
    const next = [...selectedIds];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setValue('reviewerIds', next, { shouldValidate: true });
  };

  const onSubmit = (values) => {
    setSuccessMessage('');
    return assignReviewers
      .mutateAsync({
        reviewerIds: values.reviewerIds,
        mode: values.mode,
        requiredReviews: values.requiredReviews,
        dueDate: values.dueDate,
      })
      .then(() => {
        setSuccessMessage(
          `${values.reviewerIds.length} reviewer${
            values.reviewerIds.length === 1 ? '' : 's'
          } assigned.`,
        );
        setValue('reviewerIds', []);
      })
      .catch(() => {
        // Surfaced below through assignReviewers.error; values are kept so the
        // coordinator can correct and resubmit.
      });
  };

  const nameFor = (reviewerId) =>
    pool.find((item) => item.id === reviewerId)?.name ?? assignedNames[reviewerId] ?? reviewerId;

  return (
    <form className="coordinator-section" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h3>Review assignments</h3>

      {reviewerPoolQuery.isLoading ? (
        <div className="live-loading">
          <LoaderCircle className="spin" size={18} />
          Loading reviewers…
        </div>
      ) : reviewerPoolQuery.error ? (
        <div className="api-error api-error-banner" role="alert">
          <CircleAlert size={16} />
          <span>Could not load the reviewer list.</span>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => void reviewerPoolQuery.refetch()}
          >
            <RotateCw size={14} /> Retry
          </button>
        </div>
      ) : !pool.length ? (
        <p className="live-empty">No reviewers are available to assign.</p>
      ) : (
        <div className="coordinator-form-grid">
          <fieldset
            className="coordinator-fieldset"
            aria-describedby={errors.reviewerIds ? 'reviewerIds-error' : undefined}
          >
            <legend>Choose reviewers</legend>
            <div className="coordinator-reviewer-options">
              {pool.map((reviewer) => {
                const alreadyAssigned = assignedIds.includes(reviewer.id);
                return (
                  <label
                    key={reviewer.id}
                    className={`coordinator-reviewer-option ${alreadyAssigned ? 'is-assigned' : ''}`}
                  >
                    <input
                      type="checkbox"
                      value={reviewer.id}
                      disabled={alreadyAssigned}
                      {...register('reviewerIds')}
                    />
                    <span>
                      {reviewer.name}
                      <small>
                        {reviewer.department}
                        {alreadyAssigned ? ' · already assigned' : ''}
                      </small>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.reviewerIds && (
              <p className="coordinator-error" id="reviewerIds-error" role="alert">
                <CircleAlert size={14} aria-hidden="true" />
                {errors.reviewerIds.message}
              </p>
            )}
          </fieldset>

          <div className="coordinator-field">
            <label htmlFor="assignment-mode">Review mode</label>
            <select
              id="assignment-mode"
              aria-invalid={Boolean(errors.mode)}
              aria-describedby={errors.mode ? 'mode-error' : undefined}
              {...register('mode')}
            >
              <option value="parallel">Parallel — all reviewers at once</option>
              <option value="sequential">Sequential — one after another</option>
            </select>
            {errors.mode && (
              <p className="coordinator-error" id="mode-error" role="alert">
                <CircleAlert size={14} aria-hidden="true" />
                {errors.mode.message}
              </p>
            )}

            <label htmlFor="assignment-required">Reviews required</label>
            <input
              id="assignment-required"
              type="number"
              min="1"
              step="1"
              aria-invalid={Boolean(errors.requiredReviews)}
              aria-describedby={errors.requiredReviews ? 'required-error' : undefined}
              {...register('requiredReviews')}
            />
            {errors.requiredReviews && (
              <p className="coordinator-error" id="required-error" role="alert">
                <CircleAlert size={14} aria-hidden="true" />
                {errors.requiredReviews.message}
              </p>
            )}

            <label htmlFor="assignment-due">Due date</label>
            <input
              id="assignment-due"
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
        </div>
      )}

      {mode === 'sequential' && selectedIds.length > 0 && (
        <>
          <p className="form-section-title" style={{ marginTop: 16 }}>
            Step order
          </p>
          <ol className="coordinator-step-order">
            {selectedIds.map((reviewerId, index) => (
              <li key={reviewerId}>
                <span className="coordinator-step-badge">
                  step {index + 1}/{selectedIds.length}
                </span>
                {nameFor(reviewerId)}
                <span className="coordinator-step-actions">
                  <button
                    type="button"
                    className="coordinator-icon-button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Move ${nameFor(reviewerId)} earlier`}
                  >
                    <ArrowUp size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="coordinator-icon-button"
                    disabled={index === selectedIds.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Move ${nameFor(reviewerId)} later`}
                  >
                    <ArrowDown size={15} aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="coordinator-form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || assignReviewers.isPending || !pool.length}
          aria-busy={assignReviewers.isPending}
        >
          {assignReviewers.isPending ? (
            <LoaderCircle className="spin" size={15} aria-hidden="true" />
          ) : (
            <UserPlus size={15} aria-hidden="true" />
          )}
          Assign reviewer
        </button>
        {successMessage && (
          <span className="coordinator-success" role="status">
            <CheckCircle2 size={14} aria-hidden="true" />
            {successMessage}
          </span>
        )}
      </div>

      {assignReviewers.isError && (
        <p className="coordinator-error" role="alert" style={{ marginTop: 10 }}>
          <CircleAlert size={14} aria-hidden="true" />
          {assignReviewers.error instanceof Error
            ? assignReviewers.error.message
            : 'Could not assign these reviewers.'}
        </p>
      )}
    </form>
  );
}

function ProgressLine({ panel, overdue }) {
  return (
    <p className="coordinator-progress" role="status">
      <b>{reviewProgressLabel(panel)}</b>
      {panel.requiredReviews > 0 && (
        <span className="coordinator-progress-meta">
          · Mode: {panel.mode === 'sequential' ? 'Sequential' : 'Parallel'}
          {panel.dueDate ? ` · Due ${formatDate(panel.dueDate)}` : ''}
        </span>
      )}
      {overdue && (
        <span className="coordinator-overdue">
          <Clock size={12} aria-hidden="true" />
          Overdue
        </span>
      )}
    </p>
  );
}

function NextStepBox({ brief, nextStep }) {
  if (nextStep.kind === 'decision') {
    return (
      <div className="coordinator-next-step">
        <h3>Next step</h3>
        <p>Record the coordinator decision for this brief.</p>
        <div className="coordinator-next-step-actions">
          {nextStep.outcomes.map((outcome) => {
            const className = `btn ${outcome.id === 'confirmed' ? 'btn-primary' : 'btn-outline'}`;
            // Locked outcomes stay visible but disabled with a reason, per the
            // team standard for restricted actions.
            return nextStep.unlocked ? (
              <Link
                key={outcome.id}
                className={className}
                to={`/coordinator/briefs/${brief.id}/decision?outcome=${outcome.id}`}
              >
                {outcome.label}
              </Link>
            ) : (
              <button
                key={outcome.id}
                type="button"
                className={className}
                disabled
                title={nextStep.lockedReason}
              >
                {outcome.label}
              </button>
            );
          })}
        </div>
        {!nextStep.unlocked && (
          <p className="coordinator-locked-reason" role="note">
            <CircleAlert size={14} aria-hidden="true" />
            {nextStep.lockedReason}
          </p>
        )}
      </div>
    );
  }

  if (nextStep.kind === 'assign') {
    return (
      <div className="coordinator-next-step">
        <h3>Next step</h3>
        <p>{nextStep.note}</p>
        <p className="coordinator-outcome-recorded">
          Assigning the first reviewer moves this brief to {formatStage(nextStep.toStage)}.
        </p>
      </div>
    );
  }

  if (nextStep.kind === 'receive-version') {
    return (
      <div className="coordinator-next-step">
        <h3>Next step</h3>
        <p>{nextStep.note}</p>
        <div className="coordinator-next-step-actions">
          <Link className="btn btn-primary" to={`/coordinator/briefs/${brief.id}/versions`}>
            Receive improved version
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="coordinator-next-step">
      <h3>Next step</h3>
      <p>{nextStep.note}</p>
      {brief.outcome && (
        <p className="coordinator-outcome-recorded">
          Outcome: {formatStage(brief.outcome.status)}
          {brief.outcome.projectCode && (
            <span className="coordinator-project-code">{brief.outcome.projectCode}</span>
          )}
          {brief.outcome.reason && <span>· {brief.outcome.reason}</span>}
        </p>
      )}
    </div>
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
