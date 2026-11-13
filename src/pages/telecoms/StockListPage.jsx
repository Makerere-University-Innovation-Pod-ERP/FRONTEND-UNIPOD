import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ListChecks, LoaderCircle, Pencil, Plus } from 'lucide-react';
import { isLowStock, MOVEMENT_TYPE_LABELS, movementDelta } from '@/lib/telecoms';
import { useTelecomsStock, useTelecomsStockMovements, useUpdateTelecomsStockMinimum } from '@/hooks/useTelecoms';
import { ErrorBanner, Loading, PageHeading, StatusDot } from './shared';
import { formatDateTime, useUnauthorizedRedirect } from './helpers';

export function StockListPage({ token, onUnauthorized }) {
  const stock = useTelecomsStock(token);
  const movements = useTelecomsStockMovements(token);
  useUnauthorizedRedirect(onUnauthorized, stock.error, movements.error);

  const items = stock.data ?? [];
  const lowCount = items.filter(isLowStock).length;

  return (
    <div className="live-page page-enter">
      <PageHeading
        eyebrow="TELECOMS · INVENTORY (TL9)"
        title="Telecoms Parts & Supplies"
        intro="RF connectors, coaxial cables, microcontrollers, capacitors, soldering flux and test leads."
      >
        <Link className="btn btn-primary" to="/telecoms/stock/movements">
          <Plus size={15} />Add or use stock
        </Link>
      </PageHeading>

      <ErrorBanner error={stock.error} fallback="Could not load telecoms inventory." />

      {stock.isLoading ? (
        <Loading label="Loading stock items…" />
      ) : (
        <>
          <section className="tx-metrics" aria-label="Stock summary">
            <article className="live-metric">
              <p>Components Tracked <ListChecks size={14} /></p>
              <strong>{items.length}</strong>
            </article>
            <article className={`live-metric ${lowCount ? 'tx-metric-alert' : ''}`}>
              <p>Low Stock Alert <AlertTriangle size={14} /></p>
              <strong>{lowCount}</strong>
              <small>Below configured threshold</small>
            </article>
            <article className="live-metric">
              <p>Recent Movements <Activity size={14} /></p>
              <strong>{(movements.data ?? []).length}</strong>
            </article>
          </section>

          <section className="live-panel tx-table-panel">
            <div className="live-table-wrap">
              <table className="live-table">
                <thead>
                  <tr>
                    <th>Component Name</th>
                    <th>In Stock</th>
                    <th>Minimum</th>
                    <th>Storage Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td><b style={{ fontSize: '14.5px', color: '#0f172a' }}>{item.name}</b></td>
                      <td className="tx-mono">
                        <b style={{ fontSize: '14px', color: '#0f172a' }}>{item.quantity}</b>{' '}
                        <span style={{ color: '#475569', fontSize: '13px' }}>{item.unit}</span>
                      </td>
                      <td>
                        <MinimumCell token={token} item={item} onUnauthorized={onUnauthorized} />
                      </td>
                      <td style={{ fontSize: '13.5px', color: '#334155' }}>{item.location}</td>
                      <td>
                        {isLowStock(item) ? (
                          <StatusDot tone="danger">Low Stock</StatusDot>
                        ) : (
                          <StatusDot tone="positive">Sufficient</StatusDot>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="live-panel tx-table-panel">
        <div className="live-panel-heading">
          <div>
            <p className="eyebrow">AUDIT TRAIL</p>
            <h2>Stock movement log</h2>
          </div>
        </div>
        <ErrorBanner error={movements.error} fallback="Could not load stock movements." />
        {movements.isLoading ? (
          <Loading label="Loading movements…" />
        ) : (
          <MovementTable movements={movements.data ?? []} />
        )}
      </section>
    </div>
  );
}

function MinimumCell({ token, item, onUnauthorized }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.minimum));
  const update = useUpdateTelecomsStockMinimum(token, item.id);
  useUnauthorizedRedirect(onUnauthorized, update.error);

  if (!editing) {
    return (
      <span className="tx-min">
        <span className="tx-mono">{item.minimum}</span>
        <button
          type="button"
          className="icon-button tx-icon-sm"
          aria-label={`Change minimum for ${item.name}`}
          onClick={() => { setValue(String(item.minimum)); setEditing(true); }}
        >
          <Pencil size={12} />
        </button>
      </span>
    );
  }

  return (
    <form
      className="tx-min-form"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutateAsync(Number(value)).then(() => setEditing(false)).catch(() => {});
      }}
    >
      <input
        aria-label={`Minimum for ${item.name}`}
        type="number"
        min="0"
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <button type="submit" className="btn btn-primary" disabled={update.isPending}>
        {update.isPending ? <LoaderCircle size={12} className="spin" /> : 'Save'}
      </button>
      <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
    </form>
  );
}

export function MovementTable({ movements }) {
  if (movements.length === 0) return <p className="live-empty">No movements recorded yet.</p>;

  return (
    <div className="live-table-wrap">
      <table className="live-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Item</th>
            <th>Type</th>
            <th>Change</th>
            <th>Balance</th>
            <th>Recorded By</th>
            <th>Notes / Ref</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((mov) => {
            const delta = movementDelta(mov.type, mov.quantity);
            const positive = delta > 0;
            return (
              <tr key={mov.id}>
                <td style={{ fontSize: '12.5px', color: '#334155', whiteSpace: 'nowrap' }}>{formatDateTime(mov.at)}</td>
                <td><b style={{ fontSize: '14px', color: '#0f172a' }}>{mov.itemName}</b></td>
                <td><StatusDot tone="neutral">{MOVEMENT_TYPE_LABELS[mov.type] ?? mov.type}</StatusDot></td>
                <td className={`tx-mono ${positive ? 'tx-positive' : 'tx-negative'}`}>
                  <b>{positive ? `+${delta}` : delta}</b>
                </td>
                <td className="tx-mono"><b>{mov.balance}</b></td>
                <td style={{ fontSize: '13px', color: '#1e293b' }}>{mov.by}</td>
                <td style={{ fontSize: '13px', color: '#475569' }}>
                  {mov.requestId && <span className="tx-mono" style={{ marginRight: 6, color: '#176b52' }}>{mov.requestId}</span>}
                  {mov.note || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
