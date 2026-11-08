// --- MOTOR DE GALERIA Y VISOR DEL TEMA (`muyunicos`) ---
// Spec 019 (D26): el motor vive en el tema (`MU.coleccion` = ambito 1, `MU.visor` =
// ambito 2) y los demas repositorios lo CONSUMEN. La calculadora NO duplica el motor:
// dependencia BLANDA (sin tema, `MiniGallery` sigue con su visor propio).

import type { GalleryItem, GalleryPricing } from '../types';

export type MuItem = { url: string; thumb?: string; etiqueta?: string };
export type MuAccion = { etiqueta: string; clase?: string; onAccion: (indice: number) => void };

export type MuOpcionesVisor = {
  items: MuItem[];
  indice?: number;
  titulo?: string;
  tono?: 'claro' | 'oscuro';
  contador?: 'auto' | boolean;
  ancho?: 'auto' | 'completo';
  meta?: Record<string, unknown> | null;
  acciones?: MuAccion[];
  alCerrar?: () => void;
};

/** El motor del tema, solo si expone `visor` (dependencia blanda). */
export function motorGaleria(): Window['MU'] | null {
  if (typeof window === 'undefined') return null;
  const mu = window.MU;
  return mu && typeof mu.visor === 'function' ? mu : null;
}

/** Abre el visor del tema. Devuelve false si no hay motor (queda el visor propio). */
export function abrirVisor(opciones: MuOpcionesVisor): boolean {
  const mu = motorGaleria();
  if (!mu || typeof mu.visor !== 'function') return false;
  return mu.visor(opciones as Record<string, unknown>) === true;
}

/** Cierra el visor del tema (si esta abierto). */
export function cerrarVisor(): void {
  const mu = motorGaleria();
  if (mu && typeof mu.cerrar === 'function') mu.cerrar();
}

/**
 * Meta del visor para una foto de la galeria: el precio "marketinero" que ya muestra
 * la tira (regular vs. por mayor + ahorro) y la nota del calculo.
 */
export function metaDeItem(
  item: GalleryItem,
  pricing: GalleryPricing | null
): Record<string, unknown> | null {
  const meta: Record<string, unknown> = {};
  if (item.title) meta.titulo = item.title;
  if (item.caption) meta.descripcion = item.caption;
  if (pricing) {
    meta.precios = [
      { etiqueta: 'Regular', valor: pricing.perUnitBase },
      { etiqueta: 'Por mayor', valor: pricing.perUnit, anterior: pricing.perUnitBase },
    ];
    meta.nota =
      'Comprando ' + pricing.sheets + ' planchas (~' + pricing.totalStickers + ' u): $' +
      pricing.total;
    if (pricing.savingsPct > 0.5) {
      meta.badge = { texto: Math.round(pricing.savingsPct) + '% OFF', tono: 'tienda' };
    }
  }
  return Object.keys(meta).length ? meta : null;
}