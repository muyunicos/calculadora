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

  // Se prueban ambas orientaciones de la hoja.
  const orientations = [
    { sheetW: sheet.width, sheetH: sheet.height, rotated: false },
    { sheetW: sheet.height, sheetH: sheet.width, rotated: true },
  ];

  type Best = { qty: number; rotated: boolean; finalWmm: number; finalHmm: number };
  let best: Best | null = null;

  for (const orientation of orientations) {
    const cols = Math.floor(orientation.sheetW / rectWmm);
    const rows = Math.floor(orientation.sheetH / rectHmm);
    if (cols < 1 || rows < 1) continue; // el sticker no entra en esta orientación

    const qty = cols * rows;
    let finalWmm = rectWmm;
    let finalHmm = rectHmm;

    if (mode === 'economico' && sheet.tolerance > 0) {
      // Solo se agranda (nunca se achica) y como máximo la tolerancia permitida.
      const wPerfect = orientation.sheetW / cols;
      const hPerfect = orientation.sheetH / rows;
      if (wPerfect >= rectWmm && wPerfect - rectWmm <= sheet.tolerance) finalWmm = wPerfect;
      if (hPerfect >= rectHmm && hPerfect - rectHmm <= sheet.tolerance) finalHmm = hPerfect;
    }

    if (!best || qty > best.qty) {
      best = { qty, rotated: orientation.rotated, finalWmm, finalHmm };
    }
  }

  if (!best) {
    // No entra en ninguna orientación: qty 0 y el motor de precios no cotiza.
    return {
      qty: 0,
      fitType: 'none',
      renderW: w,
      renderH: h,
      sheetRotated: false,
      adjustedW: w,
      adjustedH: h,
    };
  }

  const renderW = round1(best.finalWmm / 10);
  const renderH = round1(best.finalHmm / 10);

  return {
    qty: best.qty,
    fitType: best.rotated ? 'landscape' : 'portrait',
    renderW,
    renderH,
    adjustedW: renderW,
    adjustedH: renderH,
    sheetRotated: best.rotated,
  };
}