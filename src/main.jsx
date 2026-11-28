import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { applyStoredTheme } from '@/lib/theme';

import './index.css';

applyStoredTheme();

function renderApp() {
  createRoot(document.getElementById('root'), {
    // Keeps caught errors off reportError(), which would raise the dev overlay.
    onCaughtError: (error, errorInfo) => {
      console.error(error, errorInfo.componentStack);
    },
  }).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
}

function removeStaleMockWorker() {
  if (!('serviceWorker' in navigator)) {
    renderApp();
    return;
  }

  const isMockWorker = (worker) => (
    worker && new URL(worker.scriptURL).pathname === '/mockServiceWorker.js'
  );
  if (!isMockWorker(navigator.serviceWorker.controller)) {
    renderApp();
    return;
  }

  const reloadMarker = 'unipod:stale-mock-worker-reloaded';
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => {
      const staleRegistrations = registrations.filter((registration) =>
        [registration.active, registration.waiting, registration.installing].some(isMockWorker));
      return Promise.all(staleRegistrations.map((registration) => registration.unregister()));
    })
    .then(() => {
      if (sessionStorage.getItem(reloadMarker) === '1') {
        sessionStorage.removeItem(reloadMarker);
        renderApp();
        return;
      }
      sessionStorage.setItem(reloadMarker, '1');
      window.location.reload();
    })
    .catch((error) => {
      console.error('Could not remove a stale mock service worker.', error);
      renderApp();
    });
}

const shouldEnableMocks =
  import.meta.env.VITE_ENABLE_MOCKS === 'true' ||
  import.meta.env.MODE === 'textile';

if (shouldEnableMocks) {
  import('./mocks/browser').then(({ worker }) =>
    worker.start({ onUnhandledRequest: 'bypass' }),
  ).then(renderApp);
} else {
  removeStaleMockWorker();
}
