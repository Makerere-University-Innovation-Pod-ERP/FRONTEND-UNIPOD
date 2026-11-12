import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/presentation';

export function BriefSubmittedPage() {
  const location = useLocation();
  const submission = location.state?.submission;

  if (!submission) {
    return (
      <div className="live-page page-enter">
        <section className="live-panel">
          <p className="eyebrow">NOT FOUND</p>
          <h1>Nothing to confirm.</h1>
          <p>This confirmation screen only appears right after submitting a brief.</p>
          <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
            <Link className="btn btn-primary" to="/submissions/new">Submit a brief</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="live-page page-enter">
      <section className="live-panel">
        <p className="eyebrow">BRIEF SUBMITTED</p>
        <h1><CheckCircle2 size={28} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--green)' }} />Thanks — your brief is in.</h1>
        <div className="case-fields" style={{ marginTop: 16 }}>
          <div className="case-field"><span>Tracking reference</span><p>{submission.code || submission.id}</p></div>
          <div className="case-field"><span>Submitted</span><p>{formatDate(submission.createdAt)}</p></div>
          <div className="case-field"><span>What happens next</span><p>Reception will check your brief for completeness, then it moves into fact-finding. You'll see status updates on your brief's page as it progresses — no action is needed from you right now.</p></div>
        </div>
        <div className="form-actions" style={{ justifyContent: 'flex-start', marginTop: 10 }}>
          <Link className="btn btn-primary" to={`/submissions/${submission.id}`}>View my brief</Link>
          <Link className="btn btn-outline" to="/my-submissions">Back to my submissions</Link>
        </div>
      </section>
    </div>
  );
}
