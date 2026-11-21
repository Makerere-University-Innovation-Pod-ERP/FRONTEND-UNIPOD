import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ListChecks, LoaderCircle, Pencil, Plus } from 'lucide-react';
import { CNC_MOVEMENT_TYPE_LABELS, isLowStock, movementDelta } from '@/lib/cnc';
import { useCncStock, useCncStockMovements, useUpdateCncStockMinimum } from '@/hooks/useCnc';
import { ErrorBanner, Loading, PageHeading, StatusDot } from './shared';
import { formatDateTime, useUnauthorizedRedirect } from '../textile/helpers';

export function StockListPage({ token, onUnauthorized }) {
  const stock = useCncStock(token);
  const movements = useCncStockMovements(token);
  useUnauthorizedRedirect(onUnauthorized, stock.error, movements.error);
  const items = stock.data?.items ?? [];
  const lowCount = items.filter(isLowStock).length;
  const [query, setQuery] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const needle = query.trim().toLowerCase();
  const visibleItems = items.filter((item) =>
    (!lowOnly || isLowStock(item)) && (!needle || `${item.name} ${item.location}`.toLowerCase().includes(needle)));

  return (
    <div className="live-page page-enter">
      <PageHeading title="Stock List" intro="Wood, sheets, blades and consumables with a low-stock flag per item.">
        <Link className="btn btn-primary" to="/cnc/stock/movements"><Plus size={15} />Add or use stock</Link>
      </PageHeading>
      <ErrorBanner error={stock.error} fallback="Could not load the stock list." />
      {stock.isLoading ? <Loading label="Loading stock…" /> : (
        <>
          <section className="tx-metrics" aria-label="Stock summary">
            <article className="live-metric"><p>Items tracked <ListChecks size={14} /></p><strong>{items.length}</strong></article>
            <article className={`live-metric ${lowCount ? 'tx-metric-alert' : ''}`}><p>Low stock <AlertTriangle size={14} /></p><strong>{lowCount}</strong><small>Below configured minimum</small></article>
            <article className="live-metric"><p>Movements this week <Activity size={14} /></p><strong>{stock.data?.movementsThisWeek ?? 0}</strong></article>
          </section>
          <section className="live-panel tx-table-panel">
            <div className="tx-stock-filters">
              <input type="search" aria-label="Search stock" placeholder="Search by item or location" value={query} onChange={(event) => setQuery(event.target.value)} />
              <label className="tx-check"><input type="checkbox" checked={lowOnly} onChange={(event) => setLowOnly(event.target.checked)} /><span>Low stock only</span></label>
            </div>
            {visibleItems.length === 0 && <p className="live-empty">No items match{needle ? ` “${query.trim()}”` : ''}{lowOnly ? ' among low-stock items' : ''}.</p>}
            <div className="live-table-wrap">
              <table className="live-table">
                <thead><tr><th>Item</th><th>Quantity</th><th>Minimum</th><th>Location</th><th>Status</th></tr></thead>
                <tbody>
                  {visibleItems.map((item) => (
                    <tr key={item.id}>
                      <td><b className="tx-strong">{item.name}</b></td>
                      <td className="tx-mono">{item.quantity}</td>
                      <td><MinimumCell token={token} item={item} onUnauthorized={onUnauthorized} /></td>
                      <td>{item.location}</td>
                      <td>{isLowStock(item) ? <StatusDot tone="danger">Low stock</StatusDot> : <StatusDot tone="positive">OK</StatusDot>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      <section className="live-panel tx-table-panel">
        <div className="live-panel-heading"><div><p className="eyebrow">AUDIT TRAIL</p><h2>Recent movements</h2></div></div>
        <ErrorBanner error={movements.error} fallback="Could not load stock movements." />
        {movements.isLoading ? <Loading label="Loading movements…" /> : <MovementTable movements={movements.data ?? []} />}
      </section>
    </div>
  );
}

function MinimumCell({ token, item, onUnauthorized }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.minimum));
  const update = useUpdateCncStockMinimum(token);
  useUnauthorizedRedirect(onUnauthorized, update.error);

  if (!editing) {
    return (
      <span className="tx-min">
        <span className="tx-mono">{item.minimum}</span>
        <button type="button" className="icon-button tx-icon-sm" aria-label={`Change minimum for ${item.name}`} onClick={() => { setValue(String(item.minimum)); setEditing(true); }}>
          <Pencil size={12} />
        </button>
      </span>
    );
  }
  return (
    <form className="tx-min-form" onSubmit={(event) => {
      event.preventDefault();
      update.mutateAsync({ id: item.id, minimum: Number(value) }).then(() => setEditing(false)).catch(() => {});
    }}>
      <input aria-label={`Minimum for ${item.name}`} type="number" min="0" step="any" required value={value} onChange={(event) => setValue(event.target.value)} autoFocus />
      <button type="submit" className="btn btn-primary" disabled={update.isPending}>{update.isPending ? <LoaderCircle size={12} className="spin" /> : 'Save'}</button>
      <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
      {update.error && <span className="tx-field-error" role="alert">{update.error.message}</span>}
    </form>
  );
}

export function MovementTable({ movements, limit = 12 }) {
  const [showAll, setShowAll] = useState(false);
  if (!movements.length) return <p className="live-empty">No stock movements recorded yet.</p>;
  const shown = showAll ? movements : movements.slice(0, limit);
  return (
    <>
    <div className="live-table-wrap">
      <table className="live-table">
        <thead><tr><th>When</th><th>Item</th><th>Movement</th><th>Change</th><th>Balance</th><th>Job / note</th><th>By</th></tr></thead>
        <tbody>
          {shown.map((movement) => {
            const delta = movementDelta(movement.type, movement.quantity);
            return (
              <tr key={movement.id}>
                <td>{formatDateTime(movement.at)}</td>
                <td>{movement.itemName}</td>
                <td>{CNC_MOVEMENT_TYPE_LABELS[movement.type]}</td>
                <td className={`tx-mono ${delta < 0 ? 'tx-negative' : 'tx-positive'}`}>{delta > 0 ? `+${delta}` : delta}</td>
                <td className="tx-mono">{movement.balanceAfter}</td>
                <td>
                  {movement.jobCode
                    ? <Link to={`/cnc/jobs/${encodeURIComponent(movement.jobId)}`}>{movement.jobCode}</Link>
                    : movement.jobId || movement.note || '—'}
                </td>
                <td>{movement.by}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    {movements.length > limit && (
      <button type="button" className="tx-link-button" onClick={() => setShowAll((value) => !value)}>
        {showAll ? `Show the latest ${limit} only` : `Show all ${movements.length} movements`}
      </button>
    )}
    </>
  );
}
