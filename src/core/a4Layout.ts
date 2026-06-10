import type { A4Layout } from '../types';

// Calcula cuántos rectángulos de w x h (cm) entran en una hoja A4 útil.
// Función pura (sin estado ni React), portada tal cual de la lógica original.
export function calcA4Layout(rawW: number | string, rawH: number | string): A4Layout {
  // Forzar mínimo de 2x2 cm
  const w = Math.max(2, parseFloat(String(rawW)) || 2);
  const h = Math.max(2, parseFloat(String(rawH)) || 2);
  if (w <= 0 || h <= 0) return { qty: 0, fitType: 'none', renderW: 0, renderH: 0 };

  // Hoja A4: 21 x 29.7 cm. Usamos 19 x 27.7 cm para márgenes de corte e impresión
  const usableW = 19;
  const usableH = 27.7;
  const spacing = 0.2; // 2mm de separación entre stickers
  const actualW = w + spacing;
  const actualH = h + spacing;

  // Calcular en ambas orientaciones
  const fitPortrait = Math.floor(usableW / actualW) * Math.floor(usableH / actualH);
  const fitLandscape = Math.floor(usableW / actualH) * Math.floor(usableH / actualW);

  // La vista previa se mantiene fija al ancho/alto introducido
  if (fitLandscape > fitPortrait) {
    return { qty: fitLandscape, fitType: 'landscape', renderW: actualW, renderH: actualH };
  }
  return { qty: fitPortrait, fitType: 'portrait', renderW: actualW, renderH: actualH };
}
