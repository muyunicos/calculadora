import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/ToastProvider';
import { ToastContainer } from './components/Toast';

// --- MONTAJE EN WORDPRESS ---
// El shortcode imprime <div id="mu-sticker-calculator-root">. Lo renderizamos aquí.
if (typeof document !== 'undefined') {
  const rootEl = document.getElementById('mu-sticker-calculator-root');
  if (rootEl) {
    ReactDOM.createRoot(rootEl).render(
      <ToastProvider>
        <App />
        <ToastContainer />
      </ToastProvider>
    );
  }
}
