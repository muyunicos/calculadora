/**
 * UI utility functions
 */

import { ASSETS_URL } from '../core/wp';

/**
 * Returns the CSS class for the info button based on whether it's active
 * @param active - Whether the info panel is currently open
 * @returns CSS class string
 */
export const infoBtnClass = (active: boolean): string =>
  `absolute top-3 right-3 z-10 p-1 rounded-full transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 hover:text-blue-600 border border-slate-200'}`;

// URL absolutas (http/https/protocol-relative), root-relative, data: o anclas:
// se dejan intactas.
const ABSOLUTE_URL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i;

/**
 * Resuelve una ruta de imagen a URL.
 * Las rutas relativas se resuelven contra la carpeta de assets del tema
 * (ASSETS_URL), que es lo que siempre se esperó. Antes era una identidad, así
 * que "2_1_1.png" se pedía a /cotizador/2_1_1.png y siempre daba 404.
 */
export const resolveImage = (src: string): string => {
  if (!src) return '';
  const value = src.trim();
  if (!value || ABSOLUTE_URL.test(value)) return value;
  const base = ASSETS_URL.replace(/\/+$/, '');
  return `${base}/${value.replace(/^\.?\//, '')}`;
};
