import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { TrainingMentorshipPage } from '../multimedia/TrainingMentorshipPage';

export function SafetyCoursePage({ token, roles = [], canReadTraining = true }) {
  const location = useLocation();
  const bookingReturn = location.state?.returnToMachineBooking
    ? location.state.bookingDraft
    : null;

  if (!canReadTraining) {
    return (
      <div className="live-page page-enter cnc-safety-page">
        <section className="live-panel cnc-safety-access-block" role="status">
          <span className="cnc-safety-access-block__icon"><ShieldCheck size={24} aria-hidden="true" /></span>
          <div>
            <p className="eyebrow">STAFF ASSISTANCE REQUIRED</p>
            <h1>Ask your coordinator about CN5</h1>
            <p>Your current role cannot view training records. An administrator or department coordinator can arrange a safety session or verify a pass you already earned.</p>
            {bookingReturn && (
              <Link
                className="btn btn-primary"
                to="/cnc/machines/book"
                state={{ bookingDraft: bookingReturn, returnedFromSafetyCourse: true }}
              >
                Return to machine booking
              </Link>
            )}
          </div>
        </section>
      </div>
    );
  }

  return <TrainingMentorshipPage token={token} roles={roles} variant="safety" bookingReturn={bookingReturn} />;
}
