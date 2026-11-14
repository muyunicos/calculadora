import type { Config, DeliveryOption, DesignOption, GalleryPricing, Material, Order, PriceResult, Promo, PromoElegida, ShapesCatalog } from '../types';
import { calcA4Layout } from './a4Layout';

// --- HELPERS NUMÉRICOS ---
// El motor es la fuente de verdad del precio: nunca debe devolver NaN/Infinity
// por un dato raro del JSON (los datos ya vienen saneados, esto es defensa en
// profundidad) ni precios con decimales de coma flotante en el carrito.
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const safeNum = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
const round3 = (value: number): number => Math.round((value + Number.EPSILON) * 1000) / 1000;

// Modo de hoja para los rectangulares: 'preciso' (203x271mm) o 'economico'
// (210x297mm). El motor DEBE usar el mismo modo que la UI (paso 2) y que el
// codigo de pedido. Si no, el ticket cuenta otras unidades por plancha que las
// que el cliente vio (ej. 7x7 cm: 6 en preciso contra 12 en economico) y el
// precio del carrito (calculadora-pricing.php, que SI pasa el modo) no coincide.
const rectMode = (order: Order): 'preciso' | 'economico' =>
  order.rectCalcMode === 'economico' ? 'economico' : 'preciso';

// Motor de precios. Función PURA: mismas entradas -> mismas salidas, sin estado
// ni React. Es la fuente de verdad del cálculo y habilita features como la tabla
// de precio por cantidad, el recomendador y el comparador (solo es invocarla con
// distintos `order`).
//
// La lógica es una portación fiel del cálculo original que vivía en un useEffect.
function calcularPrecioNeto(
  order: Order,
  config: Config,
  materials: Material[],
  shapesCatalog: ShapesCatalog,
  deliveryOptions: DeliveryOption[],
  designOptions: DesignOption[],
): PriceResult | null {
  // Sin precio hasta que el cliente haya elegido TODAS las opciones (sin defaults).
  if (!isOrderComplete(order, materials, shapesCatalog)) return null;

  const activeMaterial = materials?.find((m) => m.id === order.materialId);
  if (!activeMaterial) return null;

  const activeDeliveryOption = deliveryOptions?.find((o) => o.id === order.deliveryFormat);
  const activeDesignOption = designOptions?.find((o) => o.id === order.designType);
  if (!activeDeliveryOption || !activeDesignOption) return null;

  // 1. Cantidades
  const sheets = clamp(Math.round(safeNum(order.sheetsQty, 0)), 1, 100000);
  let qtyStickersPerSheet = 0;
  if (order.shapeType === 'Rectangulares') {
    qtyStickersPerSheet = calcA4Layout(order.customRectW, order.customRectH, rectMode(order)).qty;
  } else {
    qtyStickersPerSheet = safeNum(shapesCatalog[order.shapeType]?.[order.sizeIndex]?.qty, 0);
  }
  // Sin unidades por hoja no hay nada que cotizar. Antes se devolvía un ticket
  // con "~0 unidades" y un total (posible con medidas fuera de rango por URL).
  if (!Number.isFinite(qtyStickersPerSheet) || qtyStickersPerSheet <= 0) return null;
  const totalStickers = qtyStickersPerSheet * sheets;

  // 2. Costos IMPRESIÓN
  const printCostPerSheet =
    safeNum(activeMaterial.sheetCost) + safeNum(activeMaterial.inkCost) + safeNum(activeMaterial.printWear);

  // 3. Costos CORTE (usa order.complexity, autocalculado fuera del motor)
  const currentComplexity = clamp(Math.round(safeNum(order.complexity, 1)), 1, 10);
  const minCutTime = Math.max(0, safeNum(activeMaterial.minCutTime));
  // Si el Admin carga max < min, se usa min para ambos en vez de restar tiempo.
  const maxCutTime = Math.max(minCutTime, safeNum(activeMaterial.maxCutTime, minCutTime));
  const timeRange = maxCutTime - minCutTime;
  const complexityFactor = (currentComplexity - 1) / 9;
  let baseCutTime = minCutTime + timeRange * complexityFactor;
  let cutWearCostPerSheet = Math.max(0, safeNum(activeMaterial.cutWear));

  // Ajustes por formato de entrega (data-driven desde deliveryOptions)
  const cutFactor = Number.isFinite(activeDeliveryOption.cutFactor)
    ? Math.max(0, activeDeliveryOption.cutFactor)
    : 1;
  const cutWearFactor = Number.isFinite(activeDeliveryOption.cutWearFactor)
    ? Math.max(0, activeDeliveryOption.cutWearFactor)
    : 1;
  baseCutTime = Math.max(0, baseCutTime * cutFactor);
  cutWearCostPerSheet = Math.max(0, cutWearCostPerSheet * cutWearFactor);

  // 4. Totales Material + Mermas
  const totalRawMaterial = (printCostPerSheet + cutWearCostPerSheet) * sheets;
  const wasteMargin = clamp(safeNum(config.wasteMargin), 0, 100);
  const wasteAmount = totalRawMaterial * (wasteMargin / 100);
  const costWithWaste = totalRawMaterial + wasteAmount;

  // 5. Tiempos y Mano de Obra (data-driven desde designOptions)
  // `designMinutes` es la única fuente de verdad (Admin > Formato y Diseño).
  const designTime = Math.max(
    0,
    activeDesignOption.isCustomTime
      ? safeNum(order.customDesignTime)
      : safeNum(activeDesignOption.designMinutes),
  );
  const variableTimeMins = (safeNum(activeMaterial.printTime) + baseCutTime) * sheets;

  // Logística: plana, independientemente del formato
  const totalLogisticsTime = Math.max(0, safeNum(config.timeDelivery));

  const fixedTimeMins = Math.max(0, safeNum(config.timeCustomerService)) + designTime;
  const totalTimeMins = fixedTimeMins + variableTimeMins + totalLogisticsTime;
  const laborCost = (totalTimeMins / 60) * Math.max(0, safeNum(config.hourlyRate));

  // 6. Precios Finales
  const totalCost = costWithWaste + laborCost + Math.max(0, safeNum(config.packagingCost));
  const profitMargin = clamp(safeNum(config.profitMargin), 0, 1000);
  const profitAmount = totalCost * (profitMargin / 100);
  const finalPrice = round2(totalCost + profitAmount);

  return {
    activeMaterial,
    totalStickers,
    qtyStickersPerSheet,
    costWithWaste: round2(costWithWaste),
    wasteAmount: round2(wasteAmount),
    laborCost: round2(laborCost),
    baseCutTime: round3(baseCutTime),
    printCostPerSheet: round2(printCostPerSheet),
    cutWearCostPerSheet: round2(cutWearCostPerSheet),
    designTime,
    totalLogisticsTime,
    totalTimeMins: round2(totalTimeMins),
    totalCost: round2(totalCost),
    profitAmount: round2(profitAmount),
    finalPrice,
    pricePerSheet: round2(finalPrice / sheets),
    pricePerSticker: totalStickers > 0 ? round2(finalPrice / totalStickers) : 0,
  };
}

/** Normaliza la categoria del pedido (el catalogo usa Circulares/Formas; el
 * rectangular vive aparte en customRectW/H). */
function categoriaPedido(order: Order): string {
  return order.shapeType === 'Rectangulares' ? 'Rectangulares' : String(order.shapeType || '');
}

/** Lados del sticker en cm (Infinity = desconocido). */
function ladosCm(order: Order, shapesCatalog: ShapesCatalog): { w: number; h: number } {
  if (order.shapeType === 'Rectangulares') {
    const w = parseFloat(String(order.customRectW ?? '').replace(',', '.'));
    const h = parseFloat(String(order.customRectH ?? '').replace(',', '.'));
    return { w: Number.isFinite(w) && w > 0 ? w : Infinity, h: Number.isFinite(h) && h > 0 ? h : Infinity };
  }
  const item = shapesCatalog[order.shapeType]?.[order.sizeIndex];
  const texto = String((item && item.size) || '').toLowerCase().replace(/,/g, '.');
  const nums = (texto.match(/\d+(?:\.\d+)?|\.\d+/g) || []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === 0) return { w: Infinity, h: Infinity };
  return { w: nums[0], h: nums.length > 1 ? nums[1] : nums[0] };
}

/** Lado dentro del rango declarado (extremo ausente = abierto). */
function ladoEnRango(valor: number, min?: number, max?: number): boolean {
  if (!Number.isFinite(valor)) return true;
  if (typeof min === 'number' && Number.isFinite(min) && valor < min) return false;
  if (typeof max === 'number' && Number.isFinite(max) && valor > max) return false;
  return true;
}

/** Aplica esta promo a este pedido? (material + forma + TAMANO ambos lados + planchas) */
export function promoAplicaA(
  promo: Promo,
  order: Order,
  shapesCatalog: ShapesCatalog,
  totalStickers?: number,
): boolean {
  if (promo.activa === false) return false;
  if (clamp(safeNum(promo.pct), 0, 100) <= 0) return false;
  const desde = Math.max(1, Math.round(safeNum(promo.desde)));
  // La promo vieja (v4) declaraba UNIDADES; la nueva (v5) declara PLANCHAS.
  const cantidad = promo.desdeUnidades
    ? Math.max(0, Math.round(safeNum(totalStickers)))
    : Math.max(1, Math.round(safeNum(order.sheetsQty, 1)));
  if (cantidad < desde) return false;
  const material = String(promo.material || 'todos');
  if (material !== 'todos' && material !== String(order.materialId || '')) return false;
  const forma = String(promo.forma || 'todas');
  if (forma !== 'todas' && forma !== categoriaPedido(order)) return false;
  const lados = ladosCm(order, shapesCatalog);
  return ladoEnRango(lados.w, promo.tamMin, promo.tamMax) && ladoEnRango(lados.h, promo.tamMin, promo.tamMax);
}

/** Promos del config: la lista nueva o, si no hay, la vieja `promo` unica como
 * lista de un elemento (compatibilidad con configs ya guardadas). */
export function promosDe(config: Config): Promo[] {
  const lista = Array.isArray(config.promos) ? config.promos.filter((p): p is Promo => !!p && typeof p === 'object') : [];
  if (lista.length > 0) return lista;
  const vieja = config.promo;
  if (!vieja || !Number.isFinite(vieja.pct) || !Number.isFinite(vieja.desde)) return [];
  return [{ id: 'legacy', material: 'todos', forma: 'todas', desde: vieja.desde, pct: vieja.pct, desdeUnidades: true }];
}

/**
 * Promo que gana: la de **mayor pct** entre las que aplican (desempate: la primera
 * declarada). Devuelve null si ninguna aplica.
 */
export function elegirPromo(order: Order, config: Config, shapesCatalog: ShapesCatalog, totalStickers?: number): Promo | null {
  let mejor: Promo | null = null;
  for (const promo of promosDe(config)) {
    if (!promoAplicaA(promo, order, shapesCatalog, totalStickers)) continue;
    if (!mejor || clamp(safeNum(promo.pct), 0, 100) > clamp(safeNum(mejor.pct), 0, 100)) mejor = promo;
  }
  return mejor;
}
/**
 * Promocion del admin (spec 038, Enmienda v4): un descuento fijo en % que se aplica
 * desde una cantidad de unidades. **Gana solo si supera** al descuento por cantidad
 * (el cliente paga el mejor de los dos); si no, no se aplica.
 *
 * Se resuelve sobre el TOTAL del pedido (`sheetsQty` incluida), asi el carrito y la
 * tabla de precios cobran lo mismo que la vidriera.
 */
/**
 * Promo que se aplica a este pedido, ya validada contra el descuento por cantidad.
 *
 * `totalStickers` se mantiene en la firma por compatibilidad: hoy el filtro de
 * cantidad mira `order.sheetsQty` (planchas), que es lo que el admin declara.
 * Devuelve null si ninguna promo aplica o si el descuento por cantidad es mejor.
 */
export function promoAplicable(
  order: Order,
  config: Config,
  shapesCatalog: ShapesCatalog,
  totalStickers: number,
): PromoElegida | null {
  const elegida = elegirPromo(order, config, shapesCatalog, totalStickers);
  if (!elegida) return null;
  const desde = Math.max(1, Math.round(safeNum(elegida.desde)));
  const pct = clamp(safeNum(elegida.pct), 0, 100);
  if (pct <= 0 || totalStickers <= 0) return null;
  return { id: String(elegida.id || ''), desde, pct, ahorroCantidad: 0 };
}

/**
 * Precio final del pedido. Envuelve el calculo neto y le aplica la promo del admin
 * cuando corresponde (spec 038, D8: `max(promo, descuento por cantidad)`).
 *
 * `promo` viaja en el resultado para que la interfaz pueda avisar que el precio ya
 * viene con descuento (y `precioLista` es el de tabla, sin promo).
 */
export function calcularPrecio(
  order: Order,
  config: Config,
  materials: Material[],
  shapesCatalog: ShapesCatalog,
  deliveryOptions: DeliveryOption[],
  designOptions: DesignOption[],
): PriceResult | null {
  const neto = calcularPrecioNeto(order, config, materials, shapesCatalog, deliveryOptions, designOptions);
  if (!neto) return null;

  const promo = promoAplicable(order, config, shapesCatalog, neto.totalStickers);
  if (!promo) return neto;

  // El descuento por cantidad ya esta dentro de `neto.finalPrice` (baja por plancha);
  // la promo se compara contra el precio de 1 plancha por unidad, que es la referencia
  // que ve el cliente en la vidriera.
  const base = calcularPrecioNeto({ ...order, sheetsQty: 1 }, config, materials, shapesCatalog, deliveryOptions, designOptions);
  if (!base || base.pricePerSticker <= 0) return neto;
  const ahorroCantidad = ((base.pricePerSticker - neto.pricePerSticker) / base.pricePerSticker) * 100;
  if (promo.pct <= ahorroCantidad) return neto;

  const finalPrice = round2(base.pricePerSticker * neto.totalStickers * (1 - promo.pct / 100));
  if (!(finalPrice < neto.finalPrice)) return neto;

  return {
    ...neto,
    precioLista: neto.finalPrice,
    promo: { id: promo.id, desde: promo.desde, pct: promo.pct, ahorroCantidad: round2(ahorroCantidad * 100) / 100 },
    finalPrice,
    pricePerSheet: round2(finalPrice / Math.max(1, Math.round(safeNum(order.sheetsQty, 1)))),
    pricePerSticker: round2(finalPrice / neto.totalStickers),
  };
}
// Calcula la complejidad automática de corte según unidades por hoja (1..10).
export function autoComplexity(qtyStickersPerSheet: number): number {
  return Math.max(1, Math.min(10, Math.ceil(qtyStickersPerSheet / 10)));
}

// Precio de una foto de la galería para mostrarlo de forma marketinera: compara el
// $/unidad a 1 plancha (caro) contra una cantidad de referencia (barato) y el ahorro.
const resolverPromo = (order: Order, config: Config, shapesCatalog: ShapesCatalog, totalStickers: number) => promoAplicable(order, config, shapesCatalog, totalStickers);

// La complejidad se recalcula sola (igual que al cargar el pedido), así no depende
// del valor neutro que trae el código.
// displaySheets: cantidad a mostrar (si es undefined o 1, usa config.galleryRefSheets)
export function galleryPricing(
  order: Order,
  config: Config,
  materials: Material[],
  shapesCatalog: ShapesCatalog,
  deliveryOptions: DeliveryOption[],
  designOptions: DesignOption[],
  displaySheets?: number,
): GalleryPricing | null {
  const qtyPerSheet =
    order.shapeType === 'Rectangulares'
      ? calcA4Layout(order.customRectW, order.customRectH, rectMode(order)).qty
      : shapesCatalog[order.shapeType]?.[order.sizeIndex]?.qty || 0;
  const complexity = autoComplexity(qtyPerSheet);
  // Si displaySheets es 1 o no se proporciona, usar la cantidad de referencia del config
  const requested = displaySheets && displaySheets > 1 ? Math.floor(displaySheets) : 0;
  const refSheets = clamp(requested > 1 ? requested : Math.round(config.galleryRefSheets || 10), 1, 1000);

  const base = calcularPrecio({ ...order, sheetsQty: 1, complexity }, config, materials, shapesCatalog, deliveryOptions, designOptions);
  const max = calcularPrecio(
    { ...order, sheetsQty: refSheets, complexity },
    config,
    materials,
    shapesCatalog,
    deliveryOptions,
    designOptions,
  );
  if (!base || !max || base.pricePerSticker <= 0) return null;

  // Spec 038 (D8): `max` ya viene con la promo si gano (calcularPrecio la aplica), asi que
  // el ahorro y el total de la vidriera coinciden con lo que se cobra.
  return {
    perUnit: max.pricePerSticker,
    perUnitBase: base.pricePerSticker,
    total: max.finalPrice,
    totalStickers: max.totalStickers,
    sheets: refSheets,
    savingsPct: ((base.pricePerSticker - max.pricePerSticker) / base.pricePerSticker) * 100,
    promo: max.promo ? { desde: max.promo.desde, pct: max.promo.pct } : null,
  };
}

// Lista de selecciones que faltan para poder cotizar (orden = pasos del flujo).
// Si está vacía, el pedido está completo. Permite mostrar al cliente qué le falta.
export function missingSelections(
  order: Order,
  materials: Material[],
  shapesCatalog: ShapesCatalog,
): string[] {
  const missing: string[] = [];

  if (!order.materialId || !materials?.find((m) => m.id === order.materialId)) {
    missing.push('material');
  }

  if (!order.shapeType) {
    missing.push('forma');
  } else if (order.shapeType === 'Rectangulares') {
    const w = Number(order.customRectW);
    const h = Number(order.customRectH);
    if (!w || !h || w <= 0 || h <= 0) missing.push('medidas');
  } else if (order.sizeIndex < 0 || !shapesCatalog[order.shapeType]?.[order.sizeIndex]) {
    missing.push('tamaño');
  }

  // Un tamaño que no entra en la hoja (0 unidades por plancha) tampoco permite
  // cotizar: antes se generaba un ticket con "~0 unidades" y un total.
  if (order.shapeType) {
    const qtyPerSheet =
      order.shapeType === 'Rectangulares'
        ? calcA4Layout(order.customRectW, order.customRectH, rectMode(order)).qty
        : (shapesCatalog[order.shapeType]?.[order.sizeIndex]?.qty ?? 0);
    if (!Number.isFinite(qtyPerSheet) || qtyPerSheet <= 0) {
      const label = order.shapeType === 'Rectangulares' ? 'medidas' : 'tamaño';
      if (!missing.includes(label)) missing.push(label);
    }
  }

  if (!order.deliveryFormat) missing.push('formato');
  if (!order.designType) missing.push('diseño');
  if (!order.sheetsQty || order.sheetsQty < 1) missing.push('cantidad');

  return missing;
}

// El pedido está completo cuando no falta ninguna selección.
export function isOrderComplete(
  order: Order,
  materials: Material[],
  shapesCatalog: ShapesCatalog,
): boolean {
  return missingSelections(order, materials, shapesCatalog).length === 0;
}
