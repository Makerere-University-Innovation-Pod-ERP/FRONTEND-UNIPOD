import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { applyStoredTheme } from '@/lib/theme';

import './index.css';

applyStoredTheme();

function renderApp() {
  createRoot(document.getElementById('root')!, {
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

if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
  import('./mocks/browser').then(({ worker }) =>
    worker.start({ onUnhandledFrame: 'bypass' }),
  ).then(renderApp);
} else {
  renderApp();
}
