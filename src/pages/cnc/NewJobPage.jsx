import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoaderCircle, Send } from 'lucide-react';
import { useCreateCncJob } from '@/hooks/useCnc';
import { useRules } from '@/hooks/useRules';
import { allMustAcceptAccepted, computeAcceptedRulesVersion, RulesAcceptance } from '@/components/RulesAcceptance';
import { PageHeading } from './shared';

const todayIso = () => new Date().toISOString().slice(0, 10);

const EMPTY_JOB = {
  title: '',
  customerName: '',
  customerType: 'Student',
  contact: '',
  material: '',
  size: '',
  quantity: '1',
  dateNeeded: '',
  designLink: '',
  notes: '',
};

const MATERIALS = ['Plywood', 'MDF', 'Hardwood', 'Softwood', 'Acrylic', 'Aluminium sheet', 'PLA (3D print)', 'Other'];

export function NewJobPage({ token }) {
  const navigate = useNavigate();
  const createJob = useCreateCncJob(token);
  // GENERAL rules from the shared Rules Manager (Assignment 12) — no
  // CNC-sector-scoped rules are wired to this screen yet, so only the
  // UniPod-wide ones contribute to the accepted version label.
  const rulesQuery = useRules(token);
  const generalRules = (rulesQuery.data ?? []).filter((rule) => rule.scope === 'GENERAL' && rule.published);
  const requiredRules = generalRules.filter((rule) => rule.mustAccept);
  const [acceptedRuleIds, setAcceptedRuleIds] = useState([]);
  const [form, setForm] = useState(EMPTY_JOB);
  const [formError, setFormError] = useState('');

  function set(field) {
    return (event) => {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };
  }

  async function onSubmit(event) {
    event.preventDefault();
    setFormError('');
    const quantity = Number(form.quantity);
    if (!form.title.trim() || !form.customerName.trim() || !form.material || !form.size.trim()) {
      setFormError('What is to be made, customer, material and size are required.');
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      setFormError('Quantity must be at least 1.');
      return;
    }
    if (form.designLink.trim() && !/^https?:\/\//i.test(form.designLink.trim())) {
      setFormError('The design link must start with http:// or https://.');
      return;
    }
    if (rulesQuery.isLoading) {
      setFormError('Wait for the CNC rules to load before sending the job.');
      return;
    }
    if (rulesQuery.isError) {
      setFormError('Could not load the CNC rules. Try again before sending the job.');
      return;
    }
    if (!allMustAcceptAccepted(requiredRules, acceptedRuleIds)) {
      setFormError('The CNC & Carpentry rules must be accepted before sending the job.');
      return;
    }
    try {
      const acceptedRulesVersion = await computeAcceptedRulesVersion(requiredRules);
      const job = await createJob.mutateAsync({
        title: form.title.trim(),
        quantity,
        dateNeeded: form.dateNeeded || undefined,
        acceptedRulesVersion,
        specs: {
          whatIsMade: form.title.trim(),
          customerName: form.customerName.trim(),
          customerType: form.customerType,
          contact: form.contact.trim(),
          material: form.material,
          size: form.size.trim(),
          designLink: form.designLink.trim(),
          notes: form.notes.trim(),
        },
      });
      navigate(`/cnc/jobs/${encodeURIComponent(job.id)}`);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Could not send the job.');
    }
  }

  return (
    <div className="live-page page-enter">
      <PageHeading title="New Job" intro="Describe what should be made. The design is checked and priced before any work starts." />

      <section className="live-panel tx-narrow">
        <form className="tx-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="form-field">What is to be made*
              <input value={form.title} onChange={set('title')} placeholder="e.g. Laser-cut display stand" />
            </label>
            <label className="form-field">Quantity*
              <input type="number" min="1" value={form.quantity} onChange={set('quantity')} />
            </label>
            <label className="form-field">Customer name*
              <input value={form.customerName} onChange={set('customerName')} />
            </label>
            <label className="form-field">Customer type
              <select value={form.customerType} onChange={set('customerType')}>
                <option>Student</option>
                <option>Member of the public</option>
                <option>Business</option>
              </select>
            </label>
            <label className="form-field">Phone or email
              <input value={form.contact} onChange={set('contact')} />
            </label>
            <label className="form-field">Date needed
              <input type="date" min={todayIso()} value={form.dateNeeded} onChange={set('dateNeeded')} />
            </label>
            <label className="form-field">Material*
              <select value={form.material} onChange={set('material')}>
                <option value="" disabled>Choose a material</option>
                {MATERIALS.map((material) => <option key={material}>{material}</option>)}
              </select>
            </label>
            <label className="form-field">Size*
              <input value={form.size} onChange={set('size')} placeholder="e.g. 600 × 400 × 18 mm" />
            </label>
          </div>
          <label className="form-field">Design or drawing link (DXF, DWG, STL, SVG, PDF or image)
            <input type="url" value={form.designLink} onChange={set('designLink')} placeholder="https://drive.google.com/…" />
          </label>
          <label className="form-field">Notes
            <textarea rows={3} value={form.notes} onChange={set('notes')} />
          </label>
          <fieldset className="form-field">
            <legend>Applicable rules</legend>
            {rulesQuery.isLoading && <p className="field-note">Loading CNC rules…</p>}
            {rulesQuery.isError && (
              <p className="tx-field-error" role="alert">Could not load the CNC rules. Try again before sending the job.</p>
            )}
            {rulesQuery.isSuccess && (
              <RulesAcceptance rules={generalRules} value={acceptedRuleIds} onChange={setAcceptedRuleIds} />
            )}
          </fieldset>
          {formError && <p className="tx-field-error" role="alert">{formError}</p>}
          <div className="tx-actions">
            <button type="submit" className="btn btn-primary" disabled={createJob.isPending || rulesQuery.isLoading || rulesQuery.isError}>
              {createJob.isPending ? <LoaderCircle className="spin" size={15} /> : <Send size={15} />}Send job
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
