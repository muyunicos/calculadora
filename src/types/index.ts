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
  // Código numérico estable, visible/editable en Admin. Identifica el material en
  // el código de pedido compartible (ver core/orderCodec). Debe ser único.
  code?: number;
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
  // Código numérico estable y único (entre TODOS los tamaños de todas las
  // categorías). Identifica forma+tamaño en el código de pedido compartible.
  code?: number;
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
  // '' = sin elegir (no se pre-selecciona ninguna opción por defecto).
  deliveryFormat: DeliveryFormat | '';
  complexity: number;
  designType: DesignType | '';
  customDesignTime: number;
}

// Foto de ejemplo para la mini-galería. Al tocarla se carga `order` (código v1)
// en la calculadora. Todo es dato editable en Admin (nada hardcodeado).
export interface GalleryItem {
  id: string;
  image: string; // URL de la imagen (puede ser relativa a assetsUrl o absoluta).
  caption?: string; // Texto opcional que se muestra bajo la foto.
  order: string; // Código de pedido v1 (ej. "v1.m11.s201.q25.f2.d0").
}

// Estructura persistida en datos_config.json (la fuente de datos del admin).
export interface AppData {
  config: Config;
  materials: Material[];
  shapesCatalog: ShapesCatalog;
  gallery?: GalleryItem[];
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
