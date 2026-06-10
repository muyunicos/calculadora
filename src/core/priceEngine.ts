import type { Config, Material, Order, PriceResult, ShapesCatalog } from '../types';
import { calcA4Layout } from './a4Layout';

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
): PriceResult | null {
  const activeMaterial = materials.find((m) => m.id === order.materialId) || materials[0];
  if (!activeMaterial) return null;

  // 1. Cantidades
  let qtyStickersPerSheet = 0;
  if (order.shapeType === 'Rectangulares') {
    qtyStickersPerSheet = calcA4Layout(order.customRectW, order.customRectH).qty;
  } else {
    qtyStickersPerSheet = shapesCatalog[order.shapeType]?.[order.sizeIndex]?.qty || 0;
  }
  const totalStickers = qtyStickersPerSheet * order.sheetsQty;

  // 2. Costos IMPRESIÓN
  const printCostPerSheet =
    activeMaterial.sheetCost + activeMaterial.inkCost + activeMaterial.printWear;

  // 3. Costos CORTE (usa order.complexity, autocalculado fuera del motor)
  const currentComplexity = order.complexity;
  const timeRange = activeMaterial.maxCutTime - activeMaterial.minCutTime;
  const complexityFactor = (currentComplexity - 1) / 9;
  let baseCutTime = activeMaterial.minCutTime + timeRange * complexityFactor;
  let cutWearCostPerSheet = activeMaterial.cutWear;

  // Ajustes por formato de entrega
  if (order.deliveryFormat === 'sincorte') {
    baseCutTime = 0;
    cutWearCostPerSheet = 0;
  } else if (order.deliveryFormat === 'individual') {
    baseCutTime *= 2;
    cutWearCostPerSheet *= 2;
  }

  // 4. Totales Material + Mermas
  const totalRawMaterial = (printCostPerSheet + cutWearCostPerSheet) * order.sheetsQty;
  const wasteAmount = totalRawMaterial * (config.wasteMargin / 100);
  const costWithWaste = totalRawMaterial + wasteAmount;

  // 5. Tiempos y Mano de Obra
  const designTime =
    order.designType === 'basic'
      ? config.timeDesignBasic
      : order.designType === 'custom'
        ? order.customDesignTime
        : 0;
  const variableTimeMins = (activeMaterial.printTime + baseCutTime) * order.sheetsQty;

  // Logística: plana, independientemente del formato
  const totalLogisticsTime = config.timeDelivery;

  const fixedTimeMins = config.timeCustomerService + designTime;
  const totalTimeMins = fixedTimeMins + variableTimeMins + totalLogisticsTime;
  const laborCost = (totalTimeMins / 60) * config.hourlyRate;

  // 6. Precios Finales
  const totalCost = costWithWaste + laborCost + config.packagingCost;
  const profitAmount = totalCost * (config.profitMargin / 100);
  const finalPrice = totalCost + profitAmount;

  return {
    activeMaterial,
    totalStickers,
    qtyStickersPerSheet,
    costWithWaste,
    wasteAmount,
    laborCost,
    baseCutTime,
    printCostPerSheet,
    cutWearCostPerSheet,
    designTime,
    totalLogisticsTime,
    totalTimeMins,
    totalCost,
    profitAmount,
    finalPrice,
    pricePerSheet: finalPrice / order.sheetsQty,
    pricePerSticker: totalStickers > 0 ? finalPrice / totalStickers : 0,
  };
}

// Calcula la complejidad automática de corte según unidades por hoja (1..10).
export function autoComplexity(qtyStickersPerSheet: number): number {
  return Math.max(1, Math.min(10, Math.ceil(qtyStickersPerSheet / 10)));
}
