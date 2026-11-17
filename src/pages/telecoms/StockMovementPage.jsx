import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoaderCircle, Save } from 'lucide-react';
import { evaluateMovement, isLowStock, MOVEMENT_TYPE_LABELS, MOVEMENT_TYPES } from '@/lib/telecoms';
import {
  useRecordTelecomsMovement,
  useTelecomsRequests,
  useTelecomsStock,
  useTelecomsStockMovements,
} from '@/hooks/useTelecoms';
import { ErrorBanner, Loading, PageHeading } from './shared';
import { MovementTable } from './StockListPage';
import { useUnauthorizedRedirect } from './helpers';
import { CurvedSelect } from '@/components/CurvedSelect';

const ACTIVE_REQUEST_STATUSES = ['QUOTED', 'SCHEDULED', 'IN_PROGRESS'];

export function StockMovementPage({ token, onUnauthorized }) {
  const [searchParams] = useSearchParams();
  const stock = useTelecomsStock(token);
  const requests = useTelecomsRequests(token);
  const movements = useTelecomsStockMovements(token);
  const recordMutation = useRecordTelecomsMovement(token);

  useUnauthorizedRedirect(
    onUnauthorized,
    stock.error,
    requests.error,
    movements.error,
    recordMutation.error,
  );

  const initialType = Object.values(MOVEMENT_TYPES).includes(searchParams.get('type'))
    ? searchParams.get('type')
    : MOVEMENT_TYPES.RECEIVED;

  const [type, setType] = useState(initialType);
  const [itemId, setItemId] = useState(searchParams.get('item') ?? '');
  const [quantity, setQuantity] = useState('');
  const [requestId, setRequestId] = useState(searchParams.get('request') ?? '');
  const [note, setNote] = useState('');
  const [savedNotice, setSavedNotice] = useState('');

  const items = stock.data ?? [];
  const item = items.find((candidate) => candidate.id === itemId) ?? null;
  const activeRequests = (requests.data ?? []).filter((r) => ACTIVE_REQUEST_STATUSES.includes(r.status));
  const numericQuantity = quantity === '' ? Number.NaN : Number(quantity);
  const evaluation = evaluateMovement(item, { type, quantity: numericQuantity, note, requestId });

  const reset = () => {
    setQuantity('');
    setNote('');
  };

  const onSubmit = (event) => {
    event.preventDefault();
    setSavedNotice('');
    if (evaluation.error) return;
    recordMutation
      .mutateAsync({
        itemId,
        type,
        quantity: numericQuantity,
        requestId: type === MOVEMENT_TYPES.USED_ON_REQUEST ? requestId : null,
        note: note.trim(),
      })
      .then((res) => {
        setSavedNotice(`Stock updated: ${res.item.name} new balance is ${res.item.quantity} ${res.item.unit}.`);
        reset();
      })
      .catch(() => {});
  };

  return (
    <div className="live-page page-enter">
      <PageHeading
        eyebrow="TELECOMS · INVENTORY"
        title="Add or Use Stock"
        intro="Record incoming deliveries, parts issued for diagnostic requests, or inventory audit adjustments."
      />
      <ErrorBanner error={stock.error || recordMutation.error} fallback="Could not record stock movement." />

      {savedNotice && <p className="tx-success">{savedNotice}</p>}

      {stock.isLoading ? (
        <Loading label="Loading stock items…" />
      ) : (
        <form className="live-panel tx-form tx-narrow" onSubmit={onSubmit}>
          <div className="tx-segments" role="radiogroup" aria-label="Movement type">
            {Object.values(MOVEMENT_TYPES).map((val) => (
              <label key={val} className={`tx-segment ${type === val ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="movement-type"
                  value={val}
                  checked={type === val}
                  onChange={() => { setType(val); setSavedNotice(''); }}
                />
                <i aria-hidden="true" />
                {MOVEMENT_TYPE_LABELS[val]}
              </label>
            ))}
          </div>

          <div className="form-field">
            <label htmlFor="mov-item">Component Item *</label>
            <CurvedSelect
              id="mov-item"
              placeholder="Choose an item…"
              value={itemId}
              options={[
                { value: '', label: 'Choose an item…' },
                ...items.map((candidate) => ({
                  value: candidate.id,
                  label: `${candidate.name} (${candidate.quantity} ${candidate.unit} in stock)${isLowStock(candidate) ? ' [LOW STOCK]' : ''}`,
                })),
              ]}
              onChange={(e) => { setItemId(e.target.value); setSavedNotice(''); }}
            />
          </div>

          <div className="form-field">
            <label htmlFor="mov-qty">Quantity ({item?.unit || 'units'}) *</label>
            <input
              id="mov-qty"
              required
              type="number"
              step="any"
              min={type === MOVEMENT_TYPES.CORRECTION ? undefined : '0'}
              value={quantity}
              placeholder="e.g. 5"
              onChange={(e) => { setQuantity(e.target.value); setSavedNotice(''); }}
            />
          </div>

          {type === MOVEMENT_TYPES.USED_ON_REQUEST && (
            <div className="form-field">
              <label htmlFor="mov-req">Associated Telecoms Request *</label>
              <CurvedSelect
                id="mov-req"
                placeholder="Select an active request…"
                value={requestId}
                options={[
                  { value: '', label: 'Select an active request…' },
                  ...activeRequests.map((r) => ({
                    value: r.id,
                    label: `${r.code} — ${r.serviceWanted} (${r.customerName})`,
                  })),
                ]}
                onChange={(e) => setRequestId(e.target.value)}
              />
            </div>
          )}

          <div className="form-field">
            <label htmlFor="mov-note">
              Notes {type === MOVEMENT_TYPES.CORRECTION && '(Required for audit correction) *'}
            </label>
            <textarea
              id="mov-note"
              rows={2}
              required={type === MOVEMENT_TYPES.CORRECTION}
              placeholder={
                type === MOVEMENT_TYPES.CORRECTION
                  ? 'Reason for recount discrepancy…'
                  : 'Supplier invoice number or usage detail…'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {item && !Number.isNaN(numericQuantity) && (
            <div className={`tx-inline-note ${evaluation.error ? 'tx-clash' : ''}`}>
              {evaluation.error ? (
                <span><b>Cannot commit:</b> {evaluation.error}</span>
              ) : (
                <span>
                  Resulting balance will be <b>{evaluation.balance} {item.unit}</b> of {item.name}.
                </span>
              )}
            </div>
          )}

          <div className="tx-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={Boolean(evaluation.error) || recordMutation.isPending || !itemId || quantity === ''}
            >
              {recordMutation.isPending ? <LoaderCircle className="spin" size={14} /> : <Save size={14} />}
              Record Stock Movement
            </button>
          </div>
        </form>
      )}

      <section className="live-panel tx-table-panel" style={{ marginTop: 20 }}>
        <h3 className="tx-panel-title">Recent Stock Movement Log</h3>
        <MovementTable movements={movements.data ?? []} />
      </section>
    </div>
  );
}
