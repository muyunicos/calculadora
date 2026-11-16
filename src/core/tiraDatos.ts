/**
 * Datos de la tira UNIFICADA (spec 037/038, Fase N).
 *
 * Funciones PURAS (sin React ni DOM) que convierten un item de la tira en los
 * datos que consume el MOTOR del tema (`MU.coleccion` / `MU.visor`). Estan aca
 * (y no inline en el componente) porque son las que se prueban con `npm test`.
 */

import type { GalleryPricing } from '../types';

/** Titulo de la tira cuando no hay uno declarado. */
export const TITULO_TIRA = 'Sugerencias';

/** Valores viejos que ya NO se usan (se migran al nuevo en caliente). */
const TITULOS_VIEJOS = ['ideas y favoritos', 'ideas', ''];

/**
 * Titulo visible de la tira.
 *
 * El texto vive en `datos_config.json` (`tiraNombre`) y en produccion quedo el
 * valor viejo "Ideas y favoritos": se normaliza aca para no depender de que el
 * admin reescriba el JSON.
 */
export function normalizarTitulo(tiraNombre?: string | null): string {
  const t = String(tiraNombre ?? '').trim();
  if (TITULOS_VIEJOS.indexOf(t.toLowerCase()) >= 0) return TITULO_TIRA;
  return t || TITULO_TIRA;
}

export type OrigenTira = 'tienda' | 'custom' | 'historial';

/**
 * Categoria de la tarjeta, con la precedencia acordada:
 *   1. COMPRADO  (item que ya se pidio, sea del admin o del cliente)
 *   2. GUARDADO  (idea guardada por el cliente)
 *   3. PROMO     (item del admin con promo vigente que MANDA)
 *   4. nada      (el resto de los del admin: no saturar)
 */
export function categoriaTira(
  origen: OrigenTira,
  promo?: { pct: number } | null,
): string | undefined {
  if (origen === 'historial') return 'COMPRADO';
  if (origen === 'custom') return 'GUARDADO';
  return promo && promo.pct > 0 ? 'PROMO' : undefined;
}

/**
 * Descripcion visible: se OMITE cuando repite el titulo (el caso del admin que
 * escribio el mismo texto en `title` y `caption`).
 */
export function descripcionVisible(titulo: string, descripcion?: string | null): string {
  const d = String(descripcion ?? '').trim();
  if (!d) return '';
  const t = String(titulo ?? '').trim().toLowerCase();
  return d.toLowerCase() === t ? '' : d;
}

/** Precio de la tarjeta: total del lote de referencia, tachado y promo. */
export function precioTira(p?: GalleryPricing | null): {
  valor: number;
  anterior: number;
  promo?: string;
  promoOro?: boolean;
} | undefined {
  if (!p) return undefined;
  return {
    valor: p.total,
    // El tachado es comprar de a UNA plancha por unidad (referencia "regular").
    anterior: p.perUnitBase * p.totalStickers,
    promo: p.savingsPct > 0.5 ? '-' + Math.round(p.savingsPct) + '%' : undefined,
    // ORO solo si la promo del admin es el descuento efectivo; si gana la escala
    // (el caso normal al comprar muchas planchas) el ahorro es esmeralda.
    promoOro: p.promoManda === true,
  };
}