import React, { useState } from 'react';
import { X, Calendar, MapPin, User, FileText, ArrowRight } from 'lucide-react';
import { useMediaOverview, useUpdateMediaStatus } from '@/hooks/useMedia';

const COLUMNS = [
  { key: 'REQUESTED', label: 'REQUESTED' },
  { key: 'SCHEDULED', label: 'SCHEDULED' },
  { key: 'IN_PRODUCTION', label: 'IN PRODUCTION' },
  { key: 'DELIVERED', label: 'DELIVERED' },
];

const FALLBACK_REQUESTS = [
  {
    id: 'media-req-1',
    title: 'Podcast — Innovation Spotlight Ep.12',
    studio: '—',
    assignee: 'Grace Namuli',
    status: 'REQUESTED',
    date: '31 Oct · 11:00',
    description: 'Weekly spotlight conversation covering student and general innovations under review.',
  },
  {
    id: 'media-req-2',
    title: 'Product photography — Harvesting Kit',
    studio: 'Multimedia Studio A',
    assignee: 'Katia Birungi',
    status: 'SCHEDULED',
    date: '2 Nov · 14:00',
    description: 'High-resolution still photography for refined agricultural harvesting kit prototypes.',
  },
  {
    id: 'media-req-3',
    title: 'Promo filming — UNIPOD Open Day',
    studio: 'Multimedia Studio B',
    assignee: 'Katia Birungi',
    status: 'IN_PRODUCTION',
    date: '30 Oct · 10:30',
    description: 'B-roll footage and promotional trailers for Makerere UNIPOD annual open day.',
  },
  {
    id: 'media-req-4',
    title: 'Docuseries — Heritage Project ep.2',
    studio: 'Multimedia Studio B',
    assignee: 'Daniel Kato',
    status: 'IN_PRODUCTION',
    date: '1 Nov · 15:00',
    description: 'Documentary production documenting indigenous innovation archives and cultural heritage.',
  },
  {
    id: 'media-req-5',
    title: 'Partner MOU signing coverage',
    studio: 'Multimedia Studio A',
    assignee: 'Katia Birungi',
    status: 'DELIVERED',
    date: '28 Oct · 16:00',
    description: 'Official video and photo coverage of multilateral UNDP partnership agreement.',
  },
];

export function MediaServicesPage({ token }) {
  const { data: overview } = useMediaOverview(token);
  const updateStatus = useUpdateMediaStatus(token);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const allRequests = overview?.requests ?? FALLBACK_REQUESTS;

  const handleAdvanceStatus = (request) => {
    let nextStatus = 'SCHEDULED';
    if (request.status === 'REQUESTED') nextStatus = 'SCHEDULED';
    else if (request.status === 'SCHEDULED') nextStatus = 'IN_PRODUCTION';
    else if (request.status === 'IN_PRODUCTION') nextStatus = 'DELIVERED';
    else return;

    updateStatus.mutate(
      { id: request.id, status: nextStatus },
      {
        onSuccess: () => {
          setSelectedRequest((prev) => (prev ? { ...prev, status: nextStatus } : null));
        },
      },
    );
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Eyebrow & Title Area */}
      <div style={{ marginBottom: '32px' }}>
        <p
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.14em',
            color: '#1b5e43',
            textTransform: 'uppercase',
            margin: '0 0 8px 0',
          }}
        >
          OPERATIONS
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(28px, 3.5vw, 34px)',
            lineHeight: 1.15,
            fontWeight: 600,
            color: '#16221a',
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em',
          }}
        >
          Media Services
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: '#7a847b',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Podcast, photography, filming and production requests from intake to delivery.
        </p>
      </div>

      {/* 4-column Kanban Grid */}
      <section className="media-board-grid" aria-label="Media Services Kanban board">
        {COLUMNS.map((column) => {
          const items = allRequests.filter((item) => item.status === column.key);
          const count = items.length;

          return (
            <div
              key={column.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  paddingLeft: '2px',
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#7a847b',
                    textTransform: 'uppercase',
                  }}
                >
                  {column.label}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#8c958d',
                  }}
                >
                  {count}
                </span>
              </div>

              {/* Cards list */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {items.map((item) => (
                  <article
                    key={item.id}
                    data-testid={`media-card-${item.id}`}
                    onClick={() => setSelectedRequest(item)}
                    className="media-card"
                  >
                    <h2
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#16221a',
                        margin: '0 0 10px 0',
                        lineHeight: 1.35,
                      }}
                    >
                      {item.title}
                    </h2>

                    <p
                      style={{
                        fontSize: '12px',
                        color: '#7a847b',
                        margin: '0 0 3px 0',
                        lineHeight: 1.4,
                      }}
                    >
                      {item.studio && item.studio.trim() ? item.studio : '—'}
                    </p>

                    <p
                      style={{
                        fontSize: '12px',
                        color: '#7a847b',
                        margin: 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {item.assignee}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Interactive Media Request Detail Modal */}
      {selectedRequest && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setSelectedRequest(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#1b5e43',
                    marginBottom: '4px',
                    letterSpacing: '0.08em',
                  }}
                >
                  Media Request
                </span>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '22px',
                    fontWeight: 600,
                    margin: 0,
                    color: '#16221a',
                  }}
                >
                  {selectedRequest.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                style={{
                  border: 'none',
                  background: '#f2f4ee',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#414842',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                background: '#fafbfa',
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid #eef0eb',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#414842' }}>
                <User size={14} color="#7a847b" />
                <span>
                  <strong>Assignee:</strong> {selectedRequest.assignee}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#414842' }}>
                <MapPin size={14} color="#7a847b" />
                <span>
                  <strong>Studio / Venue:</strong> {selectedRequest.studio || '—'}
                </span>
              </div>
              {selectedRequest.date && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#414842' }}>
                  <Calendar size={14} color="#7a847b" />
                  <span>
                    <strong>Scheduled Slot:</strong> {selectedRequest.date}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#414842' }}>
                <FileText size={14} color="#7a847b" />
                <span>
                  <strong>Stage:</strong> {selectedRequest.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {selectedRequest.description && (
              <p style={{ fontSize: '12px', color: '#555e56', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                {selectedRequest.description}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                style={{
                  background: '#eef0ea',
                  color: '#414842',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>

              {selectedRequest.status !== 'DELIVERED' && (
                <button
                  type="button"
                  onClick={() => handleAdvanceStatus(selectedRequest)}
                  style={{
                    background: '#1b5e43',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Advance Stage</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

