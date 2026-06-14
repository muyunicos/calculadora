import type { A4Layout } from '../types';

interface OptimalLayoutResult {
  qty: number;
  cols: number;
  rows: number;
  finalW: number;
  finalH: number;
  diff: number;
  rotated: boolean;
}

/**
 * Calcula el tamaño óptimo de rectángulos en una hoja,
 * priorizando la máxima cantidad de etiquetas, con menor deformación como desempate.
 *
 * @param sheetW - Ancho de la hoja en mm (ej. 210 para A4)
 * @param sheetH - Alto de la hoja en mm (ej. 297 para A4)
 * @param rectW - Ancho base del rectángulo en mm
 * @param rectH - Alto base del rectángulo en mm
 * @param tolerance - Tolerancia permitida en mm (ej. 5)
 * @returns El mejor resultado con la máxima cantidad y nuevas medidas, o null si no entra
 */
function calculateOptimalLayout(
  sheetW: number,
  sheetH: number,
  rectW: number,
  rectH: number,
  tolerance: number
): OptimalLayoutResult | null {
  const results: OptimalLayoutResult[] = [];

  // Evaluamos ambas orientaciones para detectar la más favorable
  const orientations = [
    { w: rectW, h: rectH, rotated: false },
    { w: rectH, h: rectW, rotated: true },
  ];

  orientations.forEach((ori) => {
    const minW = ori.w - tolerance;
    const maxW = ori.w + tolerance;
    const minH = ori.h - tolerance;
    const maxH = ori.h + tolerance;

    // Evitar cálculos inválidos si la tolerancia es mayor a la medida
    if (minW <= 0 || minH <= 0) return;

    // Máximo absoluto de columnas y filas que podrían entrar (usando la medida mínima)
    const maxCols = Math.floor(sheetW / minW);
    const maxRows = Math.floor(sheetH / minH);

    for (let c = 1; c <= maxCols; c++) {
      for (let r = 1; r <= maxRows; r++) {
        // 1. Evaluar ancho
        const wPerfect = sheetW / c;
        let finalW: number;
        if (wPerfect >= minW && wPerfect <= maxW) {
          finalW = wPerfect; // Encaje perfecto
        } else if (wPerfect > maxW) {
          finalW = ori.w; // No llega al máximo, usamos medida original y dejamos margen
        } else {
          continue; // Imposible, es menor a la tolerancia
        }

        // 2. Evaluar alto
        const hPerfect = sheetH / r;
        let finalH: number;
        if (hPerfect >= minH && hPerfect <= maxH) {
          finalH = hPerfect; // Encaje perfecto
        } else if (hPerfect > maxH) {
          finalH = ori.h; // Usamos medida original y dejamos margen
        } else {
          continue; // Imposible
        }

        results.push({
          qty: c * r,
          cols: c,
          rows: r,
          finalW: Math.round(finalW * 100) / 100,
          finalH: Math.round(finalH * 100) / 100,
          diff: Math.abs(finalW - ori.w) + Math.abs(finalH - ori.h),
          rotated: ori.rotated,
        });
      }
    }
  });

  if (results.length === 0) return null;

  // ORDENAMIENTO
  // 1. Priorizamos SIEMPRE la mayor cantidad de etiquetas.
  // 2. Si dos opciones dan la misma cantidad (ej: 15 rotado vs 15 normal),
  // nos quedamos con la que menos deforme el diseño.
  results.sort((a, b) => {
    if (b.qty !== a.qty) return b.qty - a.qty; // Mayor cantidad gana
    return a.diff - b.diff; // Menor deformación desempata
  });

  return results[0];
}

// Calcula cuántos rectángulos de w x h (cm) entran en una hoja A4 útil.
// Función pura (sin estado ni React), portada tal cual de la lógica original.
export function calcA4Layout(rawW: number | string, rawH: number | string, mode: 'preciso' | 'economico' = 'preciso'): A4Layout {
  // Forzar mínimo de 2x2 cm
  const w = Math.max(2, parseFloat(String(rawW)) || 2);
  const h = Math.max(2, parseFloat(String(rawH)) || 2);
  if (w <= 0 || h <= 0) return { qty: 0, fitType: 'none', renderW: 0, renderH: 0 };

  // Convertir a mm para el cálculo
  const rectWmm = w * 10;
  const rectHmm = h * 10;

  let sheetWmm: number;
  let sheetHmm: number;
  let tolerance: number;

  if (mode === 'preciso') {
    // Modo preciso: espacio de corte preciso (203x271mm)
    sheetWmm = 203;
    sheetHmm = 271;
    tolerance = 0;
  } else {
    // Modo económico: total de la hoja (210x297mm)
    sheetWmm = 210;
    sheetHmm = 297;
    tolerance = 5;
  }

  const result = calculateOptimalLayout(sheetWmm, sheetHmm, rectWmm, rectHmm, tolerance);

  if (!result) {
    // Si no entra en la hoja, devolver las dimensiones originales con qty 0
    return { qty: 0, fitType: 'none', renderW: w, renderH: h, adjustedW: w, adjustedH: h };
  }

  // Convertir de vuelta a cm
  const finalWcm = result.finalW / 10;
  const finalHcm = result.finalH / 10;

  return {
    qty: result.qty,
    fitType: result.rotated ? 'landscape' : 'portrait',
    renderW: finalWcm,
    renderH: finalHcm,
    adjustedW: finalWcm,
    adjustedH: finalHcm,
  };
}
