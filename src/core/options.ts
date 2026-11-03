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

// Devuelve las opciones del archivo tal como las dejó el admin (respetando
// altas, bajas y ediciones). Los defaults SOLO se usan cuando el archivo no trae
// la clave (deploys viejos) o viene vacío.
//
// Antes esta función "re-mergeaba" los defaults por id, lo que tenía dos efectos
// no deseados: (1) eliminar una opción desde el Admin no se persistía nunca, y
// (2) cualquier opción nueva (id propio) se descartaba en la siguiente carga.
function resolveOptions<T extends { id: string }>(provided: T[] | undefined, defaults: T[]): T[] {
  if (!Array.isArray(provided) || provided.length === 0) return defaults;
  const seen = new Set<string>();
  const out: T[] = [];
  for (const option of provided) {
    if (!option || typeof option.id !== 'string' || option.id === '') continue;
    if (seen.has(option.id)) continue; // ids duplicados: gana el primero
    seen.add(option.id);
    out.push(option);
  }
  return out.length > 0 ? out : defaults;
}

export const resolveDeliveryOptions = (provided?: DeliveryOption[]): DeliveryOption[] =>
  resolveOptions(provided, DEFAULT_DELIVERY_OPTIONS);

export const resolveDesignOptions = (provided?: DesignOption[]): DesignOption[] =>
  resolveOptions(provided, DEFAULT_DESIGN_OPTIONS);
