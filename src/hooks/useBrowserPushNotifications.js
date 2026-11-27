import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/services/api-client';
import { notificationsApi } from '@/services/notifications';

let subscriptionUpdates = Promise.resolve();

export function isBrowserPushSupported() {
  return typeof window !== 'undefined'
    && window.isSecureContext
    && 'Notification' in window
    && 'PushManager' in window
    && 'serviceWorker' in navigator;
}

export function useBrowserPushNotifications(token, onUnauthorized, active = true) {
  const [registeredToken, setRegisteredToken] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const supported = isBrowserPushSupported();
  const configuration = useQuery({
    queryKey: ['notifications', 'push-config', token],
    queryFn: ({ signal }) => notificationsApi.pushConfiguration(token, signal),
    enabled: Boolean(token && active),
    retry: false,
    staleTime: 5 * 60_000,
  });
  const unavailable = configuration.error instanceof ApiError
    && [404, 501].includes(configuration.error.status);

  useEffect(() => {
    if (configuration.error instanceof ApiError && configuration.error.status === 401) {
      onUnauthorized?.();
    }
  }, [configuration.error, onUnauthorized]);

  useEffect(() => {
    let active = true;
    if (!active || !supported || !token) return () => { active = false; };

    const sync = subscriptionUpdates.catch(() => {}).then(async () => {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (!active || !subscription || !configuration.data?.enabled) return;
      try {
        await notificationsApi.registerPushSubscription(token, subscription.toJSON());
        if (active) setRegisteredToken(token);
      } catch (reason) {
        if (active) {
          if (reason instanceof ApiError && reason.status === 401) onUnauthorized?.();
          setError(reason instanceof Error ? reason.message : 'Could not sync this browser subscription.');
        }
      }
    });
    subscriptionUpdates = sync.catch(() => {});

    sync.catch((reason) => {
      if (active) {
        if (reason instanceof ApiError && reason.status === 401) onUnauthorized?.();
        setError(reason instanceof Error ? reason.message : 'Could not sync this browser subscription.');
      }
    });

    return () => {
      active = false;
      subscriptionUpdates = subscriptionUpdates.catch(() => {}).then(async () => {
        const registration = await navigator.serviceWorker.getRegistration('/');
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await notificationsApi.removePushSubscription(token, subscription.endpoint);
        }
      }).catch(() => {});
    };
  }, [active, configuration.data?.enabled, onUnauthorized, supported, token]);

  const enable = async () => {
    setError('');
    if (!supported) {
      setError('This browser does not support secure background push notifications.');
      return false;
    }
    if (!configuration.data?.enabled || !configuration.data.publicKey) {
      setError(configuration.error instanceof ApiError
        && [404, 501].includes(configuration.error.status)
        ? 'Browser alerts are not available for this workspace yet.'
        : 'Browser push notifications are not configured on the server.');
      return false;
    }
    if (Notification.permission === 'denied') {
      setError('Notifications are blocked in this browser. Allow them in site settings to enable push.');
      return false;
    }

    setWorking(true);
    try {
      const permission = Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission !== 'granted') throw new Error('Allow browser notifications to enable push.');

      const registration = await navigator.serviceWorker.register('/service-worker.js');
      const current = await registration.pushManager.getSubscription();
      const subscription = current ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeApplicationServerKey(configuration.data.publicKey),
      });
      await notificationsApi.registerPushSubscription(token, subscription.toJSON());
      setRegisteredToken(token);
      return true;
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized?.();
      setError(reason instanceof Error ? reason.message : 'Could not enable browser push notifications.');
      return false;
    } finally {
      setWorking(false);
    }
  };

  const disable = async () => {
    setError('');
    setWorking(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) {
        setRegisteredToken(null);
        return true;
      }

      await notificationsApi.removePushSubscription(token, subscription.endpoint);
      setRegisteredToken(null);
      const removed = await subscription.unsubscribe();
      if (!removed) throw new Error('The browser could not remove its push subscription.');
      return true;
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized?.();
      setError(reason instanceof Error ? reason.message : 'Could not disable browser push notifications.');
      return false;
    } finally {
      setWorking(false);
    }
  };

  return {
    supported,
    permission: supported ? Notification.permission : 'unsupported',
    enabled: Boolean(active && configuration.data?.enabled),
    unavailable,
    loading: configuration.isLoading,
    subscribed: Boolean(configuration.data?.enabled && token && registeredToken === token),
    working,
    error: error || (!unavailable && configuration.error instanceof Error ? configuration.error.message : ''),
    enable,
    disable,
  };
}

function decodeApplicationServerKey(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = window.atob(padded);
  const key = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    key[index] = binary.charCodeAt(index);
  }
  return key;
}
