import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, FileText, LoaderCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '@/services/api-client';
import { mediaApi } from '@/services/media';

export function SubmitterMediaDeliveryPage({ token, onUnauthorized }) {
  const { id } = useParams();
  const request = useQuery({
    queryKey: ['submitter', 'media-request', id],
    queryFn: ({ signal }) => mediaApi.getRequest(id, token, signal),
    enabled: Boolean(id && token),
  });

  useEffect(() => {
    if (request.error instanceof ApiError && request.error.status === 401) onUnauthorized?.();
  }, [onUnauthorized, request.error]);

  if (request.isPending) {
    return <div className="live-panel" role="status"><LoaderCircle className="spin" size={18} />Loading your media delivery…</div>;
  }
  if (request.error || !request.data) {
    return (
      <div className="live-panel not-found-live" role="alert">
        <p className="eyebrow">DELIVERY UNAVAILABLE</p>
        <h1>{request.error instanceof Error ? request.error.message : 'This media request could not be loaded.'}</h1>
        <Link className="btn btn-primary" to="/notifications">Back to notifications</Link>
      </div>
    );
  }

  const { data } = request;
  const deliveryLinks = data.deliveryPayload?.delivery_links ?? [];
  const files = data.deliveryPayload?.file_ids ?? [];

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">MY WORKSPACE · MEDIA DELIVERY</p>
          <h1>{data.title}</h1>
          <p>Request {data.code} · Delivered {data.deliveredAt ? new Date(data.deliveredAt).toLocaleString() : '—'}</p>
        </div>
        <span className="tx-status tx-success"><CheckCircle2 size={14} />{data.status}</span>
      </div>

      {data.deliveryPayload?.note_to_submitter && (
        <section className="live-panel">
          <h2 className="tx-panel-title">Message from the media team</h2>
          <p>{data.deliveryPayload.note_to_submitter}</p>
        </section>
      )}

      <section className="live-panel">
        <h2 className="tx-panel-title">Your delivered files</h2>
        {deliveryLinks.length > 0 ? (
          <ul>
            {deliveryLinks.map((entry, index) => {
              const label = typeof entry === 'string' ? entry : entry?.label || entry?.name || `Delivery link ${index + 1}`;
              const href = typeof entry === 'string' ? entry : entry?.url;
              return (
                <li key={`${label}-${index}`}>
                  {isSafeExternalUrl(href) ? (
                    <a href={href} target="_blank" rel="noreferrer">
                      {label}<ExternalLink size={14} aria-hidden="true" />
                    </a>
                  ) : <span>{label}</span>}
                </li>
              );
            })}
          </ul>
        ) : files.length > 0 ? (
          <ul>{files.map((file, index) => <li key={`${file}-${index}`}><FileText size={14} />{String(file)}</li>)}</ul>
        ) : (
          <p>The delivery is recorded, but no file links were attached to this request.</p>
        )}
      </section>
      <Link className="btn btn-outline" to="/notifications">Back to notifications</Link>
    </div>
  );
}

function isSafeExternalUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    return ['https:', 'http:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
