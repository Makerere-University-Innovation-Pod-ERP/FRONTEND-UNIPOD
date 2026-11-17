import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  CircleSlash,
  Dot,
  FileText,
  History,
  LoaderCircle,
  RotateCw,
  Save,
} from 'lucide-react';
import { useRecordVersion, useVersionsView } from '@/hooks/useCoordinator';
import { ApiError } from '@/services/api-client';
import { formatDate, formatStage } from '@/lib/presentation';
import './coordinator.css';

/**
 * Innovation Coordinator — receive improved version (Assignment 2, page 5).
 *
 * Records the applicant's improved version, compares any two versions side by
 * side, and returns the brief to review. Nothing is ever overwritten: versions
 * are appended, and the review round that judged the previous version is
 * archived against that version before a fresh round begins.
 */

const DECISION_PRESENTATION = {
  pending: { label: 'Pending', Icon: CircleDashed },
  recommended: { label: 'Recommended', Icon: CheckCircle2 },
  changes_needed: { label: 'Changes needed', Icon: CircleAlert },
  not_recommended: { label: 'Not recommended', Icon: CircleSlash },
};

const COMPARED_FIELDS = [
  { key: 'summary', label: 'Summary' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'problemAddressed', label: 'Problem addressed' },
];

const recordVersionSchema = z.object({
  summaryOfChanges: z
    .string()
    .trim()
    .min(10, 'Say what changed in this version — at least 10 characters.')
    .max(2000, 'Keep this under 2000 characters.'),
  addressedChanges: z
    .array(z.string().trim())
    .transform((items) => items.filter(Boolean))
    .pipe(z.array(z.string()).min(1, 'Tick at least one change this version addresses.')),
  revisedSummary: z.string().trim().max(2000, 'Keep the summary under 2000 characters.'),
  resolvesRequest: z.boolean(),
});

export function CoordinatorVersionsPage({ token, onUnauthorized }) {
  const { id } = useParams();
  const query = useVersionsView(token, id);
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
          <p className="eyebrow">COORDINATOR · IMPROVED VERSION</p>
          <h1>Versions and resubmission.</h1>
          <p>Compare what changed, record the improved version, and send it back to review.</p>
        </div>
        <div className="heading-actions">
          <Link className="btn btn-outline" to={id ? `/coordinator/briefs/${id}/changes` : '/coordinator/improvements'}>
            <ArrowLeft size={15} aria-hidden="true" />
            Back to the request
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="live-loading">
          <LoaderCircle className="spin" size={22} />
          Loading the version history…
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
          <span>{error instanceof Error ? error.message : 'Could not load the versions.'}</span>
          <button type="button" className="btn btn-outline" onClick={() => void query.refetch()}>
            <RotateCw size={14} /> Retry
          </button>
        </div>
      )}

      {data && <VersionsView token={token} id={id} view={data} />}
    </div>
  );
}

function VersionsView({ token, id, view }) {
  const { brief, versions, rounds, refinement, canRecordVersion, blockedReason } = view;
  // Lifted above RecordVersionForm: recording a version makes the brief's
  // refetched data report `canRecordVersion: false` (it's back under
  // review), which would otherwise swap this component straight to the
  // "Nothing to record right now" branch before the form's own local
  // success state ever gets a chance to render.
  const [justRecorded, setJustRecorded] = useState(null);

  return (
    <>
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
        <div className="coordinator-field-grid">
          <Field label="Applicant" value={brief.submitterName ?? 'Not recorded'} />
          <Field label="Current version" value={`v${brief.versions}`} />
          <Field label="Versions on record" value={`${versions.length}`} />
          <Field
            label="Improvement request"
            value={
              refinement
                ? refinement.status === 'resolved'
                  ? 'Resolved'
                  : 'Open'
                : 'None written'
            }
          />
        </div>
      </section>

      <CompareVersions versions={versions} />

      <VersionHistory versions={versions} rounds={rounds} />

      {justRecorded ? (
        <RecordedVersion saved={justRecorded} />
      ) : canRecordVersion ? (
        <RecordVersionForm token={token} id={id} refinement={refinement} onSaved={setJustRecorded} />
      ) : (
        <section className="live-panel">
          <div className="live-panel-heading">
            <div>
              <p className="eyebrow">RECORD AN IMPROVED VERSION</p>
              <h2>Nothing to record right now</h2>
            </div>
          </div>
          <p className="coordinator-locked-reason" role="note">
            <CircleAlert size={14} aria-hidden="true" />
            {blockedReason}
          </p>
        </section>
      )}

      <section className="live-panel">
        <p className="form-section-title">Actions</p>
        <div className="coordinator-next-step-actions">
          <Link className="btn btn-outline" to="/coordinator/improvements">
            <ArrowLeft size={15} aria-hidden="true" />
            Back to Ideas Being Improved
          </Link>
          <Link className="btn btn-outline" to={`/coordinator/briefs/${brief.id}/changes`}>
            Open the improvement request
          </Link>
          <Link className="btn btn-outline" to={`/submissions/${brief.id}`}>
            View submission
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
          <Link className="btn btn-primary" to={`/coordinator/briefs/${brief.id}`}>
            Open the brief
          </Link>
        </div>
      </section>
    </>
  );
}

function CompareVersions({ versions }) {
  const latest = versions[versions.length - 1];
  const previous = versions[versions.length - 2];
  const [leftVersion, setLeftVersion] = useState(previous?.version ?? latest?.version ?? 1);
  const [rightVersion, setRightVersion] = useState(latest?.version ?? 1);

  if (versions.length < 2) {
    return (
      <section className="live-panel">
        <div className="live-panel-heading">
          <div>
            <p className="eyebrow">COMPARE</p>
            <h2>Nothing to compare yet</h2>
          </div>
        </div>
        <p className="live-empty">
          Only version 1 is on record. A comparison appears once an improved version is received.
        </p>
      </section>
    );
  }

  const left = versions.find((item) => item.version === Number(leftVersion)) ?? previous;
  const right = versions.find((item) => item.version === Number(rightVersion)) ?? latest;

  return (
    <section className="live-panel">
      <div className="live-panel-heading">
        <div>
          <p className="eyebrow">COMPARE</p>
          <h2>What changed</h2>
        </div>
      </div>

      <div className="coordinator-compare-pickers">
        <div className="coordinator-field">
          <label htmlFor="compare-left">Earlier version</label>
          <select
            id="compare-left"
            value={leftVersion}
            onChange={(event) => setLeftVersion(event.target.value)}
          >
            {versions.map((item) => (
              <option key={item.version} value={item.version}>
                v{item.version} · {formatDate(item.submittedAt)}
              </option>
            ))}
          </select>
        </div>
        <div className="coordinator-field">
          <label htmlFor="compare-right">Later version</label>
          <select
            id="compare-right"
            value={rightVersion}
            onChange={(event) => setRightVersion(event.target.value)}
          >
            {versions.map((item) => (
              <option key={item.version} value={item.version}>
                v{item.version} · {formatDate(item.submittedAt)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="coordinator-compare">
        <div className="coordinator-compare-column">
          <h3>v{left.version} — {formatDate(left.submittedAt)}</h3>
        </div>
        <div className="coordinator-compare-column">
          <h3>v{right.version} — {formatDate(right.submittedAt)}</h3>
        </div>

        {COMPARED_FIELDS.map((field) => {
          const changed = left[field.key] !== right[field.key];
          return (
            <div className="coordinator-compare-field" key={field.key}>
              <p className="coordinator-compare-label">
                {field.label}
                {changed ? (
                  <span className="coordinator-changed-flag">
                    <Dot size={14} aria-hidden="true" />
                    Changed
                  </span>
                ) : (
                  <span className="coordinator-same-flag">Unchanged</span>
                )}
              </p>
              <div className="coordinator-compare-pair">
                <div className={changed ? 'coordinator-compare-old' : ''}>{left[field.key]}</div>
                <div className={changed ? 'coordinator-compare-new' : ''}>{right[field.key]}</div>
              </div>
            </div>
          );
        })}

        <div className="coordinator-compare-field">
          <p className="coordinator-compare-label">Documents</p>
          <div className="coordinator-compare-pair">
            <div>{left.documents.length ? left.documents.join(', ') : 'None'}</div>
            <div>{right.documents.length ? right.documents.join(', ') : 'None'}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function VersionHistory({ versions, rounds }) {
  const roundsByVersion = {};
  for (const round of rounds) {
    (roundsByVersion[round.version] ??= []).push(round);
  }

  return (
    <section className="live-panel">
      <div className="live-panel-heading">
        <div>
          <p className="eyebrow">VERSION HISTORY</p>
          <h2>Everything on record</h2>
        </div>
        <span className="coordinator-progress-meta">
          <History size={13} aria-hidden="true" /> Append-only
        </span>
      </div>

      <ol className="coordinator-version-list">
        {[...versions].reverse().map((version) => (
          <li className="coordinator-version" key={version.version}>
            <div className="coordinator-version-head">
              <span className="coordinator-version-badge">v{version.version}</span>
              <span className="coordinator-assignment-name">
                <b>{formatDate(version.submittedAt)}</b>
                <small>{version.submittedBy ?? 'Submitter not recorded'}</small>
              </span>
            </div>

            {version.summaryOfChanges ? (
              <blockquote className="coordinator-review-comment">
                {version.summaryOfChanges}
              </blockquote>
            ) : (
              <p className="coordinator-review-pending">Original submission.</p>
            )}

            {version.addressedChanges.length > 0 && (
              <ul className="coordinator-change-list" style={{ marginTop: 12 }}>
                {version.addressedChanges.map((change) => (
                  <li key={change}>
                    <CheckCircle2 size={14} aria-hidden="true" />
                    {change}
                  </li>
                ))}
              </ul>
            )}

            {version.documents.length > 0 && (
              <p className="coordinator-version-docs">
                <FileText size={13} aria-hidden="true" />
                {version.documents.join(', ')}
              </p>
            )}

            {(roundsByVersion[version.version] ?? []).map((round) => (
              <div className="coordinator-archived-round" key={round.round}>
                <p className="coordinator-compare-label">
                  Review round {round.round} · closed {formatDate(round.closedAt)} ·{' '}
                  {round.completedReviews} of {round.requiredReviews} reviews
                </p>
                <ul className="coordinator-review-list">
                  {round.reviews.map((review) => {
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
                              {review.decidedAt ? ` · ${formatDate(review.decidedAt)}` : ''}
                            </small>
                          </span>
                          <span className={`decision-badge decision-${review.decisionStatus}`}>
                            <Icon size={12} aria-hidden="true" />
                            {presentation.label}
                          </span>
                        </div>
                        {review.comment && (
                          <blockquote className="coordinator-review-comment">
                            {review.comment}
                          </blockquote>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </li>
        ))}
      </ol>

      <p className="live-note" style={{ marginTop: 16 }}>
        Versions and the reviews recorded against them are kept exactly as they were. A new version
        starts a fresh review round rather than replacing the previous one.
      </p>
    </section>
  );
}

function RecordedVersion({ saved }) {
  return (
    <section className="live-panel">
      <div className="live-panel-heading">
        <div>
          <p className="eyebrow">IMPROVED VERSION RECORDED</p>
          <h2>v{saved.brief.versions} is on record</h2>
        </div>
        <span className="stage-pill">{formatStage(saved.brief.stage)}</span>
      </div>
      <p className="coordinator-success" role="status">
        <CheckCircle2 size={15} aria-hidden="true" />
        The brief has returned to review. The previous round is archived against the earlier
        version.
      </p>
      <p className="coordinator-locked-reason" style={{ marginTop: 12 }} role="note">
        <CircleAlert size={14} aria-hidden="true" />
        This version is awaiting reviewer assignment — assign reviewers on the brief page.
      </p>
      <div className="coordinator-next-step-actions" style={{ marginTop: 12 }}>
        <Link className="btn btn-primary" to={`/coordinator/briefs/${saved.brief.id}`}>
          Assign reviewers
        </Link>
      </div>
    </section>
  );
}

function RecordVersionForm({ token, id, refinement, onSaved }) {
  const recordVersion = useRecordVersion(token, id);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(recordVersionSchema),
    defaultValues: {
      summaryOfChanges: '',
      addressedChanges: [],
      revisedSummary: '',
      resolvesRequest: true,
    },
  });

  const onSubmit = (values) =>
    recordVersion
      .mutateAsync(values)
      .then((view) => onSaved(view))
      .catch(() => {
        // Surfaced below; values are kept so it can be resubmitted.
      });

  return (
    <form className="live-panel" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="live-panel-heading">
        <div>
          <p className="eyebrow">RECORD AN IMPROVED VERSION</p>
          <h2>Record resubmission</h2>
        </div>
      </div>
      <p className="coordinator-hint">
        Recording a version appends it to the history and returns the brief to review. Earlier
        versions and the reviews made against them are not changed.
      </p>

      <div className="coordinator-field" style={{ marginTop: 16 }}>
        <label htmlFor="version-summary">What changed in this version (required)</label>
        <textarea
          id="version-summary"
          rows={4}
          aria-required="true"
          aria-invalid={Boolean(errors.summaryOfChanges)}
          aria-describedby={errors.summaryOfChanges ? 'version-summary-error' : undefined}
          placeholder="Summarise what the applicant changed…"
          {...register('summaryOfChanges')}
        />
        {errors.summaryOfChanges && (
          <p className="coordinator-error" id="version-summary-error" role="alert">
            <CircleAlert size={14} aria-hidden="true" />
            {errors.summaryOfChanges.message}
          </p>
        )}
      </div>

      <fieldset
        className="coordinator-fieldset"
        style={{ marginTop: 20 }}
        aria-describedby={errors.addressedChanges ? 'addressed-error' : undefined}
      >
        <legend>Changes this version addresses</legend>
        <div className="coordinator-reviewer-options">
          {(refinement?.changes ?? []).map((change) => (
            <label className="coordinator-reviewer-option" key={change}>
              <input type="checkbox" value={change} {...register('addressedChanges')} />
              <span>{change}</span>
            </label>
          ))}
        </div>
        {errors.addressedChanges && (
          <p className="coordinator-error" id="addressed-error" role="alert">
            <CircleAlert size={14} aria-hidden="true" />
            {errors.addressedChanges.message}
          </p>
        )}
      </fieldset>

      <div className="coordinator-field" style={{ marginTop: 20 }}>
        <label htmlFor="version-revised">Revised summary (optional)</label>
        <textarea
          id="version-revised"
          rows={3}
          aria-describedby="version-revised-hint"
          placeholder="Paste the updated summary, if the applicant rewrote it…"
          {...register('revisedSummary')}
        />
        <p className="coordinator-hint" id="version-revised-hint">
          Leave blank to carry the previous summary forward. If filled in, the comparison above
          will show the difference.
        </p>
      </div>

      <label className="coordinator-reviewer-option" style={{ marginTop: 20 }}>
        <input type="checkbox" {...register('resolvesRequest')} />
        <span>
          Mark the improvement request resolved
          <small>Leave unticked if more is still outstanding from the applicant.</small>
        </span>
      </label>

      <div className="coordinator-form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || recordVersion.isPending}
          aria-busy={recordVersion.isPending}
        >
          {recordVersion.isPending ? (
            <LoaderCircle className="spin" size={15} aria-hidden="true" />
          ) : (
            <Save size={15} aria-hidden="true" />
          )}
          Record resubmission
        </button>
      </div>

      {recordVersion.isError && (
        <p className="coordinator-error" role="alert" style={{ marginTop: 10 }}>
          <CircleAlert size={14} aria-hidden="true" />
          {recordVersion.error instanceof Error
            ? recordVersion.error.message
            : 'Could not record this version.'}
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
