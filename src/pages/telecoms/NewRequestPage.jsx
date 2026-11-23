import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Info,
  LoaderCircle,
  Radio,
  Save,
  Send,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { CUSTOMER_TYPES, TELECOMS_RULES, todayIso } from '@/lib/telecoms';
import { useCreateTelecomsRequest, useTelecomsRequest } from '@/hooks/useTelecoms';
import { CurvedSelect } from '@/components/CurvedSelect';
import { ErrorBanner, Loading, PageHeading } from './shared';
import { useUnauthorizedRedirect } from './helpers';

const EMPTY_REQUEST = {
  customerName: '',
  customerType: 'Student',
  serviceWanted: '',
  equipmentInvolved: '',
  preferredDate: '',
  rulesAccepted: false,
};

export function NewRequestPage({ token, onUnauthorized }) {
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft') ?? '';
  const requestQuery = useTelecomsRequest(token, draftId);
  useUnauthorizedRedirect(onUnauthorized, requestQuery.error);

  if (draftId && requestQuery.isLoading) return <Loading label="Loading draft…" />;
  if (draftId && requestQuery.data && requestQuery.data.status !== 'DRAFT') {
    return (
      <div className="live-page page-enter">
        <PageHeading
          eyebrow="TELECOMS · SERVICE REQUEST"
          title="This request was already submitted."
          intro="Only drafts can be edited here."
        />
        <Link className="btn btn-primary" to={`/telecoms/requests/${requestQuery.data.id}`}>
          Open request page<ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  return (
    <NewRequestForm
      key={requestQuery.data?.id ?? 'new'}
      token={token}
      draft={requestQuery.data ?? null}
      loadError={requestQuery.error}
      onUnauthorized={onUnauthorized}
    />
  );
}

function NewRequestForm({ token, draft, loadError, onUnauthorized }) {
  const navigate = useNavigate();
  const [values, setValues] = useState(() => (draft ? {
    customerName: draft.customerName,
    customerType: draft.customerType,
    serviceWanted: draft.serviceWanted,
    equipmentInvolved: draft.equipmentInvolved,
    preferredDate: draft.preferredDate ?? '',
    rulesAccepted: draft.rulesAccepted,
  } : EMPTY_REQUEST));

  const [notice, setNotice] = useState('');
  const createMutation = useCreateTelecomsRequest(token);
  useUnauthorizedRedirect(onUnauthorized, createMutation.error);

  const set = (field) => (event) => {
    const val = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((curr) => ({ ...curr, [field]: val }));
    setNotice('');
  };

  const save = async (submit) => {
    setNotice('');
    const payload = {
      ...values,
      customerName: values.customerName.trim(),
      serviceWanted: values.serviceWanted.trim(),
      equipmentInvolved: values.equipmentInvolved.trim(),
      preferredDate: values.preferredDate || null,
      rulesAccepted: values.rulesAccepted,
    };
    try {
      const saved = await createMutation.mutateAsync(payload);
      if (submit) {
        navigate(`/telecoms/review?request=${encodeURIComponent(saved.id)}`);
      } else {
        setNotice('Request draft saved. You can continue anytime from the Review & Quote queue.');
      }
    } catch {
      // Error rendered below
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    void save(true);
  };

  return (
    <div className="live-page page-enter">
      <PageHeading
        eyebrow="TELECOMS · WORKFLOW 6.1"
        title="New Telecoms Service Request"
        intro="Intake submission for RF spectrum analysis, IoT firmware bench testing, PCB rework, sensor calibration, or antenna tuning."
      />
      <ErrorBanner error={loadError || createMutation.error} fallback="Could not save service request." />
      {notice && <p className="tx-success" role="status">{notice}</p>}

      <div className="telecoms-request-layout">
        {/* Main form section */}
        <section className="telecoms-form-main">
          <form className="live-panel tx-form" onSubmit={onSubmit}>
            <div className="form-group-head">
              <h2>Request Details</h2>
              <p>Provide customer information and specify the engineering assistance or test bench required.</p>
            </div>

            <div className="form-field">
              <label htmlFor="tl-customer-name">Customer or Organization Name *</label>
              <input
                id="tl-customer-name"
                required
                type="text"
                value={values.customerName}
                placeholder="e.g. Sarah Kintu, Kampala Radio Project, or AgriSense IoT"
                onChange={set('customerName')}
              />
            </div>

            <div className="form-field">
              <label htmlFor="tl-customer-type">Customer Category *</label>
              <CurvedSelect
                id="tl-customer-type"
                ariaLabel="Customer Category"
                value={values.customerType}
                options={CUSTOMER_TYPES}
                onChange={set('customerType')}
              />
            </div>

            <div className="form-field">
              <label htmlFor="tl-service-wanted">Problem or Service Wanted *</label>
              <textarea
                id="tl-service-wanted"
                required
                rows={4}
                value={values.serviceWanted}
                placeholder="Describe the diagnostic, frequency tuning, harmonic attenuation, telemetry testing, or SMD soldering rework needed…"
                onChange={set('serviceWanted')}
              />
            </div>

            <div className="form-field">
              <label htmlFor="tl-equipment-involved">Equipment, Prototype or Circuit Involved *</label>
              <input
                id="tl-equipment-involved"
                required
                type="text"
                value={values.equipmentInvolved}
                placeholder="e.g. ESP32 LoRa sensor node, SiK 433MHz transceiver, 100W bandpass filter"
                onChange={set('equipmentInvolved')}
              />
            </div>

            <div className="form-field">
              <label htmlFor="tl-date-needed">Preferred Testing / Completion Date</label>
              <input
                id="tl-date-needed"
                type="date"
                min={todayIso()}
                value={values.preferredDate}
                onChange={set('preferredDate')}
              />
            </div>

            <div className="tx-actions form-bottom-actions">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={createMutation.isPending || !values.rulesAccepted}
              >
                {createMutation.isPending ? <LoaderCircle className="spin" size={15} /> : <Send size={15} />}
                Send request
              </button>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => save(false)}
                disabled={createMutation.isPending || !values.customerName.trim()}
              >
                <Save size={15} />
                Save draft
              </button>
              <Link className="btn btn-outline" to="/telecoms/board">Cancel</Link>
            </div>
          </form>
        </section>

        {/* Sidebar helper panels (Rules, Bench Capabilities & Workflow Guide) */}
        <aside className="telecoms-form-side">
          {/* Rules & safety agreement card */}
          <div className="live-panel telecoms-side-card">
            <div className="side-card-header">
              <div className="side-card-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3>Telecoms Lab Rules & Safety (RL3)</h3>
                <small>Mandatory compliance guidelines</small>
              </div>
            </div>

            <ul className="side-card-list">
              {TELECOMS_RULES.map((rule, idx) => (
                <li key={idx}>
                  <CheckCircle2 size={15} className="bullet-icon" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>

            <div className="rules-accept-box">
              <label className="tx-check" htmlFor="tl-rules-accept">
                <input
                  id="tl-rules-accept"
                  type="checkbox"
                  required
                  checked={values.rulesAccepted}
                  onChange={set('rulesAccepted')}
                />
                <span>
                  <strong>I agree to abide by Telecoms Lab safety rules</strong> and accept the diagnostics payment policy. *
                </span>
              </label>
            </div>
          </div>

          {/* Bench capabilities card */}
          <div className="live-panel telecoms-side-card">
            <div className="side-card-header">
              <div className="side-card-icon accent-green">
                <Radio size={20} />
              </div>
              <div>
                <h3>Bench Capabilities & Equipment</h3>
                <small>Makerere UniPod Telecoms Facility</small>
              </div>
            </div>

            <div className="capability-specs">
              <div className="spec-item">
                <Activity size={15} />
                <div>
                  <strong>Spectrum Analysis</strong>
                  <span>9 kHz to 6 GHz RF spectral sweep & harmonic check</span>
                </div>
              </div>
              <div className="spec-item">
                <Cpu size={15} />
                <div>
                  <strong>Microcontroller & IoT</strong>
                  <span>LoRaWAN, ZigBee, ESP32, and GSM telemetry validation</span>
                </div>
              </div>
              <div className="spec-item">
                <Wrench size={15} />
                <div>
                  <strong>SMD Circuit Rework</strong>
                  <span>Temperature-controlled micro-soldering & hot-air rework</span>
                </div>
              </div>
            </div>

            <div className="side-card-footer-note">
              <Info size={14} />
              <span>Standard student subsidy: <strong>50% off bench fee</strong> with valid student registration.</span>
            </div>
          </div>

          {/* Workflow Guide Card */}
          <div className="live-panel telecoms-side-card">
            <div className="side-card-header">
              <div className="side-card-icon accent-blue">
                <Clock size={20} />
              </div>
              <div>
                <h3>Workflow Next Steps</h3>
                <small>Assignment 11 Lifecycle</small>
              </div>
            </div>

            <ol className="step-pipeline">
              <li className="active-step">
                <span className="step-num">1</span>
                <div>
                  <b>Intake & Request Logging</b>
                  <p>Customer details and target equipment recorded.</p>
                </div>
              </li>
              <li>
                <span className="step-num">2</span>
                <div>
                  <b>Technical Review & Quotation</b>
                  <p>Lead engineer computes fees and consumables.</p>
                </div>
              </li>
              <li>
                <span className="step-num">3</span>
                <div>
                  <b>Payment & Board Scheduling</b>
                  <p>Moved to Scheduled column upon verified payment receipt.</p>
                </div>
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
