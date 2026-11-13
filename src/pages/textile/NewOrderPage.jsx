import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, LoaderCircle, Save } from 'lucide-react';
import { CUSTOMER_TYPES, TEXTILE_RULES, todayIso } from '@/lib/textile';
import { useCreateOrder, useTextileOrder, useUpdateDraft } from '@/hooks/useTextile';
import { ErrorBanner, Loading, PageHeading, PhotoDrop } from './shared';
import { useUnauthorizedRedirect } from './helpers';

const EMPTY_ORDER = {
  customerName: '',
  customerType: '',
  whatIsWanted: '',
  quantity: '',
  sizeDesign: '',
  dateNeeded: '',
  rulesAccepted: false,
};

/** The Textile service-request variant of the standard submission form. */
export function NewOrderPage({ token, onUnauthorized }) {
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft') ?? '';
  const draft = useTextileOrder(token, draftId);
  useUnauthorizedRedirect(onUnauthorized, draft.error);

  if (draftId && draft.isLoading) return <Loading label="Loading draft…" />;
  if (draftId && draft.data && draft.data.status !== 'DRAFT') {
    return (
      <div className="live-page page-enter">
        <PageHeading eyebrow="TEXTILE · SERVICE REQUEST" title="This order was already sent." intro="Only drafts can be edited here." />
        <Link className="btn btn-primary" to={`/textile/orders/${draft.data.id}`}>Open order page<ArrowRight size={15} /></Link>
      </div>
    );
  }
  return <NewOrderForm key={draft.data?.id ?? 'new'} token={token} draft={draft.data ?? null} loadError={draft.error} onUnauthorized={onUnauthorized} />;
}

function NewOrderForm({ token, draft, loadError, onUnauthorized }) {
  const navigate = useNavigate();
  const [values, setValues] = useState(() => (draft ? {
    customerName: draft.customerName,
    customerType: draft.customerType,
    whatIsWanted: draft.whatIsWanted,
    quantity: draft.quantity,
    sizeDesign: draft.sizeDesign,
    dateNeeded: draft.dateNeeded ?? '',
    rulesAccepted: draft.rulesAccepted,
  } : EMPTY_ORDER));
  const [photo, setPhoto] = useState(null);
  const [savedDraft, setSavedDraft] = useState(draft);
  // What was last saved (or the empty form), to tell whether there are unsaved changes.
  const [savedValues, setSavedValues] = useState(values);
  const [notice, setNotice] = useState('');
  const createOrder = useCreateOrder(token);
  const updateDraft = useUpdateDraft(token, savedDraft?.id ?? '');
  const mutation = savedDraft ? updateDraft : createOrder;
  const unsaved = Boolean(photo) || JSON.stringify(values) !== JSON.stringify(savedValues);

  // Ask before closing or reloading the tab with unsaved changes.
  useEffect(() => {
    if (!unsaved) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);
  useUnauthorizedRedirect(onUnauthorized, createOrder.error, updateDraft.error);

  const set = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    setNotice('');
  };

  const save = async (submit) => {
    setNotice('');
    const order = {
      ...values,
      customerName: values.customerName.trim(),
      whatIsWanted: values.whatIsWanted.trim(),
      quantity: values.quantity.trim(),
      sizeDesign: values.sizeDesign.trim(),
      dateNeeded: values.dateNeeded || null,
      submit,
    };
    try {
      const saved = await mutation.mutateAsync({ order, photo });
      if (submit) {
        navigate(`/textile/review?order=${encodeURIComponent(saved.id)}`);
      } else {
        setSavedDraft(saved);
        setSavedValues(values);
        setPhoto(null);
        setNotice('Draft saved. You can come back to it from Order Review & Quote.');
      }
    } catch {
      // The error banner below renders mutation.error.
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    void save(true);
  };

  const onSaveDraft = () => {
    // A draft only needs the customer name; the browser explains what is missing.
    const nameInput = document.getElementById('tx-customer-name');
    if (!values.customerName.trim()) {
      nameInput?.reportValidity();
      return;
    }
    void save(false);
  };

  return (
    <div className="live-page page-enter">
      <PageHeading
        eyebrow="TEXTILE · SERVICE REQUEST"
        title="New Order"
        intro="Describe what the customer wants. Reception has already checked and forwarded this request."
      />
      <ErrorBanner error={loadError} fallback="This draft could not be loaded." />
      <form className="live-panel tx-form" onSubmit={onSubmit}>
        {savedDraft && <p className="tx-inline-note">Editing draft saved {new Date(savedDraft.updatedAt).toLocaleDateString()}.</p>}
        <div className="form-grid">
          <label className="form-field">Customer name*
            <input id="tx-customer-name" required maxLength={160} value={values.customerName} onChange={set('customerName')} placeholder="e.g. Robert Ssali" />
          </label>
          <label className="form-field">Customer type*
            <select required value={values.customerType} onChange={set('customerType')}>
              <option value="" disabled>Choose a customer type</option>
              {CUSTOMER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="form-field">What is wanted*
            <input required maxLength={240} value={values.whatIsWanted} onChange={set('whatIsWanted')} placeholder="e.g. Custom curtain set, living room" />
          </label>
          <label className="form-field">Quantity*
            <input required maxLength={120} value={values.quantity} onChange={set('quantity')} placeholder="e.g. 1 set (3 panels)" />
          </label>
          <label className="form-field">Size / design*
            <input required maxLength={500} value={values.sizeDesign} onChange={set('sizeDesign')} placeholder="Measurements, colours, fabric, finish" />
          </label>
          <label className="form-field">Date needed
            <input type="date" min={todayIso()} value={values.dateNeeded} onChange={set('dateNeeded')} />
          </label>
        </div>
        <PhotoDrop
          label="Reference photo"
          hint="JPG or PNG · 15 MB limit"
          file={photo}
          existingName={savedDraft?.photo?.name}
          onChange={setPhoto}
        />
        <fieldset className="tx-rules">
          <legend>Textile department rules</legend>
          <ul>{TEXTILE_RULES.map((rule) => <li key={rule}>{rule}</li>)}</ul>
          <label className="tx-check">
            <input type="checkbox" required checked={values.rulesAccepted} onChange={set('rulesAccepted')} />
            <span>The customer accepts the Textile department’s handling and collection rules*</span>
          </label>
        </fieldset>
        <ErrorBanner error={mutation.error} fallback="Could not save the order." />
        {notice && <p className="tx-success" role="status">{notice}</p>}
        <div className="tx-actions">
          <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <LoaderCircle size={15} className="spin" /> : null}Send order
          </button>
          <button className="btn" type="button" onClick={onSaveDraft} disabled={mutation.isPending}>
            <Save size={14} />Save as draft
          </button>
        </div>
      </form>
    </div>
  );
}
