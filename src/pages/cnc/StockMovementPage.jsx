import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock, LoaderCircle } from 'lucide-react';
import {
  CNC_MOVEMENT_TYPES, CNC_MOVEMENT_TYPE_LABELS, activeCncJobs, cncJobLabel, evaluateCncMovement, isLowStock,
} from '@/lib/cnc';
import {
  useCncJobs, useCncStock, useCncStockMovements, useRecordCncStockMovement, useRegisterCncStockItem,
} from '@/hooks/useCnc';
import { ErrorBanner, Loading, PageHeading } from './shared';
import { MovementTable } from './StockListPage';
import { useUnauthorizedRedirect } from '../textile/helpers';

export function StockMovementPage({ token, onUnauthorized }) {
  const [searchParams] = useSearchParams();
  const stock = useCncStock(token);
  const jobs = useCncJobs(token);
  const movements = useCncStockMovements(token);
  const record = useRecordCncStockMovement(token);
  const register = useRegisterCncStockItem(token);
  useUnauthorizedRedirect(onUnauthorized, stock.error, jobs.error, movements.error, record.error, register.error);

  const initialType = Object.values(CNC_MOVEMENT_TYPES).includes(searchParams.get('type'))
    ? searchParams.get('type')
    : CNC_MOVEMENT_TYPES.RECEIVED;
  const [type, setType] = useState(initialType);
  const [itemId, setItemId] = useState(searchParams.get('item') ?? '');
  const [quantity, setQuantity] = useState('');
  const [jobId, setJobId] = useState(searchParams.get('job') ?? '');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', unit: '', quantity: '', minimum: '0', location: 'CNC Workshop store' });
  const [savedItem, setSavedItem] = useState(null);

  const items = stock.data?.items ?? [];
  const item = items.find((candidate) => candidate.id === itemId) ?? null;
  const activeJobs = activeCncJobs(jobs.data ?? []);
  const numericQuantity = quantity === '' ? Number.NaN : Number(quantity);
  const evaluation = evaluateCncMovement(item, { type, quantity: numericQuantity, note, jobId });
  const showError = touched || (item && quantity !== '');

  const resetMovement = () => { setQuantity(''); setNote(''); setTouched(false); };

  const onSubmit = (event) => {
    event.preventDefault();
    setTouched(true);
    setSaved(null);
    if (evaluation.error) return;
    record.mutateAsync({
      itemId,
      type,
      quantity: numericQuantity,
      jobId: type === CNC_MOVEMENT_TYPES.USED_ON_ORDER ? jobId : null,
      note: note.trim(),
    }).then((result) => { setSaved(result); resetMovement(); }).catch(() => {});
  };

  const onRegister = (event) => {
    event.preventDefault();
    setSavedItem(null);
    register.mutateAsync({
      name: newItem.name.trim(),
      unit: newItem.unit.trim(),
      quantity: Number(newItem.quantity),
      minimum: Number(newItem.minimum || 0),
      location: newItem.location.trim(),
    }).then((created) => {
      setSavedItem(created);
      setNewItem({ name: '', unit: '', quantity: '', minimum: '0', location: 'CNC Workshop store' });
    }).catch(() => {});
  };

  return (
    <div className="live-page page-enter">
      <PageHeading title="Add or Use Stock" intro="Record every stock movement — received, used on a job, or a correction." />
      <ErrorBanner error={stock.error} fallback="Could not load the stock list." />
      {stock.isLoading ? <Loading label="Loading stock…" /> : (
        <form className="live-panel tx-form tx-narrow" onSubmit={onSubmit}>
          <div className="tx-segments" role="radiogroup" aria-label="Movement type">
            {Object.values(CNC_MOVEMENT_TYPES).map((value) => (
              <label key={value} className={`tx-segment ${type === value ? 'selected' : ''}`}>
                <input type="radio" name="movement-type" value={value} checked={type === value} onChange={() => { setType(value); setSaved(null); }} />
                <i aria-hidden="true" />{CNC_MOVEMENT_TYPE_LABELS[value]}
              </label>
            ))}
          </div>
          <div className="form-grid">
            <label className="form-field">Item*
              <select required value={itemId} onChange={(event) => { setItemId(event.target.value); setSaved(null); }}>
                <option value="" disabled>Choose an item</option>
                {items.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>{candidate.name}{isLowStock(candidate) ? ' (low)' : ''}</option>
                ))}
              </select>
              {item && <span className="field-note">{item.quantity} {item.unit} in stock · minimum {item.minimum}</span>}
            </label>
            <label className="form-field">Quantity*
              <input
                required type="number" step="any"
                min={type === CNC_MOVEMENT_TYPES.CORRECTION ? undefined : '0'}
                value={quantity}
                onChange={(event) => { setQuantity(event.target.value); setSaved(null); }}
                placeholder={type === CNC_MOVEMENT_TYPES.CORRECTION ? 'e.g. -2 or 5' : 'e.g. 30'}
              />
              {type === CNC_MOVEMENT_TYPES.CORRECTION && <span className="field-note">Use a negative number to reduce stock.</span>}
            </label>
            {type === CNC_MOVEMENT_TYPES.USED_ON_ORDER && (
              <label className="form-field">Job*
                <select required value={jobId} onChange={(event) => { setJobId(event.target.value); setSaved(null); }}>
                  <option value="" disabled>Choose the job</option>
                  {activeJobs.map((job) => <option key={job.id} value={job.id}>{cncJobLabel(job)}</option>)}
                </select>
              </label>
            )}
            <label className="form-field">Note{type === CNC_MOVEMENT_TYPES.CORRECTION ? '*' : ''}
              <input
                required={type === CNC_MOVEMENT_TYPES.CORRECTION}
                value={note}
                onChange={(event) => { setNote(event.target.value); setSaved(null); }}
                placeholder={type === CNC_MOVEMENT_TYPES.CORRECTION ? 'Required for a correction' : 'Optional — e.g. delivery note number'}
              />
            </label>
          </div>
          {item && !evaluation.error && (
            <p className="tx-inline-note" aria-live="polite">New balance: <b>{evaluation.balance} {item.unit}</b>{evaluation.balance < item.minimum ? ' — below the minimum, will show as low stock' : ''}</p>
          )}
          {showError && evaluation.error && <p className="tx-field-error" role="alert">{evaluation.error}</p>}
          <ErrorBanner error={record.error} fallback="Could not record the movement." />
          {saved && (
            <p className="tx-success" role="status">
              Saved: {CNC_MOVEMENT_TYPE_LABELS[saved.movement.type]} {Math.abs(saved.movement.quantity)} {saved.item.unit} of {saved.item.name}. Balance now {saved.item.quantity}.
            </p>
          )}
          <div className="tx-actions">
            <button type="submit" className="btn btn-primary" disabled={record.isPending || (showError && Boolean(evaluation.error))}>
              {record.isPending ? <LoaderCircle size={15} className="spin" /> : null}Save
            </button>
          </div>
          <p className="tx-lock-note"><Lock size={12} />Every movement stores who made it and when. Quantity can never go below zero.</p>
        </form>
      )}

      <form className="live-panel tx-form tx-narrow" onSubmit={onRegister}>
        <div className="live-panel-heading"><div><p className="eyebrow">STOCK LIST</p><h2>Register a new item</h2></div></div>
        <div className="form-grid">
          <label className="form-field">Item name*
            <input required value={newItem.name} onChange={(event) => setNewItem({ ...newItem, name: event.target.value })} placeholder="e.g. 18 mm plywood sheet" />
          </label>
          <label className="form-field">Unit*
            <input required value={newItem.unit} onChange={(event) => setNewItem({ ...newItem, unit: event.target.value })} placeholder="e.g. sheets" />
          </label>
          <label className="form-field">Opening quantity
            <input type="number" min="0" step="any" value={newItem.quantity} onChange={(event) => setNewItem({ ...newItem, quantity: event.target.value })} placeholder="e.g. 20" />
          </label>
          <label className="form-field">Minimum
            <input type="number" min="0" step="any" value={newItem.minimum} onChange={(event) => setNewItem({ ...newItem, minimum: event.target.value })} />
          </label>
          <label className="form-field">Location*
            <input required value={newItem.location} onChange={(event) => setNewItem({ ...newItem, location: event.target.value })} />
          </label>
        </div>
        <ErrorBanner error={register.error} fallback="Could not register the stock item." />
        {savedItem && <p className="tx-success" role="status">Added {savedItem.name} to the stock list.</p>}
        <div className="tx-actions">
          <button type="submit" className="btn btn-primary" disabled={register.isPending}>
            {register.isPending ? <LoaderCircle size={15} className="spin" /> : null}Register item
          </button>
        </div>
      </form>

      <section className="live-panel tx-table-panel">
        <div className="live-panel-heading"><div><p className="eyebrow">AUDIT TRAIL</p><h2>Recent movements</h2></div></div>
        {movements.isLoading ? <Loading label="Loading movements…" /> : <MovementTable movements={movements.data ?? []} limit={8} />}
      </section>
    </div>
  );
}
