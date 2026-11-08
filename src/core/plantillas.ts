// Catalogo de plantillas del cotizador (spec 037, Enmienda v2 / T040).
//
// Una plantilla asocia **categoria + rango de tamano** a un **PDF importado** en el
// plugin. El rango es opcional y trabaja en cm sobre X e Y: si esta, la plantilla
// aplica **solo** a los tamanos que caen dentro (los intermedios se resuelven solos,
// sin listar cada medida). Sin plantilla no hay PDF de produccion: el pedido entrega
// solo la imagen procesada (FR-037).
//
// Puro y testeable en Node (`tests/core.test.js`): nada de React ni DOM.

import type { PlantillaCotizador, RangoCm } from '../types';

/** Medidas en cm de un tamano del catalogo (`6,0 cm`, `8 cm`, `5x2,5 cm`). */
export function sizeEnCm(size: string): { x: number; y: number } {
  const texto = String(size ?? '').toLowerCase().replace(/,/g, '.');
  const crudos = (texto.match(/\d+(?:\.\d+)?|\.\d+/g) ?? []).map(Number);
  const nums = crudos.filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === 0) return { x: 0, y: 0 };
  return { x: nums[0], y: nums.length > 1 ? nums[1] : nums[0] };
}

/** El tamano cae dentro del rango (inclusive). Sin rango, aplica siempre. */
export function dentroDeRango(rango: RangoCm | undefined, x: number, y: number): boolean {
  if (!rango) return true;
  if (x <= 0 || y <= 0) return false;
  return x >= rango.minX && x <= rango.maxX && y >= rango.minY && y <= rango.maxY;
}

/** ¿Esta plantilla sirve para esa categoria y ese tamano? */
export function aplicableA(
  plantilla: PlantillaCotizador,
  seleccion: { categoria: string; size: string },
): boolean {
  if (!plantilla || plantilla.visible === false) return false;
  if (String(plantilla.categoria ?? '').trim() !== String(seleccion?.categoria ?? '').trim()) {
    return false;
  }
  const cm = sizeEnCm(seleccion?.size ?? '');
  return dentroDeRango(plantilla.rango, cm.x, cm.y);
}

/**
 * Plantilla que aplica a la seleccion: la primera por `orden` entre las
 * aplicables, o `null` (sin plantilla -> sin PDF, contrato C5.5).
 */
export function resolvePlantillaFor(
  seleccion: { categoria: string; size: string },
  plantillas: PlantillaCotizador[] | undefined,
): PlantillaCotizador | null {
  const lista = (plantillas ?? []).filter((p) => aplicableA(p, seleccion));
  if (lista.length === 0) return null;
  return lista.slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))[0];
}

/** Copia una plantilla con id nuevo y titulo "(copia)" (FR-041). */
export function duplicarPlantilla(plantilla: PlantillaCotizador, id: string): PlantillaCotizador {
  const titulo = String(plantilla.titulo ?? '').trim();
  return {
    ...plantilla,
    id,
    titulo: (titulo ? `${titulo} (copia)` : 'Copia').slice(0, 60),
  };
}

/**
 * Mueve una plantilla `delta` posiciones y RENUMERA `orden` (0..n-1), para que el
 * orden del admin sea el mismo que ve el cliente (FR-041).
 */
export function moverPlantilla(
  plantillas: PlantillaCotizador[],
  id: string,
  delta: number,
): PlantillaCotizador[] {
  const lista = plantillas.slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const desde = lista.findIndex((p) => p.id === id);
  if (desde < 0) return plantillas;
  const hasta = Math.max(0, Math.min(lista.length - 1, desde + delta));
  if (hasta === desde) return plantillas;
  const [movida] = lista.splice(desde, 1);
  lista.splice(hasta, 0, movida);
  return lista.map((p, i) => ({ ...p, orden: i }));
}