import type { Config, DeliveryOption, DesignOption, GalleryPricing, Material, Order, PriceResult, ShapesCatalog } from '../types';
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
export function calcularPrecio(
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

// Calcula la complejidad automática de corte según unidades por hoja (1..10).
export function autoComplexity(qtyStickersPerSheet: number): number {
  return Math.max(1, Math.min(10, Math.ceil(qtyStickersPerSheet / 10)));
}

// Precio de una foto de la galería para mostrarlo de forma marketinera: compara el
// $/unidad a 1 plancha (caro) contra una cantidad de referencia (barato) y el ahorro.
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

  return {
    perUnit: max.pricePerSticker,
    perUnitBase: base.pricePerSticker,
    total: max.finalPrice,
    totalStickers: max.totalStickers,
    sheets: refSheets,
    savingsPct: ((base.pricePerSticker - max.pricePerSticker) / base.pricePerSticker) * 100,
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
