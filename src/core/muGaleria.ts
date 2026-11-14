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
  tema?: string;                                 // spec 020: atajo de presentacion
  contador?: 'auto' | boolean;
  ancho?: 'auto' | 'completo';
  meta?: Record<string, unknown> | null;
  acciones?: MuAccion[];
  alCerrar?: () => void;
};

export type MuItemColeccion = {
  url: string;
  thumb?: string;
  etiqueta?: string;
  // Texto de apoyo bajo el titulo (tema `cotizador`: "vinilo · circulares · 5cm").
  descripcion?: string;
  // Precio por UNIDADES: `unidades` + `precio.total` pintan "500 u x $16.720".
  unidades?: number;
  precio?: { valor: number; anterior?: number; total?: number };
};

export type MuOpcionesColeccion = {
  items: MuItemColeccion[];
  layout?: 'fila' | 'grilla';
  preset?: string;
  slots?: Record<string, boolean>;
  tamano?: string | { ancho: number; alto: number };
  navegable?: boolean;
  activo?: number;
  onAbrir: (indice: number) => void;
};

/**
 * Monta la TIRA con el motor del tema (`MU.coleccion`, ambito 1). Devuelve false si el
 * motor no esta (dependencia blanda: queda la tira propia del componente).
 */
export function montarColeccion(el: HTMLElement | null, opciones: MuOpcionesColeccion): boolean {
  const mu = motorGaleria();
  if (!el || !mu || typeof mu.coleccion !== 'function') return false;
  el.innerHTML = '';
  mu.coleccion(el, opciones as Record<string, unknown>);
  return true;
}

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
  pricing: GalleryPricing | null,
  descripcion?: string
): Record<string, unknown> | null {
  const meta: Record<string, unknown> = {};
  if (item.title) meta.titulo = item.title;
  // La descripcion del visor es la automatica (material · forma · medida) si el
  // consumidor la provee; si no, cae al texto de la foto.
  const desc = descripcion || item.caption;
  if (desc) meta.descripcion = desc;
  if (pricing) {
    // Un SOLO precio: el total del lote de referencia, con el tachado del lote comprando
    // de a una plancha. Sin etiquetas "Regular/Por mayor": el tamanio lo da la nota.
    meta.precios = [
      {
        valor: pricing.total,
        anterior: pricing.perUnitBase * pricing.totalStickers,
      },
    ];
    meta.nota =
      'Comprando ' + pricing.sheets + ' planchas · ' + pricing.totalStickers + ' u';
    if (pricing.savingsPct > 0.5) {
      meta.badge = { texto: '-' + Math.round(pricing.savingsPct) + '%', tono: 'tienda' };
    }
  }
  return Object.keys(meta).length ? meta : null;
}