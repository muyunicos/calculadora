import type { A4Layout } from '../types';

// Dimensiones ÚTILES de la hoja en mm.
// - preciso: A4 menos márgenes de impresión (203x271), sin tolerancia.
// - economico: A4 completa (210x297) y se permite "estirar" cada sticker hasta
//   5 mm para repartir el espacio sin sobrantes (no es un margen blanco).
const SHEETS = {
  preciso: { width: 203, height: 271, tolerance: 0 },
  economico: { width: 210, height: 297, tolerance: 5 },
} as const;

const round1 = (value: number): number => Math.round((value + Number.EPSILON) * 10) / 10;

/**
 * Calcula cuántos rectángulos de w x h (cm) entran en una hoja A4 útil.
 * Rota la HOJA (no el sticker) y elige la orientación que más unidades rinde.
 * Función pura: mismas entradas -> mismas salidas.
 */
export function calcA4Layout(
  rawW: number | string,
  rawH: number | string,
  mode: 'preciso' | 'economico' = 'preciso',
): A4Layout {
  const w = parseFloat(String(rawW));
  const h = parseFloat(String(rawH));

  // Sin medidas válidas no hay cálculo.
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return {
      qty: 0,
      fitType: 'none',
      renderW: 0,
      renderH: 0,
      sheetRotated: false,
      adjustedW: Number.isFinite(w) ? w : 0,
      adjustedH: Number.isFinite(h) ? h : 0,
    };
  }

  // Mínimo 2x2 cm (mismo piso que la UI).
  const rectWmm = Math.max(2, w) * 10;
  const rectHmm = Math.max(2, h) * 10;
  const sheet = SHEETS[mode] ?? SHEETS.preciso;
  const tol = sheet.tolerance;

  // Ajusta UN eje: intenta AGRANDAR hasta 'tol'; si no se puede, ACHICA hasta 'tol'
  // (solo en económico, donde tol > 0) para aprovechar una fila/columna más.
  const fitAxis = (
    sheetDim: number,
    rectDim: number,
    allowShrink: boolean,
  ): { count: number; size: number } => {
    const k = Math.floor(sheetDim / rectDim);
    if (k < 1) return { count: 0, size: rectDim };
    const up = sheetDim / k;
    if (up - rectDim <= tol) return { count: k, size: up }; // agrandar
    if (allowShrink) {
      const down = sheetDim / (k + 1);
      if (rectDim - down <= tol) return { count: k + 1, size: down }; // achicar
    }
    return { count: k, size: rectDim };
  };

  // Se prueban ambas orientaciones de la hoja.
  const orientations = [
    { sheetW: sheet.width, sheetH: sheet.height, rotated: false },
    { sheetW: sheet.height, sheetH: sheet.width, rotated: true },
  ];

  // Fase 1: elegir la orientación con más stickers (solo agrandando, como antes).
  let pick: { qty: number; rotated: boolean; sheetW: number; sheetH: number } | null = null;
  for (const o of orientations) {
    const cols = fitAxis(o.sheetW, rectWmm, false).count;
    const rows = fitAxis(o.sheetH, rectHmm, false).count;
    if (cols < 1 || rows < 1) continue; // el sticker no entra en esta orientación
    const qty = cols * rows;
    if (!pick || qty > pick.qty) {
      pick = { qty, rotated: o.rotated, sheetW: o.sheetW, sheetH: o.sheetH };
    }
  }

  if (!pick) {
    // No entra en ninguna orientación: qty 0 y el motor de precios no cotiza.
    return {
      qty: 0,
      fitType: 'none',
      renderW: w,
      renderH: h,
      sheetRotated: false,
      adjustedW: w,
      adjustedH: h,
      exactW: w,
      exactH: h,
    };
  }

  // Fase 2: sobre la orientación elegida, achicar los ejes que no se pudieron agrandar.
  const bestW = fitAxis(pick.sheetW, rectWmm, true);
  const bestH = fitAxis(pick.sheetH, rectHmm, true);
  const qty = bestW.count * bestH.count;

  const renderW = round1(bestW.size / 10);
  const renderH = round1(bestH.size / 10);

  return {
    qty,
    fitType: pick.rotated ? 'landscape' : 'portrait',
    renderW,
    renderH,
    adjustedW: renderW,
    adjustedH: renderH,
    exactW: bestW.size / 10,
    exactH: bestH.size / 10,
    sheetRotated: pick.rotated,
  };
}
