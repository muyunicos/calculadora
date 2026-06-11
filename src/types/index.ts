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
  galleryRefSheets: number;
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
  // Descripción opcional por tamaño (ej. "ideal para frascos")
  description?: string;
  // URL de imagen de ejemplo opcional
  image?: string;
}

// Catálogo de formas: cada categoría (ej. "Circulares", "Formas") -> lista de tamaños.
export type ShapesCatalog = Record<string, ShapeItem[]>;

// Índices de "Ver más" por categoría (define dónde mostrar la línea divisoria)
export type ShapesShowMoreIndex = Record<string, number>;

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
  title?: string; // Título corto que se ve en la miniatura y arriba en el lightbox.
  caption?: string; // Descripción que se muestra debajo de la foto en el lightbox.
  order: string; // Código de pedido v1 (ej. "v1.m11.s201.q25.f2.d0").
}

// Precios calculados para mostrar en la galería de forma "marketinera": el precio
// por unidad a 1 plancha (caro, tachado) vs. al máximo de referencia (barato) y el
// % de ahorro. Se deriva del motor puro a partir del código de pedido de la foto.
export interface GalleryPricing {
  perUnit: number; // $/unidad al máximo de referencia (precio destacado).
  perUnitBase: number; // $/unidad a 1 plancha (precio "caro" tachado).
  total: number; // Inversión total al máximo de referencia.
  totalStickers: number; // Unidades al máximo de referencia.
  sheets: number; // Planchas de referencia (máximo).
  savingsPct: number; // Ahorro % por unidad vs. 1 plancha.
}

// Estructura persistida en datos_config.json (la fuente de datos del admin).
export interface AppData {
  config: Config;
  materials: Material[];
  shapesCatalog: ShapesCatalog;
  shapesShowMoreIndex?: ShapesShowMoreIndex;
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
