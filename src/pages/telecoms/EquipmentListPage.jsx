import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  Boxes,
  CheckCircle2,
  LoaderCircle,
  MapPin,
  RadioTower,
  Search,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarkTelecomsEquipmentWorking, useReportTelecomsFault, useTelecomsEquipment } from '@/hooks/useTelecoms';
import { EquipmentStateBadge, ErrorBanner } from './shared';
import { useUnauthorizedRedirect } from './helpers';

const STATE_OPTIONS = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'IN_USE', label: 'In use' },
  { value: 'LOANED', label: 'Loaned' },
  { value: 'UNDER_MAINTENANCE', label: 'Under maintenance' },
  { value: 'FAULTY', label: 'Fault reported' },
];

export function EquipmentListPage({ token, onUnauthorized }) {
  const [searchParams] = useSearchParams();
  const linkedEquipmentId = searchParams.get('equipment');
  const equipmentQuery = useTelecomsEquipment(token);
  const reportFault = useReportTelecomsFault(token);
  const markWorking = useMarkTelecomsEquipmentWorking(token);
  const [selectedEqId, setSelectedEqId] = useState(null);
  const [faultDescription, setFaultDescription] = useState('');
  const [faultNotice, setFaultNotice] = useState('');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  useUnauthorizedRedirect(onUnauthorized, equipmentQuery.error, reportFault.error, markWorking.error);

  const items = equipmentQuery.data ?? [];
  const selectedItem = items.find((candidate) => candidate.id === selectedEqId);
  const availableUnits = items.reduce((total, item) => total + item.availableQuantity, 0);
  const totalUnits = items.reduce((total, item) => total + item.totalQuantity, 0);
  const attentionCount = items.filter((item) => ['FAULTY', 'UNDER_MAINTENANCE'].includes(item.state)).length;
  const normalizedSearch = search.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    const matchesSearch = !normalizedSearch || [
      item.name,
      item.assetTag,
      item.location,
      item.note,
    ].some((value) => value?.toLowerCase().includes(normalizedSearch));
    return matchesSearch && (stateFilter === 'ALL' || item.state === stateFilter);
  });

  const onSubmitFault = async (e) => {
    e.preventDefault();
    if (!selectedEqId || !faultDescription.trim()) return;
    try {
      await reportFault.mutateAsync({
        equipmentId: selectedEqId,
        description: faultDescription.trim(),
      });
      setFaultNotice(`Fault reported for ${selectedItem?.name}. Equipment flagged and managers notified.`);
      setSelectedEqId(null);
      setFaultDescription('');
    } catch {
      // Error handled below
    }
  };

  return (
    <div className="live-page telecoms-equipment-page page-enter">
      <header className="telecoms-equipment-hero">
        <div className="telecoms-equipment-hero__copy">
          <p className="eyebrow"><RadioTower size={13} /> TELECOMS OPERATIONS · ASSET MANAGEMENT</p>
          <h1>Equipment register</h1>
          <p>Monitor lab equipment, availability, service condition and maintenance actions in one place.</p>
        </div>
        <Link className="btn btn-primary telecoms-equipment-hero__action" to="/telecoms/equipment/lending">
          <ArrowLeftRight size={16} />
          Equipment lending desk
        </Link>
        <div className="telecoms-equipment-hero__stamp" aria-hidden="true"><RadioTower /></div>
      </header>

      <ErrorBanner error={equipmentQuery.error || reportFault.error || markWorking.error} fallback="Could not load or update equipment." />

      {faultNotice && (
        <p className="telecoms-equipment-notice" role="status">
          <CheckCircle2 size={16} />
          {faultNotice}
        </p>
      )}

      {equipmentQuery.isLoading ? (
        <EquipmentListSkeleton />
      ) : (
        <>
          <section className="telecoms-equipment-metrics" aria-label="Equipment summary">
            <MetricCard icon={Boxes} label="Equipment types" value={items.length} detail="Registered assets" tone="green" />
            <MetricCard icon={RadioTower} label="Total units" value={totalUnits} detail="Across all equipment" tone="blue" />
            <MetricCard icon={CheckCircle2} label="Available now" value={availableUnits} detail="Ready to be assigned" tone="mint" />
            <MetricCard icon={Wrench} label="Needs attention" value={attentionCount} detail="Faults or maintenance" tone="amber" />
          </section>

          <section className="telecoms-equipment-inventory" aria-labelledby="telecoms-equipment-inventory-title">
            <div className="telecoms-equipment-inventory__heading">
              <div>
                <p className="eyebrow">LAB INVENTORY</p>
                <h2 id="telecoms-equipment-inventory-title">Equipment</h2>
                <p>Search assets and review their current availability.</p>
              </div>
              <div className="telecoms-equipment-controls">
                <label className="telecoms-equipment-search">
                  <Search size={16} aria-hidden="true" />
                  <span className="sr-only">Search equipment</span>
                  <input
                    type="search"
                    aria-label="Search equipment"
                    placeholder="Search name, tag or location"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <label className="telecoms-equipment-filter">
                  <span className="sr-only">Filter by equipment state</span>
                  <select
                    aria-label="Filter by equipment state"
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                  >
                    <option value="ALL">All conditions</option>
                    {STATE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="telecoms-equipment-results" role="list" aria-label="Equipment items">
              {filteredItems.map((eq) => (
                <article
                  key={eq.id}
                  className="telecoms-equipment-card"
                  role="listitem"
                  data-notification-target={eq.id === linkedEquipmentId ? 'true' : undefined}
                >
                  <div className="telecoms-equipment-card__identity">
                    <span className="telecoms-equipment-card__icon"><RadioTower size={19} /></span>
                    <div className="telecoms-equipment-card__copy">
                      <span className="telecoms-equipment-card__tag">{eq.assetTag}</span>
                      <h3>{eq.name}</h3>
                      <span className="telecoms-equipment-card__location">
                        <MapPin size={13} />{eq.location || 'Location not set'}
                      </span>
                    </div>
                  </div>

                  <div className="telecoms-equipment-card__availability">
                    <span className="telecoms-equipment-card__label">Available / total</span>
                    <strong>{eq.availableQuantity}<small> / {eq.totalQuantity} units</small></strong>
                    <span className="telecoms-equipment-card__meter" aria-hidden="true">
                      <span style={{ width: `${eq.totalQuantity > 0 ? Math.min(100, (eq.availableQuantity / eq.totalQuantity) * 100) : 0}%` }} />
                    </span>
                  </div>

                  <div className="telecoms-equipment-card__condition">
                    <span className="telecoms-equipment-card__label">Condition</span>
                    <EquipmentStateBadge state={eq.state} />
                    <p>{eq.note || 'No service notes'}</p>
                  </div>

                  <div className="telecoms-equipment-card__actions">
                    {eq.state === 'FAULTY' ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        aria-label={`Mark working: ${eq.name}`}
                        disabled={markWorking.isPending}
                        onClick={() => markWorking.mutate(eq.id)}
                      >
                        {markWorking.isPending ? <LoaderCircle className="spin" size={14} /> : <CheckCircle2 size={15} />}
                        Mark working
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline telecoms-equipment-report"
                        aria-label={`Report fault for ${eq.name}`}
                        onClick={() => { setSelectedEqId(eq.id); setFaultDescription(''); }}
                      >
                        <TriangleAlert size={15} />
                        Report fault
                      </button>
                    )}
                  </div>
                </article>
              ))}
              {filteredItems.length === 0 && (
                <div className="telecoms-equipment-empty">
                  <Search size={19} />
                  <p>{items.length ? 'No equipment matches these filters.' : 'No equipment has been registered yet.'}</p>
                  {items.length > 0 && (
                    <button type="button" className="btn btn-outline" onClick={() => { setSearch(''); setStateFilter('ALL'); }}>
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {selectedItem && (
        <section className="live-panel telecoms-equipment-fault" aria-labelledby="telecoms-equipment-fault-title">
          <div className="telecoms-equipment-fault__heading">
            <span><TriangleAlert size={17} /></span>
            <div>
              <p className="eyebrow">SERVICE ACTION</p>
              <h2 id="telecoms-equipment-fault-title">Report a fault</h2>
              <p>{selectedItem.name} <span>·</span> {selectedItem.assetTag}</p>
            </div>
          </div>
          <p className="tx-inline-note">
            Per Rule 12, reporting a fault immediately alerts Pod managers and blocks conflicting bookings until repaired.
          </p>
          <form className="tx-form" onSubmit={onSubmitFault}>
            <div className="form-field">
              <label htmlFor="tl-fault-desc">Issue description <span aria-hidden="true">*</span></label>
              <textarea
                id="tl-fault-desc"
                required
                rows={3}
                placeholder="Describe the failure, damage, error code or calibration issue…"
                value={faultDescription}
                onChange={(e) => setFaultDescription(e.target.value)}
              />
            </div>
            <div className="tx-actions">
              <button className="btn btn-primary" type="submit" disabled={reportFault.isPending || !faultDescription.trim()}>
                {reportFault.isPending ? <LoaderCircle className="spin" size={14} /> : <TriangleAlert size={14} />}
                Submit fault report
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setSelectedEqId(null)}>Cancel</button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone }) {
  return (
    <article className={`telecoms-equipment-metric telecoms-equipment-metric--${tone}`}>
      <span className="telecoms-equipment-metric__icon"><Icon size={17} /></span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function EquipmentListSkeleton() {
  return (
    <div className="telecoms-equipment-skeleton" role="status" aria-label="Loading equipment inventory" aria-busy="true">
      <div className="telecoms-equipment-skeleton__metrics" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="telecoms-equipment-skeleton__metric" key={index}>
            <Skeleton className="telecoms-equipment-skeleton__label" />
            <Skeleton className="telecoms-equipment-skeleton__value" />
            <Skeleton className="telecoms-equipment-skeleton__caption" />
          </div>
        ))}
      </div>
      <div className="telecoms-equipment-skeleton__panel" aria-hidden="true">
        <div className="telecoms-equipment-skeleton__toolbar">
          <div>
            <Skeleton className="telecoms-equipment-skeleton__label" />
            <Skeleton className="telecoms-equipment-skeleton__title" />
          </div>
          <Skeleton className="telecoms-equipment-skeleton__search" />
        </div>
        {Array.from({ length: 4 }, (_, index) => (
          <div className="telecoms-equipment-skeleton__row" key={index}>
            <div className="telecoms-equipment-skeleton__asset">
              <Skeleton className="telecoms-equipment-skeleton__icon" />
              <div>
                <Skeleton className="telecoms-equipment-skeleton__tag" />
                <Skeleton className="telecoms-equipment-skeleton__name" />
                <Skeleton className="telecoms-equipment-skeleton__caption" />
              </div>
            </div>
            <div className="telecoms-equipment-skeleton__stock">
              <Skeleton className="telecoms-equipment-skeleton__label" />
              <Skeleton className="telecoms-equipment-skeleton__value" />
              <Skeleton className="telecoms-equipment-skeleton__meter" />
            </div>
            <div>
              <Skeleton className="telecoms-equipment-skeleton__label" />
              <Skeleton className="telecoms-equipment-skeleton__badge" />
            </div>
            <Skeleton className="telecoms-equipment-skeleton__action" />
          </div>
        ))}
      </div>
    </div>
  );
}
