import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

if (import.meta.env.PROD) {
  // Disable React DevTools in production
  const devToolsHook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (typeof devToolsHook === "object") {
    for (const [key, value] of Object.entries(devToolsHook)) {
      devToolsHook[key] = typeof value === "function" ? () => {} : null;
    }
  }
}

if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
  });
}

const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
