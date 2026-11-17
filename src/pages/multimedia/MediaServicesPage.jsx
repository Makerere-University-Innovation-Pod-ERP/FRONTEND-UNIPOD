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
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">OPERATIONS</p>
          <h1>Media Services</h1>
          <p>Podcast, photography, filming and production requests from intake to delivery.</p>
        </div>
      </div>

      <section className="ops-board" aria-label="Media Services Kanban board">
        {COLUMNS.map((column) => {
          const items = allRequests.filter((item) => item.status === column.key);
          return (
            <div key={column.key} className="ops-column">
              <div className="ops-column-head">
                <b>{column.label}</b>
                <span>{items.length}</span>
              </div>
              {items.length === 0 && <p className="ops-column-empty">Nothing here.</p>}
              {items.map((item) => (
                <article
                  key={item.id}
                  data-testid={`media-card-${item.id}`}
                  onClick={() => setSelectedRequest(item)}
                  className="ops-card"
                >
                  <h2>{item.title}</h2>
                  <p>{item.studio && item.studio.trim() ? item.studio : '—'}</p>
                  <p>{item.assignee}</p>
                </article>
              ))}
            </div>
          );
        })}
      </section>

      {selectedRequest && (
        <div role="dialog" aria-modal="true" className="ops-modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="ops-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ops-modal-head">
              <div>
                <span className="ops-modal-eyebrow">Media Request</span>
                <h3>{selectedRequest.title}</h3>
              </div>
              <button type="button" onClick={() => setSelectedRequest(null)} className="ops-modal-close" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="ops-modal-facts">
              <div className="ops-modal-fact"><User size={14} color="var(--muted)" /><span><strong>Assignee:</strong> {selectedRequest.assignee}</span></div>
              <div className="ops-modal-fact"><MapPin size={14} color="var(--muted)" /><span><strong>Studio / Venue:</strong> {selectedRequest.studio || '—'}</span></div>
              {selectedRequest.date && (
                <div className="ops-modal-fact"><Calendar size={14} color="var(--muted)" /><span><strong>Scheduled Slot:</strong> {selectedRequest.date}</span></div>
              )}
              <div className="ops-modal-fact"><FileText size={14} color="var(--muted)" /><span><strong>Stage:</strong> {selectedRequest.status.replace('_', ' ')}</span></div>
            </div>

            {selectedRequest.description && <p className="ops-modal-desc">{selectedRequest.description}</p>}

            <div className="ops-modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setSelectedRequest(null)}>Close</button>
              {selectedRequest.status !== 'DELIVERED' && (
                <button type="button" className="btn btn-primary" onClick={() => handleAdvanceStatus(selectedRequest)}>
                  Advance Stage<ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

