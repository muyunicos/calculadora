// Tipos centrales de la calculadora. Antes todo era `any` implícito.

export interface Config {
  calcSalaryMode: boolean;
  monthlySalary: number;
  weeklyHours: number;
  hourlyRate: number;
  packagingCost: number;
  wasteMargin: number;
  profitMargin: number;
  timeCustomerService: number;
  timeDelivery: number;
  timeDesignBasic: number;
  timeDesignCustom: number;
}

export interface Material {
  id: string;
  name: string;
  // Texto opcional para el cliente (se muestra al tocar la (i)). Editable en Admin.
  description?: string;
  sheetCost: number;
  printTime: number;
  inkCost: number;
  printWear: number;
  minCutTime: number;
  maxCutTime: number;
  cutWear: number;
}

export interface ShapeItem {
  size: string;
  qty: number;
}

// Catálogo de formas: cada categoría (ej. "Circulares", "Formas") -> lista de tamaños.
export type ShapesCatalog = Record<string, ShapeItem[]>;

export type DeliveryFormat = 'sincorte' | 'individual' | 'plancha';
export type DesignType = 'none' | 'basic' | 'custom';

export interface Order {
  shapeType: string;
  sizeIndex: number;
  customRectW: number | string;
  customRectH: number | string;
  sheetsQty: number;
  materialId: string;
  deliveryFormat: DeliveryFormat;
  complexity: number;
  designType: DesignType;
  customDesignTime: number;
}

// Estructura persistida en datos_config.json (la fuente de datos del admin).
export interface AppData {
  config: Config;
  materials: Material[];
  shapesCatalog: ShapesCatalog;
}

export type A4FitType = 'portrait' | 'landscape' | 'none';

export interface A4Layout {
  qty: number;
  fitType: A4FitType;
  renderW: number;
  renderH: number;
}

export interface PriceResult {
  activeMaterial: Material;
  totalStickers: number;
  qtyStickersPerSheet: number;
  costWithWaste: number;
  wasteAmount: number;
  laborCost: number;
  baseCutTime: number;
  printCostPerSheet: number;
  cutWearCostPerSheet: number;
  designTime: number;
  totalLogisticsTime: number;
  totalTimeMins: number;
  totalCost: number;
  profitAmount: number;
  finalPrice: number;
  pricePerSheet: number;
  pricePerSticker: number;
}
