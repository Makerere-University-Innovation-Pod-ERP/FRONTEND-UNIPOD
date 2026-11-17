import { useState } from 'react';
import { Activity, Calendar, User, X } from 'lucide-react';
import { useMentorshipFollowUps, useUpdateMentorshipFollowUp } from '@/hooks/useTraining';

const STATUS_OPTIONS = ['Pending Follow-up', 'Action Required', 'Scheduled', 'Completed'];

export function StudentsFollowedUpPage({ token }) {
  const { data: followUps = [] } = useMentorshipFollowUps(token);
  const updateFollowUp = useUpdateMentorshipFollowUp(token);
  const [selected, setSelected] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');

  const pendingCount = followUps.filter((item) => item.status === 'Pending Follow-up' || item.status === 'Action Required').length;
  const completedCount = followUps.filter((item) => item.status === 'Completed').length;

  function openFollowUp(item) {
    setSelected(item);
    setNotesDraft(item.notes ?? '');
  }

  async function saveStatus(status) {
    if (!selected) return;
    const updated = await updateFollowUp.mutateAsync({ id: selected.id, status, notes: notesDraft });
    setSelected(updated);
  }

  async function saveNotes() {
    if (!selected) return;
    const updated = await updateFollowUp.mutateAsync({ id: selected.id, notes: notesDraft });
    setSelected(updated);
  }

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">OPERATIONS</p>
          <h1>Students Followed Up</h1>
          <p>Mentorship follow-ups for students supported through the Innovation Pod.</p>
        </div>
      </div>

      <section className="live-metrics tx-metrics" aria-label="Mentorship KPI metrics">
        <article className="live-metric"><p>NEEDS FOLLOW-UP <Activity size={14} /></p><strong>{pendingCount}</strong></article>
        <article className="live-metric"><p>COMPLETED <User size={14} /></p><strong>{completedCount}</strong></article>
        <article className="live-metric"><p>TOTAL TRACKED <Calendar size={14} /></p><strong>{followUps.length}</strong></article>
      </section>

      <section className="live-panel tx-table-panel">
        <div className="live-table-wrap">
          <table className="live-table">
            <thead>
              <tr>
                <th>MENTEE</th>
                <th>MENTOR</th>
                <th>FOCUS</th>
                <th>NEXT FOLLOW-UP</th>
                <th>STATUS</th>
                <th>PRIORITY</th>
              </tr>
            </thead>
            <tbody>
              {followUps.map((item) => (
                <tr key={item.id} data-testid={`followup-row-${item.id}`} onClick={() => openFollowUp(item)}>
                  <td><b className="tx-strong">{item.mentee}</b></td>
                  <td>{item.mentor}</td>
                  <td>{item.focus}</td>
                  <td>{item.scheduledDate}</td>
                  <td><span className={`tx-status ${item.status === 'Completed' ? 'tx-positive' : item.status === 'Action Required' ? 'tx-danger' : 'tx-attention'}`}><i aria-hidden="true" />{item.status}</span></td>
                  <td>{item.priority}</td>
                </tr>
              ))}
              {followUps.length === 0 && (
                <tr><td colSpan={6} className="live-empty">No mentorship follow-ups recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div role="dialog" aria-modal="true" className="ops-modal-overlay" onClick={() => setSelected(null)}>
          <div className="ops-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ops-modal-head">
              <div>
                <span className="ops-modal-eyebrow">Mentorship Follow-up</span>
                <h3>{selected.title}</h3>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="ops-modal-close" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="ops-modal-facts">
              <div className="ops-modal-fact"><User size={14} color="var(--muted)" /><span><strong>Mentee:</strong> {selected.mentee}</span></div>
              <div className="ops-modal-fact"><User size={14} color="var(--muted)" /><span><strong>Mentor:</strong> {selected.mentor}</span></div>
              <div className="ops-modal-fact"><Calendar size={14} color="var(--muted)" /><span><strong>Next follow-up:</strong> {selected.scheduledDate}</span></div>
            </div>

            <p className="ops-modal-desc">{selected.focus}</p>

            <div className="tx-field">
              <span className="tx-label">Status</span>
              <div className="tx-segments">
                {STATUS_OPTIONS.map((status) => (
                  <label key={status} className={`tx-segment ${selected.status === status ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="follow-up-status"
                      checked={selected.status === status}
                      onChange={() => saveStatus(status)}
                      disabled={updateFollowUp.isPending}
                    />
                    <i aria-hidden="true" />{status}
                  </label>
                ))}
              </div>
            </div>

            <div className="tx-field">
              <label className="tx-label" htmlFor="follow-up-notes">Notes</label>
              <textarea
                id="follow-up-notes"
                rows={3}
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
              />
            </div>

            <div className="ops-modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={saveNotes} disabled={updateFollowUp.isPending}>
                {updateFollowUp.isPending ? 'Saving…' : 'Save notes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
