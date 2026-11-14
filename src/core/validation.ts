import type {
  AppData,
  Config,
  DeliveryOption,
  DesignOption,
  GalleryItem,
  Material,
  PlantillaCotizador,
  RangoCm,
  ShapeItem,
  ShapesCatalog,
  ShapesShowMoreIndex,
} from '../types';
import { DEFAULT_DELIVERY_OPTIONS, DEFAULT_DESIGN_OPTIONS } from './options';

// --- SANEO DE DATOS DE CONFIGURACIÓN ---
//
// Antes esto era un schema de Zod "todo o nada": un solo campo inválido (un
// material sin nombre, una foto recién agregada sin código, `hourlyRate`
// Infinity convertido a null por JSON.stringify) hacía fallar la carga y dejaba
// la calculadora inutilizable para TODOS los clientes.
//
// Ahora el criterio es: la estructura sí o sí (config/materials/shapesCatalog),
// y todo lo demás se repara. Lo que no se puede reparar se descarta y se anota
// en `warnings`. El mismo saneador se usa al GUARDAR, así el admin no puede
// persistir datos que rompan la próxima carga.

export type ValidationResult =
  | { success: true; data: AppData; warnings: string[] }
  | { success: false; error: string };

const DEFAULT_GALLERY_IMAGE =
  'https://muyunicos.com/wp-content/themes/generatepress-child/assets/images/default.webp';

const CONFIG_FALLBACK: Config = {
  calcSalaryMode: false,
  monthlySalary: 0,
  weeklyHours: 38,
  hourlyRate: 0,
  packagingCost: 0,
  wasteMargin: 0,
  profitMargin: 0,
  timeCustomerService: 0,
  timeDelivery: 0,
  timeDesignBasic: 0,
  timeDesignCustom: 0,
  galleryRefSheets: 10,
};

// [mínimo, máximo] por campo numérico de Config (mismos topes que el schema
// anterior, pero ahora se recortan en lugar de rechazar todo el archivo).
const CONFIG_LIMITS: Record<Exclude<keyof Config, 'calcSalaryMode'>, [number, number]> = {
  monthlySalary: [0, 1e9],
  weeklyHours: [0, 168],
  hourlyRate: [0, 1e7],
  packagingCost: [0, 1e7],
  wasteMargin: [0, 100],
  profitMargin: [0, 1000],
  timeCustomerService: [0, 100000],
  timeDelivery: [0, 100000],
  timeDesignBasic: [0, 100000],
  timeDesignCustom: [0, 100000],
  galleryRefSheets: [1, 1000],
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

const optionalStr = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

/** Número finito y recortado al rango. `NaN`, `Infinity` y basura -> fallback. */
const num = (v: unknown, fallback: number, min: number, max: number): number => {
  const parsed = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

/** Entero finito y recortado al rango. */
const int = (v: unknown, fallback: number, min: number, max: number): number =>
  Math.round(num(v, fallback, min, max));

/** Código opcional: ausente/vacío -> undefined (no 0, que sería un código real). */
const optionalCode = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
};

// --- SANEADORES POR ENTIDAD ---

function sanitizeConfig(raw: Record<string, unknown>, warnings: string[]): Config {
  const config: Config = { ...CONFIG_FALLBACK };
  config.calcSalaryMode = bool(raw.calcSalaryMode, CONFIG_FALLBACK.calcSalaryMode);

  for (const key of Object.keys(CONFIG_LIMITS) as Array<Exclude<keyof Config, 'calcSalaryMode'>>) {
    const [min, max] = CONFIG_LIMITS[key];
    const value = num(raw[key], CONFIG_FALLBACK[key], min, max);
    if (typeof raw[key] !== 'number' || !Number.isFinite(raw[key] as number) || value !== raw[key]) {
      warnings.push(`config.${key} inválido; se usó ${value}.`);
    }
    config[key] = value;
  }

  // hourlyRate no puede ser Infinity (pasa si weeklyHours = 0): JSON.stringify lo
  // convierte en `null` y antes rompía la carga entera.
  if (!Number.isFinite(config.hourlyRate)) {
    config.hourlyRate =
      config.weeklyHours > 0 ? Math.round(config.monthlySalary / (config.weeklyHours * 4.33)) : 0;
    warnings.push('config.hourlyRate no era un número válido; se recalculó.');
  }
  if (config.calcSalaryMode && config.weeklyHours > 0 && config.hourlyRate === 0 && config.monthlySalary > 0) {
    config.hourlyRate = Math.round(config.monthlySalary / (config.weeklyHours * 4.33));
  }

  return config;
}

function sanitizeMaterial(raw: unknown, index: number, warnings: string[]): Material | null {
  if (!isRecord(raw)) {
    warnings.push(`materials[${index}] ignorado: no es un objeto.`);
    return null;
  }
  const name = str(raw.name).trim();
  if (!name) {
    warnings.push(`materials[${index}] ignorado: no tiene nombre.`);
    return null;
  }
  const id = str(raw.id).trim() || `m${index + 1}`;
  return {
    id,
    name,
    code: optionalCode(raw.code),
    description: optionalStr(raw.description),
    image: optionalStr(raw.image),
    sheetCost: num(raw.sheetCost, 0, 0, 1e7),
    printTime: num(raw.printTime, 0, 0, 100000),
    inkCost: num(raw.inkCost, 0, 0, 1e7),
    printWear: num(raw.printWear, 0, 0, 1e7),
    minCutTime: num(raw.minCutTime, 0, 0, 100000),
    maxCutTime: num(raw.maxCutTime, 0, 0, 100000),
    cutWear: num(raw.cutWear, 0, 0, 1e7),
    visible: raw.visible === undefined ? undefined : bool(raw.visible, true),
  };
}

function sanitizeShapeItem(raw: unknown, category: string, index: number, warnings: string[]): ShapeItem | null {
  if (!isRecord(raw)) {
    warnings.push(`shapesCatalog.${category}[${index}] ignorado: no es un objeto.`);
    return null;
  }
  const size = str(raw.size).trim();
  if (!size) {
    warnings.push(`shapesCatalog.${category}[${index}] ignorado: no tiene tamaño.`);
    return null;
  }
  return {
    size,
    qty: int(raw.qty, 0, 0, 100000),
    code: optionalCode(raw.code),
    description: optionalStr(raw.description),
    image: optionalStr(raw.image),
    visible: raw.visible === undefined ? undefined : bool(raw.visible, true),
  };
}

function sanitizeShapesCatalog(raw: Record<string, unknown>, warnings: string[]): ShapesCatalog {
  const catalog: ShapesCatalog = {};
  for (const [category, items] of Object.entries(raw)) {
    if (!Array.isArray(items)) {
      warnings.push(`shapesCatalog.${category} ignorado: no es una lista.`);
      continue;
    }
    catalog[category] = items
      .map((item, index) => sanitizeShapeItem(item, category, index, warnings))
      .filter((item): item is ShapeItem => item !== null);
  }
  return catalog;
}

function sanitizeGallery(raw: unknown, warnings: string[]): GalleryItem[] {
  if (!Array.isArray(raw)) return [];
  const out: GalleryItem[] = [];
  const seen = new Set<string>();
  raw.forEach((item, index) => {
    if (!isRecord(item)) {
      warnings.push(`gallery[${index}] ignorada: no es un objeto.`);
      return;
    }
    const id = str(item.id).trim() || `g_${index + 1}`;
    if (seen.has(id)) {
      warnings.push(`gallery: id duplicado "${id}" ignorado.`);
      return;
    }
    seen.add(id);
    const order = str(item.order).trim();
    if (!order) {
      // Una foto recién creada (sin código) no puede cargar ningún pedido: se
      // guarda oculta para no mostrar una tarjeta rota en la vista cliente.
      warnings.push(`gallery[${index}] ("${id}") no tiene código de pedido; se muestra oculta.`);
    }
    out.push({
      id,
      image: str(item.image),
      title: optionalStr(item.title),
      caption: optionalStr(item.caption),
      order,
      visible: order ? bool(item.visible, true) : false,
    });
  });
  return out;
}

function sanitizeDeliveryOptions(raw: unknown, warnings: string[]): DeliveryOption[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: DeliveryOption[] = [];
  const seen = new Set<string>();
  raw.forEach((item, index) => {
    if (!isRecord(item)) {
      warnings.push(`deliveryOptions[${index}] ignorada: no es un objeto.`);
      return;
    }
    let id = str(item.id).trim();
    if (!id) id = `formato_${index + 1}`;
    if (seen.has(id)) {
      warnings.push(`deliveryOptions: id duplicado "${id}" ignorado.`);
      return;
    }
    seen.add(id);
    const def = DEFAULT_DELIVERY_OPTIONS.find((d) => d.id === id);
    out.push({
      id,
      code: int(item.code, def?.code ?? index, 0, 100000),
      label: str(item.label).trim() || def?.label || `Formato ${index + 1}`,
      subtitle: optionalStr(item.subtitle) ?? def?.subtitle,
      description: optionalStr(item.description),
      image: optionalStr(item.image),
      cutFactor: num(item.cutFactor, def?.cutFactor ?? 1, 0, 100),
      cutWearFactor: num(item.cutWearFactor, def?.cutWearFactor ?? 1, 0, 100),
      visible: bool(item.visible, def?.visible ?? true),
    });
  });
  return out;
}

function sanitizeDesignOptions(raw: unknown, warnings: string[]): DesignOption[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: DesignOption[] = [];
  const seen = new Set<string>();
  raw.forEach((item, index) => {
    if (!isRecord(item)) {
      warnings.push(`designOptions[${index}] ignorada: no es un objeto.`);
      return;
    }
    let id = str(item.id).trim();
    if (!id) id = `diseno_${index + 1}`;
    if (seen.has(id)) {
      warnings.push(`designOptions: id duplicado "${id}" ignorado.`);
      return;
    }
    seen.add(id);
    const def = DEFAULT_DESIGN_OPTIONS.find((d) => d.id === id);
    out.push({
      id,
      code: int(item.code, def?.code ?? index, 0, 100000),
      label: str(item.label).trim() || def?.label || `Opción ${index + 1}`,
      subtitle: optionalStr(item.subtitle) ?? def?.subtitle,
      description: optionalStr(item.description),
      image: optionalStr(item.image),
      designMinutes: num(item.designMinutes, def?.designMinutes ?? 0, 0, 100000),
      isCustomTime: bool(item.isCustomTime, def?.isCustomTime ?? false),
      customerVisible:
        item.customerVisible === undefined ? def?.customerVisible : bool(item.customerVisible, true),
      visible: bool(item.visible, def?.visible ?? true),
    });
  });
  return out;
}

function sanitizeIndexRecord(
  raw: unknown,
  limitByKey: Record<string, number>,
  label: string,
  warnings: string[],
): ShapesShowMoreIndex | undefined {
  if (!isRecord(raw)) return undefined;
  const out: ShapesShowMoreIndex = {};
  for (const [key, value] of Object.entries(raw)) {
    const limit = limitByKey[key];
    if (limit === undefined) continue;
    const index = int(value, 0, 0, limit);
    if (index !== value) warnings.push(`${label}.${key} fuera de rango; se usó ${index}.`);
    out[key] = index;
  }
  return out;
}
/**
 * Sanea el catalogo de plantillas del cotizador (spec 037 Enmienda v2, T040).
 *
 * Criterio "repara y avisa": una entrada sin `id`, sin `categoria` o con un
 * `rango` incoherente se descarta (o se le quita el rango) y se anota en
 * `warnings`; nunca se publica una plantilla que mande a un PDF inexistente sin
 * avisar. `pdf` se normaliza a slug (`[a-z0-9_-]`, sin `.pdf`): el plugin valida
 * que exista.
 */
function sanitizePlantillas(raw: unknown, warnings: string[]): PlantillaCotizador[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    warnings.push('plantillas no es una lista; se ignoró.');
    return [];
  }
  const out: PlantillaCotizador[] = [];
  const ids = new Set<string>();
  raw.forEach((item, index) => {
    const etiqueta = `plantillas[${index}]`;
    if (!isRecord(item)) {
      warnings.push(`${etiqueta} no es un objeto; se descartó.`);
      return;
    }
    const id = str(item.id).trim();
    if (!id) {
      warnings.push(`${etiqueta} no tiene id; se descartó.`);
      return;
    }
    if (ids.has(id)) {
      warnings.push(`${etiqueta} repite el id "${id}"; se descartó.`);
      return;
    }
    const categoria = str(item.categoria).trim();
    if (!categoria) {
      warnings.push(`${etiqueta} ("${id}") no tiene categoria; se descartó.`);
      return;
    }
    if (item.visible === false) {
      warnings.push(`${etiqueta} ("${id}") está oculta; no se publica.`);
      return;
    }
    const pdf = str(item.pdf).trim().toLowerCase().replace(/\.pdf$/, '').replace(/[^a-z0-9_-]/g, '');
    const grupoCrudo = str(item.grupo).trim().toLowerCase();
    const grupo = grupoCrudo === 'auto'
      ? 'auto'
      : /^[0-9a-f]{6}$/.test(grupoCrudo) ? grupoCrudo.toUpperCase() : 'todos';
    let rango: RangoCm | undefined;
    if (isRecord(item.rango)) {
      const minX = num(item.rango.minX, 0, 0, 1000);
      const maxX = num(item.rango.maxX, 0, 0, 1000);
      const minY = num(item.rango.minY, 0, 0, 1000);
      const maxY = num(item.rango.maxY, 0, 0, 1000);
      if (maxX > 0 && maxY > 0 && minX <= maxX && minY <= maxY) {
        rango = { minX, maxX, minY, maxY };
      } else {
        warnings.push(`${etiqueta} ("${id}") tiene un rango inválido; se ignora el rango.`);
      }
    }
    ids.add(id);
    out.push({
      id,
      titulo: (optionalStr(item.titulo)?.trim() || categoria).slice(0, 60),
      categoria,
      pdf,
      grupo,
      rango,
      visible: true,
      orden: int(item.orden, out.length, 0, 999),
    });
  });
  return out
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map((plantilla, i) => ({ ...plantilla, orden: i }));
}

/**
 * Valida y REPARA los datos de configuración. Solo falla si falta la estructura
 * mínima para poder calcular (config, materiales y al menos un tamaño).
 */
export function validateAppData(raw: unknown): ValidationResult {
  if (!isRecord(raw)) return { success: false, error: 'La configuración no es un objeto JSON.' };
  if (!isRecord(raw.config)) return { success: false, error: 'Falta "config".' };
  if (!Array.isArray(raw.materials)) return { success: false, error: 'Falta "materials".' };
  if (!isRecord(raw.shapesCatalog)) return { success: false, error: 'Falta "shapesCatalog".' };

  const warnings: string[] = [];
  const config = sanitizeConfig(raw.config, warnings);

  const materials = raw.materials
    .map((item, index) => sanitizeMaterial(item, index, warnings))
    .filter((item): item is Material => item !== null);
  if (materials.length === 0) {
    return { success: false, error: 'No hay ningún material válido en "materials".' };
  }

  const shapesCatalog = sanitizeShapesCatalog(raw.shapesCatalog, warnings);
  const totalSizes = Object.values(shapesCatalog).reduce((acc, items) => acc + items.length, 0);
  if (totalSizes === 0) {
    return { success: false, error: 'No hay ningún tamaño válido en "shapesCatalog".' };
  }

  const gallery = sanitizeGallery(raw.gallery, warnings);
  const shapesShowMoreIndex = sanitizeIndexRecord(
    raw.shapesShowMoreIndex,
    Object.fromEntries(Object.entries(shapesCatalog).map(([k, v]) => [k, v.length])),
    'shapesShowMoreIndex',
    warnings,
  );
  const materialsShowMoreIndex =
    raw.materialsShowMoreIndex === undefined
      ? undefined
      : int(raw.materialsShowMoreIndex, 2, 0, materials.length);

  const data: AppData = {
    config,
    materials,
    shapesCatalog,
    shapesShowMoreIndex,
    materialsShowMoreIndex,
    gallery,
    deliveryOptions: sanitizeDeliveryOptions(raw.deliveryOptions, warnings),
    designOptions: sanitizeDesignOptions(raw.designOptions, warnings),
    plantillas: sanitizePlantillas(raw.plantillas, warnings),
    tiraNombre: optionalStr(raw.tiraNombre)?.trim() || undefined,
  };

  const uniqueWarnings = Array.from(new Set(warnings)).slice(0, 25);
  return { success: true, data, warnings: uniqueWarnings };
}

/** Alias explícito para el camino de guardado (mismo saneador que la lectura). */
export const sanitizeAppData = validateAppData;

/** Normaliza lo que no vale la pena descartar: imagen por defecto de la galería. */
export function normalizeAppData(data: AppData): AppData {
  const gallery = (data.gallery ?? []).map((item) => ({
    ...item,
    image: item.image && item.image.trim() !== '' ? item.image : DEFAULT_GALLERY_IMAGE,
  }));

  // Se respeta el orden del archivo (es el orden que ve el admin), a diferencia
  // de la versión anterior que reordenaba por timestamp del id y rompía tanto el
  // orden manual como los ids legacy ("g1", "g2", ...).
  return { ...data, gallery };
}

export { DEFAULT_GALLERY_IMAGE };
