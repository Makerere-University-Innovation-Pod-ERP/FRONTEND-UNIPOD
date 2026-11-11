import { useState } from 'react';
import {
  Folder,
  FileText,
  RotateCw,
  Wrench,
  Calendar,
  ChevronRight,
  ArrowRight,
  X,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { useFinanceOverview } from '@/hooks/useOverview';

/**
 * Finance Officer - Overview Page
 * Role-based dashboard tailored for Daniel Kato, Finance Officer.
 * Displays operations KPIs, innovation pipeline at a glance, priority items needing attention,
 * month-to-date income analytics, live facility occupancy, and recent activity log.
 */
export function FinanceOverviewPage({ token, onUnauthorized }) {
  const { data: overview, isLoading, error } = useFinanceOverview(token);

  // Modal interaction states
  const [selectedAttentionItem, setSelectedAttentionItem] = useState(null);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);

  if (error?.status === 401) {
    onUnauthorized?.();
  }

  if (isLoading && !overview) {
    return (
      <div className="live-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <p className="eyebrow" style={{ color: '#1b5e43' }}>LOADING DASHBOARD</p>
        <p style={{ color: '#6b7280', marginTop: '8px' }}>Retrieving finance and operational overview…</p>
      </div>
    );
  }

  const {
    eyebrow = 'FINANCE OFFICER',
    greeting = 'Good morning, Daniel.',
    subtitle = "Here's what's moving across the innovation pipeline and UniPod operations today.",
    metrics = [],
    pipelineStages = [],
    needsAttention = [],
    income = {},
    facilities = [],
    recentActivities = [],
  } = overview || {};

  // Render metric icon dynamically based on card spec
  const renderMetricIcon = (iconName, variant) => {
    const isSpecialVariant = variant === 'forest' || variant === 'burgundy';
    const badgeStyle = {
      width: 32,
      height: 32,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isSpecialVariant ? 'rgba(255, 255, 255, 0.12)' : '#eef7f0',
      color: isSpecialVariant ? '#ffffff' : '#1b5e43',
    };

    switch (iconName) {
      case 'Folder':
        return (
          <div style={badgeStyle}>
            <Folder size={15} />
          </div>
        );
      case 'FileText':
        return (
          <div style={badgeStyle}>
            <FileText size={15} />
          </div>
        );
      case 'RotateCw':
        return (
          <div style={badgeStyle}>
            <RotateCw size={15} />
          </div>
        );
      case 'Wrench':
        return (
          <div style={badgeStyle}>
            <Wrench size={15} />
          </div>
        );
      case 'Calendar':
        return (
          <div style={badgeStyle}>
            <Calendar size={15} />
          </div>
        );
      default:
        return (
          <div style={badgeStyle}>
            <TrendingUp size={15} />
          </div>
        );
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '32px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <p
          className="eyebrow"
          style={{
            color: '#1b5e43',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '6px',
          }}
        >
          {eyebrow}
        </p>
        <h1
          style={{
            fontFamily: 'Newsreader, Georgia, serif',
            fontSize: '34px',
            fontWeight: 400,
            color: '#111827',
            letterSpacing: '-0.02em',
            margin: '0 0 6px 0',
            lineHeight: 1.15,
          }}
        >
          {greeting}
        </h1>
        <p style={{ color: '#6b7280', fontSize: '13px', margin: 0, fontWeight: 400 }}>
          {subtitle}
        </p>
      </div>

      {/* Row 1: 5 KPI Metric Cards */}
      <section aria-label="Key Performance Indicators" className="overview-metric-grid">
        {metrics.map((card) => {
          const isForest = card.variant === 'forest';
          const isBurgundy = card.variant === 'burgundy';
          const cardClass = isForest
            ? 'overview-metric-card card-forest'
            : isBurgundy
            ? 'overview-metric-card card-burgundy'
            : 'overview-metric-card card-default';

          const labelColor = isForest ? '#9ec5b1' : isBurgundy ? '#c99b8f' : '#6b7280';
          const valueColor = isForest || isBurgundy ? '#ffffff' : '#111827';
          const subtextColor = isForest ? '#9ec5b1' : isBurgundy ? '#c99b8f' : '#6b7280';

          return (
            <div key={card.id} className={cardClass}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: labelColor,
                    textTransform: 'uppercase',
                  }}
                >
                  {card.label}
                </span>
                {renderMetricIcon(card.icon, card.variant)}
              </div>

              <div style={{ margin: '14px 0 6px' }}>
                <span
                  style={{
                    fontSize: '34px',
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    color: valueColor,
                  }}
                >
                  {card.value}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: subtextColor, fontWeight: 500 }}>
                {card.subtext}
              </div>
            </div>
          );
        })}
      </section>

      {/* Row 2: Pipeline at a glance & Needs attention */}
      <section aria-label="Operations Pipeline and Action Items" className="overview-middle-grid">
        {/* Left: Pipeline at a glance */}
        <div className="overview-panel-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 3px 0' }}>
                  Pipeline at a glance
                </h2>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                  A flexible guide, not a fixed sequence.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReportsModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1b5e43',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Open reports <ArrowRight size={13} />
              </button>
            </div>

            {/* 6 Sub-boxes */}
            <div className="overview-pipeline-subgrid">
              {pipelineStages.map((stage) => (
                <div key={stage.key} className="overview-subbox">
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                    }}
                  >
                    {stage.label}
                  </span>
                  <span
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: '#111827',
                      marginTop: '6px',
                      lineHeight: 1,
                    }}
                  >
                    {stage.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Needs attention */}
        <div className="overview-panel-card">
          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 3px 0' }}>
              Needs attention
            </h2>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
              {needsAttention.length} items with an open next step
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {needsAttention.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelectedAttentionItem(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '9px 10px',
                  borderRadius: '10px',
                  border: '1px solid transparent',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background-color .12s ease, border-color .12s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8faf7';
                  e.currentTarget.style.borderColor = '#e3e7df';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                {/* Index Pill */}
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: '#e8f5ec',
                    color: '#1b5e43',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginRight: '12px',
                  }}
                >
                  {item.index}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#111827',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                    {item.subtext}
                  </div>
                </div>

                {/* Chevron */}
                <ChevronRight size={15} style={{ color: '#9ca3af', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Row 3: Income, Facilities, Recent Activity */}
      <section aria-label="Financials, Facilities, and Activity" className="overview-bottom-grid">
        {/* Card 1: Income (month to date) */}
        <div
          className="overview-panel-card"
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          onClick={() => setShowIncomeModal(true)}
          title="Click to view detailed invoices breakdown"
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                Income (month to date)
              </h2>
              <DollarSign size={16} style={{ color: '#1b5e43' }} />
            </div>

            <div
              style={{
                fontSize: '26px',
                fontWeight: 700,
                color: '#111827',
                letterSpacing: '-0.02em',
                margin: '8px 0 18px',
              }}
            >
              {income.amountFormatted}
            </div>

            {/* Mini Bar Chart */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '8px',
                height: '70px',
                paddingBottom: '4px',
              }}
            >
              {income.bars?.map((bar, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    height: `${bar.value}%`,
                    backgroundColor: bar.color,
                    borderRadius: '4px',
                    transition: 'transform .12s ease',
                  }}
                  title={`${bar.label}: ${bar.value}% volume`}
                />
              ))}
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '14px', fontWeight: 500 }}>
            {income.subtext}
          </div>
        </div>

        {/* Card 2: Facilities right now */}
        <div className="overview-panel-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
              Facilities right now
            </h2>
            <Building2 size={16} style={{ color: '#6b7280' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {facilities.map((facility) => (
              <div
                key={facility.id}
                onClick={() => setSelectedFacility(facility)}
                style={{ cursor: 'pointer' }}
                title="Click to view facility bookings"
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    marginBottom: '5px',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#1f2937' }}>{facility.name}</span>
                  <span style={{ color: '#6b7280' }}>
                    {facility.bookings} {facility.bookings === 1 ? 'booking' : 'bookings'}
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: 5,
                    borderRadius: 9999,
                    background: '#e5e7eb',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${facility.percentage}%`,
                      background: facility.percentage > 0 ? '#1b5e43' : 'transparent',
                      borderRadius: 9999,
                      transition: 'width .2s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Recent activity */}
        <div className="overview-panel-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
              Recent activity
            </h2>
            <Clock size={16} style={{ color: '#6b7280' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {recentActivities.map((act) => (
              <div key={act.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#1b5e43',
                    marginTop: '5px',
                    flexShrink: 0,
                  }}
                />
                <div style={{ fontSize: '12px', lineHeight: 1.45 }}>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{act.actor}</span>{' '}
                  <span style={{ color: '#4b5563' }}>{act.action}</span>{' '}
                  <span style={{ fontWeight: 600, color: '#111827' }}>{act.target}</span>
                  {act.actionSuffix && (
                    <span style={{ color: '#4b5563' }}> {act.actionSuffix}</span>
                  )}
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                    {act.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modal: Attention Item Details */}
      {selectedAttentionItem && (
        <div className="modal-backdrop" onClick={() => setSelectedAttentionItem(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '520px', borderRadius: '16px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#e8f5ec',
                    color: '#1b5e43',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedAttentionItem.index}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                    {selectedAttentionItem.title}
                  </h3>
                  <small style={{ color: '#6b7280' }}>Code: {selectedAttentionItem.code}</small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAttentionItem(null)}
                className="icon-button"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Current Next Step
                  </span>
                  <strong style={{ color: '#111827' }}>{selectedAttentionItem.subtext}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Assigned Sector
                  </span>
                  <strong style={{ color: '#111827' }}>{selectedAttentionItem.sector}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Category
                  </span>
                  <strong style={{ color: '#111827', textTransform: 'capitalize' }}>
                    {selectedAttentionItem.category} submission
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                    Assigned Officer
                  </span>
                  <strong style={{ color: '#111827' }}>Daniel Kato (Finance)</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedAttentionItem(null)}
              >
                Dismiss
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  alert(`Navigating to case file: ${selectedAttentionItem.code}`);
                  setSelectedAttentionItem(null);
                }}
              >
                Open case file
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Open Reports Overview */}
      {showReportsModal && (
        <div className="modal-backdrop" onClick={() => setShowReportsModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '580px', borderRadius: '16px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                  Pipeline Analytics & Reports
                </h3>
                <small style={{ color: '#6b7280' }}>
                  Performance breakdown across active submission pipelines
                </small>
              </div>
              <button
                type="button"
                onClick={() => setShowReportsModal(false)}
                className="icon-button"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#f8faf7', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Active Cases</span>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#1b5e43', marginTop: '4px' }}>8</div>
              </div>
              <div style={{ background: '#f8faf7', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Avg. Velocity</span>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#1b5e43', marginTop: '4px' }}>4.2 d</div>
              </div>
              <div style={{ background: '#f8faf7', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Resolution Rate</span>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#1b5e43', marginTop: '4px' }}>92%</div>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              All 10 recorded submissions are indexed across Mak engineering faculties. Revenue verification and MOU renewal checks are on track.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowReportsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Income Invoices Breakdown */}
      {showIncomeModal && (
        <div className="modal-backdrop" onClick={() => setShowIncomeModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '580px', borderRadius: '16px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                  Month-to-Date Revenue Breakdown
                </h3>
                <small style={{ color: '#6b7280' }}>
                  Total: {income.amountFormatted} ({income.subtext})
                </small>
              </div>
              <button
                type="button"
                onClick={() => setShowIncomeModal(false)}
                className="icon-button"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: '#f8faf7', border: '1px solid #e3e7df' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#111827' }}>INV-2026-041 · Studio Hire</strong>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>Kampala AgriTech Collective · Verified</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '13px', color: '#1b5e43' }}>UGX 550,000</strong>
                  <div style={{ fontSize: '10px', color: '#1b5e43', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                    <CheckCircle size={10} /> Verified
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: '#f8faf7', border: '1px solid #e3e7df' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#111827' }}>INV-2026-039 · CNC Prototyping</strong>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>EcoBuild Uganda Ltd · Verified</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '13px', color: '#1b5e43' }}>UGX 420,000</strong>
                  <div style={{ fontSize: '10px', color: '#1b5e43', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                    <CheckCircle size={10} /> Verified
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: '#f8faf7', border: '1px solid #e3e7df' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#111827' }}>INV-2026-037 · Media Production</strong>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>Makerere Health Sciences · Verified</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '13px', color: '#1b5e43' }}>UGX 380,000</strong>
                  <div style={{ fontSize: '10px', color: '#1b5e43', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                    <CheckCircle size={10} /> Verified
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: '#f8faf7', border: '1px solid #e3e7df' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#111827' }}>INV-2026-035 · Equipment Testing</strong>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>Telecoms Lab · Verified</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '13px', color: '#1b5e43' }}>UGX 270,000</strong>
                  <div style={{ fontSize: '10px', color: '#1b5e43', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                    <CheckCircle size={10} /> Verified
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: '#fff9eb', border: '1px solid #fde68a' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#92400e' }}>INV-2026-042 · Audio Recording</strong>
                  <div style={{ fontSize: '11px', color: '#b45309' }}>Innovation Spotlight · Awaiting bank evidence</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '13px', color: '#92400e' }}>UGX 150,000</strong>
                  <div style={{ fontSize: '10px', color: '#d97706', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                    <AlertCircle size={10} /> Pending
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowIncomeModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Facility Details */}
      {selectedFacility && (
        <div className="modal-backdrop" onClick={() => setSelectedFacility(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '500px', borderRadius: '16px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                  {selectedFacility.name}
                </h3>
                <small style={{ color: '#6b7280' }}>
                  Active Bookings: {selectedFacility.bookings} of {selectedFacility.capacity} slots
                </small>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFacility(null)}
                className="icon-button"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              {selectedFacility.bookings > 0
                ? `${selectedFacility.name} currently has ${selectedFacility.bookings} scheduled sessions today. Equipment calibration is up to date.`
                : `${selectedFacility.name} has no bookings right now and is available for ad-hoc reservation.`}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedFacility(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
