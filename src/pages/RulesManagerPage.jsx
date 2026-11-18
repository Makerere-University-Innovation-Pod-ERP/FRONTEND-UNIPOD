import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Plus, Radio, X } from 'lucide-react';
import { backendApi } from '@/services/backend-api';
import { useCreateRule, useRetireRule, useRules, useUpdateRule } from '@/hooks/useRules';
import { RulesAcceptance } from '@/components/RulesAcceptance';

const EMPTY_FORM = { title: '', body: '', scope: 'GENERAL', scopeId: '', mustAccept: false };

/**
 * Department Rules Manager (Assignment 12). The assignment doc says "each
 * department head edits only their own department's rules," but no
 * department-head role or department-scoped permission exists anywhere in
 * this codebase (confirmed by research before building this) — only a
 * flat, inert DEPARTMENT_HEAD label in Admin's role catalog. Rather than
 * invent a department-ownership model the project doesn't have, this page
 * is gated Administrator-only (a safe superset of every future department
 * head) until that role is actually modeled — a project-owner decision,
 * per the doc's own Section 9 pattern, not something to guess at here.
 */
export function RulesManagerPage({ token }) {
  const rulesQuery = useRules(token);
  const sectorsQuery = useQuery({
    queryKey: ['sectors', token],
    queryFn: ({ signal }) => backendApi.sectors(token, signal),
    enabled: Boolean(token),
  });
  const createRule = useCreateRule(token);
  const updateRule = useUpdateRule(token);
  const retireRule = useRetireRule(token);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [previewId, setPreviewId] = useState(null);

  const rules = rulesQuery.data ?? [];
  const sectors = sectorsQuery.data ?? [];
  const previewRule = rules.find((rule) => rule.id === previewId);

  function set(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  }

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(rule) {
    setEditingId(rule.id);
    setForm({ title: rule.title, body: rule.body, scope: rule.scope, scopeId: rule.scopeId ?? '', mustAccept: rule.mustAccept });
    setShowForm(true);
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    const body = {
      title: form.title.trim(),
      body: form.body.trim(),
      scope: form.scope,
      scopeId: form.scope === 'SECTOR' ? form.scopeId || null : null,
      mustAccept: form.mustAccept,
    };
    try {
      if (editingId) {
        await updateRule.mutateAsync({ id: editingId, ...body, published: true });
      } else {
        await createRule.mutateAsync({ ...body, published: false });
      }
      setShowForm(false);
    } catch {
      // ErrorBanner below surfaces the mutation error
    }
  }

  const mutationError = createRule.error || updateRule.error || retireRule.error;

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">PLATFORM</p>
          <h1>Department Rules Manager</h1>
          <p>General and department-specific rules shown at the point of request, with required accept tick-boxes.</p>
        </div>
        <div className="heading-actions">
          <button type="button" className="btn btn-primary" onClick={startCreate}><Plus size={15} />New rule</button>
        </div>
      </div>

      {mutationError && <div className="api-error api-error-banner" role="alert">{mutationError.message || 'Could not save the rule.'}</div>}

      {showForm && (
        <section className="live-panel management-panel">
          <h3 className="tx-panel-title">{editingId ? 'Edit rule' : 'New rule'}</h3>
          <form className="management-form" onSubmit={onSubmit}>
            <label className="form-field">Title*
              <input required value={form.title} onChange={set('title')} />
            </label>
            <label className="form-field">Scope*
              <select value={form.scope} onChange={set('scope')}>
                <option value="GENERAL">General (UniPod-wide)</option>
                <option value="SECTOR">A specific department</option>
              </select>
            </label>
            {form.scope === 'SECTOR' && (
              <label className="form-field">Department*
                <select required value={form.scopeId} onChange={set('scopeId')}>
                  <option value="" disabled>Choose a department</option>
                  {sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
                </select>
              </label>
            )}
            <label className="form-field" style={{ gridColumn: '1 / -1' }}>Wording*
              <textarea required rows={3} value={form.body} onChange={set('body')} />
            </label>
            <label className="management-checkbox" style={{ gridColumn: '1 / -1' }}>
              <input type="checkbox" checked={form.mustAccept} onChange={set('mustAccept')} />
              Must be explicitly accepted (shows a required tick-box)
            </label>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={createRule.isPending || updateRule.isPending}>
                {editingId ? 'Save & publish' : 'Create as draft'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="live-panel tx-table-panel">
        <div className="live-table-wrap">
          <table className="live-table">
            <thead>
              <tr>
                <th>TITLE</th>
                <th>SCOPE</th>
                <th>MUST ACCEPT</th>
                <th>VERSION</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td><b className="tx-strong">{rule.title}</b></td>
                  <td>{rule.scope === 'GENERAL' ? 'General' : sectors.find((sector) => sector.id === rule.scopeId)?.name ?? rule.scopeId}</td>
                  <td>{rule.mustAccept ? 'Yes' : 'No'}</td>
                  <td>v{rule.version}</td>
                  <td>{rule.published ? <span className="tx-status tx-positive"><i aria-hidden="true" />Published</span> : <span className="tx-status tx-neutral"><i aria-hidden="true" />Draft</span>}</td>
                  <td className="tx-row-actions">
                    <button type="button" className="btn tx-ghost" onClick={() => setPreviewId(rule.id)}><Eye size={13} />Preview</button>
                    <button type="button" className="btn tx-ghost" onClick={() => startEdit(rule)}>Edit</button>
                    {rule.published ? (
                      <button type="button" className="btn tx-ghost" disabled={retireRule.isPending} onClick={() => retireRule.mutateAsync(rule.id).catch(() => {})}>Retire</button>
                    ) : (
                      <button type="button" className="btn tx-ghost" disabled={updateRule.isPending} onClick={() => updateRule.mutateAsync({ id: rule.id, published: true }).catch(() => {})}>
                        <Radio size={13} />Publish
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rules.length === 0 && <tr><td colSpan={6} className="live-empty">No rules created yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {previewRule && (
        <div role="dialog" aria-modal="true" className="ops-modal-overlay" onClick={() => setPreviewId(null)}>
          <div className="ops-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ops-modal-head">
              <div><span className="ops-modal-eyebrow">Preview</span><h3>How this rule is shown</h3></div>
              <button type="button" onClick={() => setPreviewId(null)} className="ops-modal-close" aria-label="Close"><X size={16} /></button>
            </div>
            <RulesAcceptance rules={[previewRule]} readOnly />
          </div>
        </div>
      )}
    </div>
  );
}
