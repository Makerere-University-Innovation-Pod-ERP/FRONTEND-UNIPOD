import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/presentation';

/**
 * Shown right after a walk-in brief is created. It makes the acceptance rule visible:
 * the walk-in is the OWNER, and the receptionist is shown as ASSISTED BY.
 */
export function WalkInSubmittedPage({ staffName }) {
  const location = useLocation();
  const submission = location.state?.submission;
  const onBehalfOf = location.state?.onBehalfOf;

  if (!submission || !onBehalfOf) {
    return (
      <div className="live-page page-enter">
        <section className="live-panel">
          <p className="eyebrow">NOTHING TO SHOW</p>
          <h1>No walk-in brief was just submitted.</h1>
          <Link className="btn btn-primary" to="/reception/walk-in">Start a walk-in submission</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="live-page page-enter">
      <section className="live-panel" role="status">
        <p className="eyebrow">WALK-IN BRIEF SUBMITTED</p>
        <h1><CheckCircle2 size={26} /> The brief is in.</h1>
        <div className="case-fields">
          <div className="case-field"><span>Tracking reference</span><p>{submission.code || submission.id}</p></div>
          <div className="case-field"><span>Title</span><p>{submission.title}</p></div>
          <div className="case-field"><span>Owner</span><p>{onBehalfOf.name} ({onBehalfOf.email})</p></div>
          <div className="case-field"><span>Assisted by</span><p>{staffName || 'Reception'}</p></div>
          <div className="case-field"><span>Submitted</span><p>{formatDate(submission.createdAt)}</p></div>
        </div>
        <div className="action-row">
          <Link className="btn btn-primary" to="/reception/walk-in">Help another walk-in</Link>
          <Link className="btn btn-outline" to="/reception/home">Back to reception home</Link>
        </div>
      </section>
    </div>
  );
}
