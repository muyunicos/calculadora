import type { A4Layout } from '../types';

/**
 * Calcula cuántos rectángulos de w x h (cm) entran en una hoja A4 útil.
 * Ahora rota la HOJA en lugar del sticker para optimizar el espacio.
 * Función pura (sin estado ni React), portada tal cual de la lógica original.
 */
export function calcA4Layout(rawW: number | string, rawH: number | string, mode: 'preciso' | 'economico' = 'preciso'): A4Layout {
  // Si alguno de los valores está vacío o es 0, no realizar cálculo
  const w = parseFloat(String(rawW));
  const h = parseFloat(String(rawH));
  
  if (!w || !h || w <= 0 || h <= 0) {
    return { qty: 0, fitType: 'none', renderW: 0, renderH: 0, sheetRotated: false, adjustedW: w || 0, adjustedH: h || 0 };
  }

  // Forzar mínimo de 2x2 cm
  const finalW = Math.max(2, w);
  const finalH = Math.max(2, h);

  // Convertir a mm para el cálculo
  const rectWmm = finalW * 10;
  const rectHmm = finalH * 10;

  // Dimensiones base de la hoja según modo
  let baseSheetWmm: number;
  let baseSheetHmm: number;
  let tolerance: number;

  if (mode === 'preciso') {
    baseSheetWmm = 203;
    baseSheetHmm = 271;
    tolerance = 0;
  } else {
    baseSheetWmm = 210;
    baseSheetHmm = 297;
    tolerance = 5;
  }

  // Probar ambas orientaciones de la HOJA (no del sticker)
  const orientations = [
    { sheetW: baseSheetWmm, sheetH: baseSheetHmm, rotated: false },  // Hoja normal
    { sheetW: baseSheetHmm, sheetH: baseSheetWmm, rotated: true },   // Hoja rotada 90°
  ];

  let bestResult: { qty: number; sheetRotated: boolean; cols: number; rows: number; finalW: number; finalH: number } | null = null;

  orientations.forEach((ori) => {
    // Calcular cuántos entran del sticker en orientación FIJA
    const cols = Math.floor(ori.sheetW / rectWmm);
    const rows = Math.floor(ori.sheetH / rectHmm);

    if (cols < 1 || rows < 1) return; // No entra en esta orientación

    const qty = cols * rows;

    // Para modo económico, calcular ajuste al valor más cercano
    let finalWmm = rectWmm;
    let finalHmm = rectHmm;

    if (mode === 'economico' && tolerance > 0) {
      // Ajustar ancho al valor más cercano que permita mejor distribución
      const wPerfect = ori.sheetW / cols;
      const hPerfect = ori.sheetH / rows;

      // En lugar de forzar al mínimo, usar el valor más cercano dentro de tolerancia
      if (Math.abs(wPerfect - rectWmm) <= tolerance) {
        finalWmm = wPerfect;
      } else if (wPerfect > rectWmm + tolerance) {
        finalWmm = rectWmm; // Mantener original si el ajuste excede tolerancia
      }

      if (Math.abs(hPerfect - rectHmm) <= tolerance) {
        finalHmm = hPerfect;
      } else if (hPerfect > rectHmm + tolerance) {
        finalHmm = rectHmm;
      }
    }

    // Seleccionar la mejor orientación (máxima cantidad)
    if (!bestResult || qty > bestResult.qty) {
      bestResult = {
        qty,
        sheetRotated: ori.rotated,
        cols,
        rows,
        finalW: finalWmm / 10,
        finalH: finalHmm / 10,
      };
    }
  });

  if (!bestResult) {
    return { qty: 0, fitType: 'none', renderW: w, renderH: h, sheetRotated: false, adjustedW: w, adjustedH: h };
  }

  return {
    qty: bestResult.qty,
    fitType: bestResult.sheetRotated ? 'landscape' : 'portrait',
    renderW: bestResult.finalW,
    renderH: bestResult.finalH,
    adjustedW: bestResult.finalW,
    adjustedH: bestResult.finalH,
    sheetRotated: bestResult.sheetRotated,
  };
}
