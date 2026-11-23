import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/services/notifications';

export function isBrowserPushSupported() {
  return typeof window !== 'undefined'
    && window.isSecureContext
    && 'Notification' in window
    && 'PushManager' in window
    && 'serviceWorker' in navigator;
}

export function useBrowserPushNotifications(token) {
  const [subscribed, setSubscribed] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const supported = isBrowserPushSupported();
  const configuration = useQuery({
    queryKey: ['notifications', 'push-config', token],
    queryFn: ({ signal }) => notificationsApi.pushConfiguration(token, signal),
    enabled: Boolean(token),
    retry: false,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    let active = true;
    if (!supported || !token) return () => { active = false; };

    navigator.serviceWorker.getRegistration('/')
      .then((registration) => registration?.pushManager.getSubscription())
      .then(async (subscription) => {
        if (!active || !subscription) return;
        setSubscribed(true);
        if (configuration.data?.enabled) {
          await notificationsApi.registerPushSubscription(token, subscription.toJSON());
        }
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not sync this browser subscription.');
      });

    return () => { active = false; };
  }, [configuration.data?.enabled, supported, token]);

  const enable = async () => {
    setError('');
    if (!supported) {
      setError('This browser does not support secure background push notifications.');
      return false;
    }
    if (!configuration.data?.enabled || !configuration.data.publicKey) {
      setError('Browser push notifications are not configured on the server.');
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
      setSubscribed(true);
      return true;
    } catch (reason) {
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
        setSubscribed(false);
        return true;
      }

      await notificationsApi.removePushSubscription(token, subscription.endpoint);
      const removed = await subscription.unsubscribe();
      if (!removed) throw new Error('The browser could not remove its push subscription.');
      setSubscribed(false);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not disable browser push notifications.');
      return false;
    } finally {
      setWorking(false);
    }
  };

  return {
    supported,
    permission: supported ? Notification.permission : 'unsupported',
    enabled: Boolean(configuration.data?.enabled),
    loading: configuration.isLoading,
    subscribed,
    working,
    error: error || (configuration.error instanceof Error ? configuration.error.message : ''),
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
