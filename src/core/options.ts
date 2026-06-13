import type { DeliveryOption, DesignOption } from '../types';

// Presentación por defecto de los formatos de entrega y los tipos de diseño.
//
// Ahora incluye parámetros de pricing data-driven (cutFactor, designMinutes, etc.)
// y códigos numéricos estables para el codec. Sirven de fallback cuando el
// datos_config.json del servidor todavía no trae las claves `deliveryOptions` /
// `designOptions` (deploys viejos), y son la semilla que se persiste al editar
// estas opciones desde el Admin.
//
// Los códigos (0, 1, 2) mantienen backward compatibility con los códigos de
// pedido existentes: v1.f0, v1.f1, v1.f2 / v1.d0, v1.d1, v1.d2

export const DEFAULT_DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'sincorte',
    code: 0,
    label: 'Sin Cortar (Solo Impresión)',
    subtitle: 'Impresión con tintas UV, vos lo cortas a mano.',
    cutFactor: 0,
    cutWearFactor: 0,
    visible: true,
  },
  {
    id: 'individual',
    code: 2,
    label: 'Troquelados Sueltos (Corte Individual)',
    subtitle: 'Stickers cortados uno por uno, listos para repartir.',
    cutFactor: 2,
    cutWearFactor: 2,
    visible: true,
  },
  {
    id: 'plancha',
    code: 1,
    label: 'Planchas A4 (Medio Corte)',
    subtitle: 'Ideales para despegar vos mismo rápidamente.',
    cutFactor: 1,
    cutWearFactor: 1,
    visible: true,
  },
];

export const DEFAULT_DESIGN_OPTIONS: DesignOption[] = [
  {
    id: 'none',
    code: 0,
    label: 'Ya lo tengo listo',
    subtitle: 'Archivo preparado para impresión.',
    designMinutes: 0,
    isCustomTime: false,
    customerVisible: true,
    visible: true,
  },
  {
    id: 'basic',
    code: 1,
    label: 'Incluir armado básico',
    subtitle: 'Acomodamos tu logo/imagen.',
    designMinutes: 10,
    isCustomTime: false,
    customerVisible: true,
    visible: true,
  },
  {
    id: 'custom',
    code: 2,
    label: 'Diseño a medida',
    subtitle: 'Trabajo de diseño personalizado.',
    designMinutes: undefined,
    isCustomTime: true,
    customerVisible: false,
    visible: false,
  },
];

// Completa una lista de opciones provista por el servidor con las que falten
// (por `id`), preservando el orden/edición del admin y garantizando que siempre
// existan todas las opciones estables que el motor de precios necesita.
function mergeById<T extends { id: string }>(provided: T[] | undefined, defaults: T[]): T[] {
  if (!provided || provided.length === 0) return defaults;
  const byId = new Map(provided.map((o) => [o.id, o]));
  const merged = provided.filter((o) => defaults.some((d) => d.id === o.id));
  for (const d of defaults) {
    if (!byId.has(d.id)) merged.push(d);
  }
  return merged.length > 0 ? merged : defaults;
}

export const resolveDeliveryOptions = (provided?: DeliveryOption[]): DeliveryOption[] =>
  mergeById(provided, DEFAULT_DELIVERY_OPTIONS);

export const resolveDesignOptions = (provided?: DesignOption[]): DesignOption[] =>
  mergeById(provided, DEFAULT_DESIGN_OPTIONS);
