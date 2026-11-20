import { useState } from 'react';
import { Activity, Calendar, Plus, User, X } from 'lucide-react';
import { useCreateFollowUp, useMentorshipFollowUps, useUpdateMentorshipFollowUp } from '@/hooks/useTraining';
import { ErrorBanner, Loading } from './shared';

const STATUS_OPTIONS = [
  { value: 'PENDING_FOLLOW_UP', label: 'Pending Follow-up' },
  { value: 'ACTION_REQUIRED', label: 'Action Required' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'COMPLETED', label: 'Completed' },
];
const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((option) => [option.value, option.label]));
const PRIORITY_LABEL = { NORMAL: 'Normal', HIGH: 'High', URGENT: 'Urgent' };
const NEW_FOLLOW_UP_DEFAULTS = { title: '', mentee: '', mentor: '', scheduledDate: '', focus: '', priority: 'NORMAL', notes: '' };

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusTone(status) {
  if (status === 'COMPLETED') return 'tx-positive';
  if (status === 'ACTION_REQUIRED') return 'tx-danger';
  return 'tx-attention';
}

export function StudentsFollowedUpPage({ token }) {
  const followUpsQuery = useMentorshipFollowUps(token);
  const updateFollowUp = useUpdateMentorshipFollowUp(token);
  const createFollowUp = useCreateFollowUp(token);
  const [selectedId, setSelectedId] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState(NEW_FOLLOW_UP_DEFAULTS);
  const [createError, setCreateError] = useState('');

  const followUps = followUpsQuery.data ?? [];
  const selected = followUps.find((item) => item.id === selectedId) ?? null;
  const pendingCount = followUps.filter((item) => item.status === 'PENDING_FOLLOW_UP' || item.status === 'ACTION_REQUIRED').length;
  const completedCount = followUps.filter((item) => item.status === 'COMPLETED').length;

  function openFollowUp(item) {
    setSelectedId(item.id);
    setNotesDraft(item.notes ?? '');
    setDialogError('');
  }

  async function save(status) {
    if (!selected) return;
    setDialogError('');
    try {
      await updateFollowUp.mutateAsync({ id: selected.id, status, notes: notesDraft, version: selected.version });
    } catch (reason) {
      setDialogError(reason instanceof Error ? reason.message : 'Could not save the follow-up.');
    }
  }

  function setNewField(field) {
    return (event) => setNewFollowUp((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function submitNewFollowUp(event) {
    event.preventDefault();
    setCreateError('');
    const { title, mentee, mentor, scheduledDate, focus } = newFollowUp;
    if (![title, mentee, mentor, scheduledDate, focus].every((value) => value.trim())) {
      setCreateError('Title, mentee, mentor, follow-up date and focus are all required.');
      return;
    }
    try {
      await createFollowUp.mutateAsync({
        title: title.trim(),
        mentee: mentee.trim(),
        mentor: mentor.trim(),
        scheduledDate,
        focus: focus.trim(),
        priority: newFollowUp.priority,
        ...(newFollowUp.notes.trim() ? { notes: newFollowUp.notes.trim() } : {}),
      });
      setNewFollowUp(NEW_FOLLOW_UP_DEFAULTS);
      setShowCreateForm(false);
    } catch (reason) {
      setCreateError(reason instanceof Error ? reason.message : 'Could not add the follow-up.');
    }
  }

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">OPERATIONS</p>
          <h1>Students Followed Up</h1>
          <p>Mentorship follow-ups for students supported through the Innovation Pod.</p>
        </div>
        <div className="heading-actions">
          <button type="button" className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
            <Plus size={15} />Add follow-up
          </button>
        </div>
      </div>

      <ErrorBanner error={followUpsQuery.error} fallback="Could not load mentorship follow-ups." />

      <section className="live-metrics tx-metrics" aria-label="Mentorship KPI metrics">
        <article className="live-metric"><p>NEEDS FOLLOW-UP <Activity size={14} /></p><strong>{pendingCount}</strong></article>
        <article className="live-metric"><p>COMPLETED <User size={14} /></p><strong>{completedCount}</strong></article>
        <article className="live-metric"><p>TOTAL TRACKED <Calendar size={14} /></p><strong>{followUps.length}</strong></article>
      </section>

      <section className="live-panel tx-table-panel">
        {followUpsQuery.isPending ? (
          <Loading label="Loading follow-ups…" />
        ) : (
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
                    <td className="tx-mono">{formatDate(item.scheduledDate)}</td>
                    <td><span className={`tx-status ${statusTone(item.status)}`}><i aria-hidden="true" />{STATUS_LABEL[item.status]}</span></td>
                    <td>{PRIORITY_LABEL[item.priority]}</td>
                  </tr>
                ))}
                {followUps.length === 0 && !followUpsQuery.error && (
                  <tr><td colSpan={6} className="live-empty">No mentorship follow-ups recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <div role="dialog" aria-modal="true" className="ops-modal-overlay" onClick={() => setSelectedId(null)}>
          <div className="ops-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ops-modal-head">
              <div>
                <span className="ops-modal-eyebrow">Mentorship Follow-up</span>
                <h3>{selected.title}</h3>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} className="ops-modal-close" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="ops-modal-facts">
              <div className="ops-modal-fact"><User size={14} color="var(--muted)" /><span><strong>Mentee:</strong> {selected.mentee}</span></div>
              <div className="ops-modal-fact"><User size={14} color="var(--muted)" /><span><strong>Mentor:</strong> {selected.mentor}</span></div>
              <div className="ops-modal-fact"><Calendar size={14} color="var(--muted)" /><span><strong>Next follow-up:</strong> {formatDate(selected.scheduledDate)}</span></div>
            </div>

            <p className="ops-modal-desc">{selected.focus}</p>

            <div className="tx-field form-field">
              <span className="tx-label">Status</span>
              <div className="tx-segments">
                {STATUS_OPTIONS.map((option) => (
                  <label key={option.value} className={`tx-segment ${selected.status === option.value ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="follow-up-status"
                      checked={selected.status === option.value}
                      onChange={() => save(option.value)}
                      disabled={updateFollowUp.isPending}
                    />
                    <i aria-hidden="true" />{option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="tx-field form-field">
              <label className="tx-label" htmlFor="follow-up-notes">Notes</label>
              <textarea id="follow-up-notes" rows={3} value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} />
            </div>

            {dialogError && <p className="tx-field-error" role="alert">{dialogError}</p>}

            <div className="ops-modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setSelectedId(null)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={() => save(selected.status)} disabled={updateFollowUp.isPending}>
                {updateFollowUp.isPending ? 'Saving…' : 'Save notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div role="dialog" aria-modal="true" className="ops-modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="ops-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ops-modal-head">
              <div>
                <span className="ops-modal-eyebrow">Mentorship Follow-up</span>
                <h3>Add a follow-up</h3>
              </div>
              <button type="button" onClick={() => setShowCreateForm(false)} className="ops-modal-close" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <form className="tx-form" onSubmit={submitNewFollowUp}>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="new-followup-title">Title</label>
                <input id="new-followup-title" value={newFollowUp.title} onChange={setNewField('title')} />
              </div>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="new-followup-mentee">Mentee (student)</label>
                <input id="new-followup-mentee" value={newFollowUp.mentee} onChange={setNewField('mentee')} />
              </div>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="new-followup-mentor">Mentor</label>
                <input id="new-followup-mentor" value={newFollowUp.mentor} onChange={setNewField('mentor')} />
              </div>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="new-followup-date">Follow-up date</label>
                <input id="new-followup-date" type="date" value={newFollowUp.scheduledDate} onChange={setNewField('scheduledDate')} />
              </div>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="new-followup-focus">Focus</label>
                <input id="new-followup-focus" value={newFollowUp.focus} onChange={setNewField('focus')} />
              </div>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="new-followup-priority">Priority</label>
                <select id="new-followup-priority" value={newFollowUp.priority} onChange={setNewField('priority')}>
                  {Object.entries(PRIORITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="tx-field form-field">
                <label className="tx-label" htmlFor="new-followup-notes">Notes (capacity building, startup motivation…)</label>
                <textarea id="new-followup-notes" rows={3} value={newFollowUp.notes} onChange={setNewField('notes')} />
              </div>
              {createError && <p className="tx-field-error" role="alert">{createError}</p>}
              <div className="ops-modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createFollowUp.isPending}>
                  {createFollowUp.isPending ? 'Saving…' : 'Add follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
