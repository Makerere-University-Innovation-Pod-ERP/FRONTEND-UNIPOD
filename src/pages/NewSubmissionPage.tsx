import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { ApiError, backendApi } from '@/services/backend-api';

export function NewSubmissionPage({
  token,
  onUnauthorized,
}: {
  token: string;
  onUnauthorized: () => void;
}) {
  const [, navigate] = useLocation();
  const [category, setCategory] = useState<'student' | 'general'>('student');
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [problemAddressed, setProblemAddressed] = useState('');
  const [submitterId, setSubmitterId] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [programme, setProgramme] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [recommendationLetterStatus, setRecommendationLetterStatus] = useState('submitted');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const body: Record<string, unknown> = {
      category,
      title: title.trim(),
      purpose: purpose.trim(),
      problemAddressed: problemAddressed.trim(),
      ...(submitterId.trim() ? { submitterId: submitterId.trim() } : {}),
      ...(category === 'student'
        ? {
            studentNumber: studentNumber.trim(),
            programme: programme.trim(),
            supervisor: supervisor.trim(),
            recommendationLetterStatus,
          }
        : {}),
    };

    try {
      const created = await backendApi.createSubmission(token, body);
      navigate(`/submissions/${created.id}`);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else setError(reason instanceof Error ? reason.message : 'Could not create the submission.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="live-page page-enter">
      <Link href="/submissions" className="back-link"><ArrowLeft size={15} />Back to submissions</Link>
      <div className="live-page-heading compact-heading"><div><p className="eyebrow">INTAKE · NEW CASE</p><h1>Register an idea.</h1><p>Create a draft record in the live Innovation Hub database.</p></div></div>
      <form className="live-panel create-form" onSubmit={submit}>
        <div className="form-section">
          <p className="form-section-title">01 <span>Submission type</span></p>
          <div className="category-options">
            <label className={`category-option ${category === 'student' ? 'selected' : ''}`}>
              <input type="radio" name="category" value="student" checked={category === 'student'} onChange={() => setCategory('student')} />
              <span><b>Student project</b><small>Student-led work submitted through a programme or supervisor.</small></span>
            </label>
            <label className={`category-option ${category === 'general' ? 'selected' : ''}`}>
              <input type="radio" name="category" value="general" checked={category === 'general'} onChange={() => setCategory('general')} />
              <span><b>General innovation</b><small>Ideas and projects from the wider university community.</small></span>
            </label>
          </div>
        </div>
        <div className="form-section">
          <p className="form-section-title">02 <span>Project information</span></p>
          <label className="form-field">Project title<input required maxLength={240} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give the project a clear, concise title" /></label>
          <label className="form-field">Purpose<textarea required maxLength={5000} rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="What does this project aim to achieve?" /></label>
          <label className="form-field">Problem addressed<textarea required maxLength={5000} rows={3} value={problemAddressed} onChange={(event) => setProblemAddressed(event.target.value)} placeholder="What problem or need does it respond to?" /></label>
          <label className="form-field">Submitter ID <span className="field-note">Optional; use an existing account identifier when linking an account.</span><input maxLength={255} value={submitterId} onChange={(event) => setSubmitterId(event.target.value)} /></label>
        </div>
        {category === 'student' && <div className="form-section">
          <p className="form-section-title">03 <span>Student details</span></p>
          <div className="form-grid">
            <label className="form-field">Student number<input required maxLength={80} value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} /></label>
            <label className="form-field">Programme<input required maxLength={200} value={programme} onChange={(event) => setProgramme(event.target.value)} /></label>
          </div>
          <div className="form-grid">
            <label className="form-field">Supervisor<input required maxLength={255} value={supervisor} onChange={(event) => setSupervisor(event.target.value)} /></label>
            <label className="form-field">Recommendation letter status<select value={recommendationLetterStatus} onChange={(event) => setRecommendationLetterStatus(event.target.value)}><option value="submitted">Submitted</option><option value="verified">Verified</option><option value="one_file">One file</option><option value="not_required">Not required</option></select></label>
          </div>
        </div>}
        {error && <div className="api-error api-error-banner" role="alert">{error}</div>}
        <div className="form-actions"><Link href="/submissions" className="btn btn-outline">Cancel</Link><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={15} className="spin" /> : null}{busy ? 'Saving draft…' : 'Create draft'}{!busy && <ArrowRight size={15} />}</button></div>
      </form>
    </div>
  );
}
