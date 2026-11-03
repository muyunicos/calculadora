import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/ToastProvider';
import { ToastContainer } from './components/Toast';

// --- MONTAJE EN WORDPRESS ---
// El shortcode imprime <div id="mu-sticker-calculator-root">. Lo renderizamos aquí.
// Si el div no existe (shortcode mal escrito, página equivocada) antes no pasaba
// nada y no había forma de saber por qué: ahora queda un warning en consola.
// El flag en el DOM evita el doble render si el bundle se carga dos veces.
const MOUNTED_FLAG = 'muCalculatorMounted';

if (typeof document !== 'undefined') {
  const rootEl = document.getElementById('mu-sticker-calculator-root');
  if (!rootEl) {
    console.warn('[calculadora] No se encontró #mu-sticker-calculator-root: el widget no se montó.');
  } else if (rootEl.dataset[MOUNTED_FLAG] === '1') {
    console.warn('[calculadora] El widget ya estaba montado en este div; se omite el segundo render.');
  } else {
    rootEl.dataset[MOUNTED_FLAG] = '1';
    ReactDOM.createRoot(rootEl).render(
      <ToastProvider>
        <App />
        <ToastContainer />
      </ToastProvider>
    );
  }
}