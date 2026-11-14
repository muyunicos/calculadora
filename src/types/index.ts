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
  // DEPRECADOS: el tiempo de diseño real vive en `designOptions[].designMinutes`
  // (editable en Admin > Formato y Diseño). Se conservan en el JSON por
  // compatibilidad, pero ya no afectan el cálculo.
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
  // Foto opcional para la "info extra" (se amplía al tocarla). Editable en Admin.
  image?: string;
  sheetCost: number;
  printTime: number;
  inkCost: number;
  printWear: number;
  minCutTime: number;
  maxCutTime: number;
  cutWear: number;
  visible?: boolean; // Si se muestra al cliente.
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
  visible?: boolean; // Si se muestra al cliente.
}

// Catálogo de formas: cada categoría (ej. "Circulares", "Formas") -> lista de tamaños.
export type ShapesCatalog = Record<string, ShapeItem[]>;

// Índices de "Ver más" por categoría (define dónde mostrar la línea divisoria)
export type ShapesShowMoreIndex = Record<string, number>;

// Los ids de catálogo son estables ("sincorte", "individual", "plancha" /
// "none", "basic", "custom"), pero el Admin puede agregar opciones nuevas con
// ids propios. El `(string & {})` mantiene el autocompletado de los ids
// conocidos sin cerrar el tipo: si se cierra a un enum, el schema de validación
// rechaza las opciones nuevas y deja la calculadora sin cargar.
export type DeliveryFormat = 'sincorte' | 'individual' | 'plancha' | (string & {});
export type DesignType = 'none' | 'basic' | 'custom' | (string & {});

// Opción de formato de entrega. El `id` es estable: define el cálculo de precio
// (ver core/priceEngine) y el código de pedido compartible (ver core/orderCodec).
// Ahora incluye parámetros de pricing data-driven y es fully configurable.
export interface DeliveryOption {
  id: DeliveryFormat;
  code: number; // Código numérico estable para el codec (v1.f0, v1.f1, etc.)
  label: string; // Texto principal de la tarjeta.
  subtitle?: string; // Texto secundario de la tarjeta.
  description?: string; // "Info extra" (panel MÁS INFO).
  image?: string; // Foto de la info extra (se amplía al tocarla).
  cutFactor: number; // Multiplicador de tiempo de corte (0=sincorte, 2=individual, 1=plancha).
  cutWearFactor: number; // Multiplicador de desgaste de corte (0=sincorte, 2=individual, 1=plancha).
  visible: boolean; // Si se muestra al cliente.
}

// Opción de tipo de diseño. Mismo criterio que DeliveryOption: `id` estable.
// Ahora incluye parámetros de pricing data-driven y es fully configurable.
export interface DesignOption {
  id: DesignType;
  code: number; // Código numérico estable para el codec (v1.d0, v1.d1, etc.)
  label: string;
  subtitle?: string;
  description?: string;
  image?: string;
  designMinutes?: number; // Minutos fijos de diseño (para 'basic').
  isCustomTime: boolean; // Si permite tiempo custom del cliente (para 'custom').
  /** Spec 038 (B): esta opcion pide arte al cliente (muestra el paso Tu diseno). */
  pideArte?: boolean;
  customerVisible?: boolean; // Si se muestra como tarjeta al cliente (false para 'custom').
  visible: boolean; // Si se muestra al cliente (unifica customerVisible).
}

// Info adicional genérica para CUALQUIER opción (material, tamaño, formato,
// diseño…). Es lo que consume el motor de info reutilizable (OptionInfoPanel).
export interface OptionInfo {
  name: string; // Nombre de la opción (título "MÁS INFO: ...").
  description?: string;
  image?: string;
}

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
  rectCalcMode?: 'preciso' | 'economico';
}

// Foto de ejemplo para la mini-galería. Al tocarla se carga `order` (código v1)
// en la calculadora. Todo es dato editable en Admin (nada hardcodeado).
export interface GalleryItem {
  id: string;
  image: string; // URL de la imagen (puede ser relativa a assetsUrl o absoluta).
  title?: string; // Título corto que se ve en la miniatura y arriba en el lightbox.
  caption?: string; // Descripción que se muestra debajo de la foto en el lightbox.
  order: string; // Código de pedido v1 (ej. "v1.m11.s201.q25.f2.d0").
  visible?: boolean; // Si se muestra al cliente.
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
// OJO: el nombre del archivo es datos_config.json, pero el frontend lo pide a
// CONFIG_URL, que en producción es el endpoint datos_config_etag.php.
export interface AppData {
  config: Config;
  materials: Material[];
  shapesCatalog: ShapesCatalog;
  shapesShowMoreIndex?: ShapesShowMoreIndex;
  // Cuántos materiales se muestran antes de la línea "Ver más" (vista cliente).
  materialsShowMoreIndex?: number;
  gallery?: GalleryItem[];
  deliveryOptions?: DeliveryOption[];
  designOptions?: DesignOption[];
  // Spec 037 (Enmienda v2): plantillas del cotizador (categoria + rango -> PDF).
  plantillas?: PlantillaCotizador[];
  // Nombre visible de la tira unificada (Anexo C de la spec 037).
  tiraNombre?: string;
}

export type A4FitType = 'portrait' | 'landscape' | 'none';

// ===== Spec 037: mockup del cotizador, diseno e ideas del comprador =====

/** Forma del hueco: **siempre automatica** (envoltura del placeholder del PDF). */
export type MockupForma = 'auto';

/** Rango de tamanos (cm) en el que aplica una plantilla. */
export interface RangoCm {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Plantilla del cotizador (Enmienda v2, D14): asocia una **categoria + rango de
 * tamano** a un PDF **importado** en el plugin (que aporta placeholders, envolturas
 * automaticas y los mockups del Editor). Sin `pdf` no hay PDF de produccion.
 */
export interface PlantillaCotizador {
  id: string;
  /** Se muestra al cliente (FR-040). */
  titulo: string;
  categoria: string;
  /** Slug de un PDF del plugin (`pdfs/{slug}/`). Vacio = solo imagen procesada. */
  pdf: string;
  /** Spec 038 (D1): a que grupo(s) del PDF va el arte. 'todos' = todos (default). */
  grupo?: 'todos' | 'auto' | string;
  /** Opcional: aplica solo si el PH cae dentro (los intermedios se resuelven solos). */
  rango?: RangoCm;
  visible?: boolean;
  orden: number;
}

/** Capa del mockup tal como la guarda el Editor del plugin (contrato C5.2). */
export interface MockupCapaPdf {
  tipo?: string;
  ref?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rot?: number;
  sesgo?: number;
  oculta?: boolean;
  envoltura?: unknown;
  grupo?: string;
  filtros?: Record<string, unknown>;
  modo?: string;
}

/** Mockup del PDF (el del "Editor de mockups"): capas + envolturas. */
export interface MockupPdf {
  id: string;
  titulo?: string;
  capas: MockupCapaPdf[];
}

/**
 * Respuesta de `op=mockups` (subconjunto de `datos_pdf_render()`): con esto el
 * comprador compone con `PMUMockup.componer`, igual que la ficha.
 */
export interface MockupsPdf {
  activo: boolean;
  pdf: string;
  mockups: MockupPdf[];
  grupos: Array<{ id: string; w: number; h: number; cont?: number }>;
  imagenes: Record<string, string>;
  envolturas?: unknown;
  revision: string;
}

/**
 * Diseno del pedido: el ORIGINAL y su encuadre. El arte no viaja compuesto
 * (constitution §III): el servidor lo compone con el original + la receta.
 */
export interface Diseno {
  /** 12 hex del sha1 del contenido crudo (regla de la 035). */
  id: string;
  /** Item del cotizador (`cot-{8 hex}`). */
  itemKey: string;
  sid: string;
  /** Pixeles del sticker (lienzo explicito de la receta). */
  w: number;
  h: number;
  /** 12 hex de la receta v2 (`PMU_Sesion::receta_de`). */
  receta: string;
  /** URL del original (la devuelve el endpoint de subida). */
  url?: string;
}

/** Foto del precio al momento de guardar la idea (D7). */
export interface IdeaPrecio {
  final: number;
  perUnit: number;
  total: number;
  sheets: number;
  stickers: number;
  savingsPct: number;
  ts: number;
}

/** Custom (idea guardada del comprador): `customs/{idea_id}/idea.json`. */
export interface IdeaCustom {
  version: 1;
  id: string;
  creado: number;
  favorito: boolean;
  orden: number;
  titulo: string;
  descripcion: string;
  /** Codigo v1 del cotizador (lo valida el codec, no se parsea aca). */
  order: string;
  precio?: IdeaPrecio;
  diseno: Diseno;
  mockup: { id: string; w: number; h: number; mockupId: string; url?: string };
  /** URL del snapshot servida por el endpoint (`op=imagen`). */
  url?: string;
  /** Causa visible cuando el snapshot no resuelve (`cotizador:mockup:ausente`). */
  _causa?: string;
}

/** Estrella de un item que NO es un custom (se guarda en `favoritos.json`). */
export interface FavoritoRef {
  tipo: 'tienda' | 'historial';
  ref: string;
  creado: number;
}

/** Origen de una tarjeta de la tira unificada. */
export type TiraOrigen = 'tienda' | 'custom' | 'historial';

/**
 * Tarjeta de la tira unificada (tienda + customs + historial con el MISMO
 * formato). `key` es estable y unico en la tira (`tienda:{id}`, `custom:{idea}`,
 * `historial:{order_id}`).
 */
export interface TiraItem {
  key: string;
  origen: TiraOrigen;
  titulo: string;
  descripcion?: string;
  imagen?: string;
  order?: string;
  favorito: boolean;
  orden: number;
  creado: number;
  idea?: IdeaCustom;
  precio?: IdeaPrecio;
  /** Precio recalculado con el catalogo vigente (D7); ausente si no se pudo. */
  precioActual?: GalleryPricing | null;
}

export interface A4Layout {
  qty: number;
  fitType: A4FitType;
  renderW: number;
  renderH: number;
  adjustedW?: number;
  adjustedH?: number;
  // Tamaño ajustado EXACTO (sin redondear) para mostrar en pantalla.
  exactW?: number;
  exactH?: number;
  sheetRotated?: boolean; // Indica si la hoja A4 está rotada 90°
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