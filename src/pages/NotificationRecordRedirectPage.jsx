import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { bookingsApi } from '@/services/bookings';
import { ApiError } from '@/services/api-client';
import { isCncFacility } from '@/services/cnc';
import { equipmentApi } from '@/services/equipment';
import { telecomsApi } from '@/services/telecoms';
import { textileApi } from '@/services/textile';
import { Skeleton } from '@/components/ui/skeleton';

export function NotificationRecordRedirectPage({ token, onUnauthorized }) {
  const { entityType, entityId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function openRecord() {
      setError('');
      try {
        const target = await resolveTarget(entityType, entityId, token, controller.signal);
        if (active && target) navigate(target, { replace: true });
        else if (active) setError('The linked record was not found in a workspace your account can access.');
      } catch (reason) {
        if (reason instanceof ApiError && reason.status === 401) {
          onUnauthorized?.();
          return;
        }
        if (active) setError(reason instanceof Error ? reason.message : 'The linked record could not be opened.');
      }
    }

    void openRecord();
    return () => {
      active = false;
      controller.abort();
    };
  }, [entityId, entityType, navigate, onUnauthorized, token]);

  return (
    <div
      className="live-panel not-found-live"
      role={error ? 'alert' : 'status'}
      aria-busy={!error}
      aria-label={error ? undefined : 'Opening notification destination'}
    >
      {error ? (
        <>
          <p className="eyebrow">RECORD UNAVAILABLE</p>
          <h1>{error}</h1>
          <Link className="btn btn-primary" to="/notifications">Back to notifications</Link>
        </>
      ) : (
        <div className="space-y-4" aria-hidden="true">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-9 w-3/4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
      )}
    </div>
  );
}

async function resolveTarget(entityType, entityId, token, signal) {
  const kind = entityType?.toLowerCase();
  if (kind === 'equipment_item') {
    const [multimedia, telecoms] = await accessibleResults([
      equipmentApi.list(token, signal),
      telecomsApi.equipment(token, signal),
    ]);
    if (multimedia?.some((item) => item.id === entityId)) {
      return `/multimedia/equipment?equipment=${encodeURIComponent(entityId)}`;
    }
    if (telecoms?.some((item) => item.id === entityId)) {
      return `/telecoms/equipment?equipment=${encodeURIComponent(entityId)}`;
    }
  }

  if (kind === 'stock_item') {
    const [textile, telecoms] = await accessibleResults([
      textileApi.stock(token, signal).then((result) => result.items),
      telecomsApi.stock(token, signal),
    ]);
    if (textile?.some((item) => item.id === entityId)) {
      return `/textile/stock/movements?item=${encodeURIComponent(entityId)}`;
    }
    if (telecoms?.some((item) => item.id === entityId)) {
      return `/telecoms/stock/movements?item=${encodeURIComponent(entityId)}`;
    }
  }

  if (kind === 'machine') {
    const [facilities, textile] = await accessibleResults([
      bookingsApi.facilities(token, signal),
      textileApi.machines(token, signal),
    ]);
    if (facilities?.some((item) => item.id === entityId && isCncFacility(item))) {
      return `/cnc/machines?machine=${encodeURIComponent(entityId)}`;
    }
    if (textile?.some((item) => item.id === entityId)) {
      return `/textile/machines?machine=${encodeURIComponent(entityId)}`;
    }
  }

  return null;
}

async function accessibleResults(requests) {
  const results = await Promise.allSettled(requests);
  const inaccessible = [];
  const values = results.map((result) => {
    if (result.status === 'fulfilled') return result.value;
    const reason = result.reason;
    if (reason instanceof ApiError && [403, 404].includes(reason.status)) {
      inaccessible.push(reason);
      return null;
    }
    throw reason;
  });
  if (values.every((value) => value === null) && inaccessible.length) throw inaccessible[0];
  return values;
}
