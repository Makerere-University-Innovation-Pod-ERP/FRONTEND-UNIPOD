import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock, LoaderCircle } from 'lucide-react';
import { MOVEMENT_TYPES, MOVEMENT_TYPE_LABELS, evaluateMovement, isLowStock } from '@/lib/textile';
import { useRecordMovement, useStock, useStockMovements, useTextileOrders } from '@/hooks/useTextile';
import { ErrorBanner, Loading, PageHeading } from './shared';
import { MovementTable } from './StockListPage';
import { useUnauthorizedRedirect } from './helpers';

const ACTIVE_ORDER_STATUSES = ['QUOTED', 'SCHEDULED', 'BEING_MADE', 'READY'];

export function StockMovementPage({ token, onUnauthorized }) {
  const [searchParams] = useSearchParams();
  const stock = useStock(token);
  const orders = useTextileOrders(token);
  const movements = useStockMovements(token);
  const record = useRecordMovement(token);
  useUnauthorizedRedirect(onUnauthorized, stock.error, orders.error, movements.error, record.error);

  const initialType = Object.values(MOVEMENT_TYPES).includes(searchParams.get('type')) ? searchParams.get('type') : MOVEMENT_TYPES.RECEIVED;
  const [type, setType] = useState(initialType);
  const [itemId, setItemId] = useState(searchParams.get('item') ?? '');
  const [quantity, setQuantity] = useState('');
  const [orderId, setOrderId] = useState(searchParams.get('order') ?? '');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(null);

  const items = stock.data?.items ?? [];
  const item = items.find((candidate) => candidate.id === itemId) ?? null;
  const activeOrders = (orders.data ?? []).filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status));
  const numericQuantity = quantity === '' ? Number.NaN : Number(quantity);
  const evaluation = evaluateMovement(item, { type, quantity: numericQuantity, note, orderId });
  const showError = touched || (item && quantity !== '');

  const reset = () => { setQuantity(''); setNote(''); setTouched(false); };

  const onSubmit = (event) => {
    event.preventDefault();
    setTouched(true);
    setSaved(null);
    if (evaluation.error) return;
    record.mutateAsync({
      itemId,
      type,
      quantity: numericQuantity,
      orderId: type === MOVEMENT_TYPES.USED_ON_ORDER ? orderId : null,
      note: note.trim(),
    }).then((result) => { setSaved(result); reset(); }).catch(() => {});
  };

  return (
    <div className="live-page page-enter">
      <PageHeading eyebrow="TEXTILE · INVENTORY" title="Add or Use Stock" intro="Record every stock movement — received, used on an order, or a correction." />
      <ErrorBanner error={stock.error} fallback="Could not load the stock list." />
      {stock.isLoading ? <Loading label="Loading stock…" /> : (
        <form className="live-panel tx-form tx-narrow" onSubmit={onSubmit}>
          <div className="tx-segments" role="radiogroup" aria-label="Movement type">
            {Object.values(MOVEMENT_TYPES).map((value) => (
              <label key={value} className={`tx-segment ${type === value ? 'selected' : ''}`}>
                <input type="radio" name="movement-type" value={value} checked={type === value} onChange={() => { setType(value); setSaved(null); }} />
                <i aria-hidden="true" />{MOVEMENT_TYPE_LABELS[value]}
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
                min={type === MOVEMENT_TYPES.CORRECTION ? undefined : '0'}
                value={quantity}
                onChange={(event) => { setQuantity(event.target.value); setSaved(null); }}
                placeholder={type === MOVEMENT_TYPES.CORRECTION ? 'e.g. -2 or 5' : 'e.g. 30'}
              />
              {type === MOVEMENT_TYPES.CORRECTION && <span className="field-note">Use a negative number to reduce stock.</span>}
            </label>
            {type === MOVEMENT_TYPES.USED_ON_ORDER && (
              <label className="form-field">Order*
                <select required value={orderId} onChange={(event) => setOrderId(event.target.value)}>
                  <option value="" disabled>Choose the order</option>
                  {activeOrders.map((order) => <option key={order.id} value={order.id}>{order.code} · {order.whatIsWanted}</option>)}
                </select>
              </label>
            )}
            <label className="form-field">Note{type === MOVEMENT_TYPES.CORRECTION ? '*' : ''}
              <input
                required={type === MOVEMENT_TYPES.CORRECTION}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={type === MOVEMENT_TYPES.CORRECTION ? 'Required for a correction' : 'Optional — e.g. delivery note number'}
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
              Saved: {MOVEMENT_TYPE_LABELS[saved.movement.type]} {Math.abs(saved.movement.quantity)} {saved.item.unit} of {saved.item.name}. Balance now {saved.item.quantity}.
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
      <section className="live-panel tx-table-panel">
        <div className="live-panel-heading"><div><p className="eyebrow">AUDIT TRAIL</p><h2>Recent movements</h2></div></div>
        {movements.isLoading ? <Loading label="Loading movements…" /> : <MovementTable movements={movements.data ?? []} limit={8} />}
      </section>
    </div>
  );
}
