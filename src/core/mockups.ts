// Nucleo PURO del mockup del cotizador (spec 037, T011).
//
// Que resuelve, sin React ni DOM:
//  - `sizeToPx`: cm -> px a 300 ppp con el mismo redondeo y el mismo acotado que
//    `PMU_Sesion::px_cotizador()` (PHP). El lienzo del sticker es EXPLICITO
//    (`w/h` de la receta): el cotizador no tiene `analisis.json` del que sacarlo.
//  - `gidPara`: el `gid` de 6 hex de la receta. Se deriva de categoria + tamano
//    NORMALIZADO a px, asi `3,0 cm` y `3 cm` dan el mismo id y el compuesto cachea.
//  - `tiraOrden` / `precioActualizado`: comparador de la tira unificada y aviso de
//    precio viejo (D7), testeables en Node.
//
// Paridad: `tests/core.test.js` valida `sizeToPx`/`gidPara` contra
// `tests/fixtures/cotizador-paridad.json`, el MISMO fixture que usa el plugin.
// Si una de las dos implementaciones cambia, una de las dos puertas falla.

import { hex6Mayus } from './sha1';
import type { GalleryPricing, TiraItem } from '../types';

/** Lado maximo del lienzo: espejo de `PMU_Sesion::PH_MAX` y `Compositor::PH_MAX`. */
export const PH_MAX = 3000;

/** Ppp del lienzo de impresion (300 ppp: el mismo de la 028/035). */
const PPP = 300;

/** Redondeo y acotado IDENTICOS a `PMU_Sesion::px_acotar()` (paridad I1). */
function acotar(w: number, h: number): { w: number; h: number } {
  let ancho = Math.max(1, Math.round(w));
  let alto = Math.max(1, Math.round(h));
  const mayor = Math.max(ancho, alto);
  if (mayor > PH_MAX) {
    const k = PH_MAX / mayor;
    ancho = Math.max(1, Math.round(ancho * k));
    alto = Math.max(1, Math.round(alto * k));
  }
  return { w: ancho, h: alto };
}

/**
 * Pixeles del sticker a 300 ppp.
 *
 * Acepta el formato del catalogo (`2,5 cm`, `8 cm`, `6,0 cm`) y la medida
 * rectangular (`5x2,5 cm`, `10x200`): la coma es DECIMAL y la `x` separa lados.
 * Devuelve `{w:0, h:0}` si no hay ningun numero (el llamador decide la causa).
 */
export function sizeToPx(size: string): { w: number; h: number } {
  const texto = String(size ?? '').toLowerCase().replace(/,/g, '.');
  const crudos = (texto.match(/\d+(?:\.\d+)?|\.\d+/g) ?? []).map(Number);
  const nums = crudos.filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === 0) return { w: 0, h: 0 };
  const cmW = nums[0];
  const cmH = nums.length > 1 ? nums[1] : nums[0];
  return acotar(Math.round((cmW / 2.54) * PPP), Math.round((cmH / 2.54) * PPP));
}

/** Clave del `gid`: categoria normalizada + lienzo ya normalizado a px. */
export function gidClave(categoria: string, size: string): string {
  const cat = String(categoria ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const { w, h } = sizeToPx(size);
  return `${cat}|${w}x${h}`;
}

/**
 * `gid` de la receta (6 hex, MAYUSCULAS): `sha1(categoria|WxH)`.
 *
 * Identico a `PMU_Sesion::receta_cotizador()`. Estable entre pedidos: el nombre
 * del archivo compuesto (`foto-...-{gid}-{receta}.webp`) cachea y el admin
 * reconoce la misma medida.
 */
export function gidPara(categoria: string, size: string): string {
  return hex6Mayus(gidClave(categoria, size));
}

/**
 * Comparador de la tira unificada (D4/R13).
 *
 * Favorito primero; dentro de cada grupo, el `orden` manual (0 = sin ordenar) y
 * despues lo mas nuevo. El `key` desempata para que el orden sea ESTABLE entre
 * renders (dos ideas del mismo segundo no bailan).
 */
export function tiraOrden(a: TiraItem, b: TiraItem): number {
  const fa = a.favorito ? 1 : 0;
  const fb = b.favorito ? 1 : 0;
  if (fa !== fb) return fb - fa;
  const oa = Number.isFinite(a.orden) ? a.orden : 0;
  const ob = Number.isFinite(b.orden) ? b.orden : 0;
  if (oa !== ob) return oa - ob;
  const ca = Number.isFinite(a.creado) ? a.creado : 0;
  const cb = Number.isFinite(b.creado) ? b.creado : 0;
  if (ca !== cb) return cb - ca;
  return String(a.key).localeCompare(String(b.key));
}

/**
 * El precio guardado en la idea quedo viejo (D7/R8).
 *
 * Se recalcula SIEMPRE con el catalogo vigente (`galleryPricing`); si el numero
 * cambia respecto de la foto guardada, la tarjeta avisa "actualizado". Tolerancia
 * de 0,50: no se marca por redondeos.
 */
export function precioActualizado(
  guardado: { final?: number } | undefined,
  actual: GalleryPricing | null,
): boolean {
  if (!guardado || !actual) return false;
  const antes = Number(guardado.final);
  if (!Number.isFinite(antes) || antes <= 0) return false;
  return Math.abs(antes - Number(actual.total)) > 0.5;
}

/** Descripcion automatica de la idea (FR-026): material, forma/tamano, formato, planchas. */
export function descripcionAuto(datos: {
  material?: string;
  forma?: string;
  tamano?: string;
  formato?: string;
  planchas?: number;
  unidades?: number;
}): string {
  const partes: string[] = [];
  if (datos.material) partes.push(String(datos.material));
  if (datos.forma || datos.tamano) {
    partes.push([datos.forma, datos.tamano].filter(Boolean).join(' ').trim());
  }
  if (datos.formato) partes.push(String(datos.formato));
  if (datos.planchas && datos.planchas > 0) {
    const unidades = datos.unidades && datos.unidades > 0
      ? ` (~${Math.round(datos.unidades)} u)` : '';
    partes.push(`${datos.planchas} plancha${datos.planchas === 1 ? '' : 's'}${unidades}`);
  }
  return partes.join(' | ').slice(0, 240);
}
