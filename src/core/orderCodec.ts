import type { Order } from '../types';

// --- CODIFICACIÓN BASE64 UTF-8 (sin escape/unescape deprecados) ---
// Produce el mismo base64 que btoa(unescape(encodeURIComponent(...))), por lo que
// las URLs generadas con la versión anterior siguen siendo compatibles.
export const encodeOrder = (obj: Order): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

export const decodeOrder = (b64: string): Order => {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as Order;
};
