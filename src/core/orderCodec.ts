import type { DeliveryFormat, DesignType, Material, Order, ShapesCatalog, DeliveryOption, DesignOption } from '../types';

// --- CÓDIGO DE PEDIDO CORTO Y LEGIBLE (v1) ---
// Formato: tokens separados por '.', cada uno con una letra-clave + valor.
//   v1.m11.s201.q25.f2.d0          (material 11, forma/tamaño 201, 25 planchas,
//                                   formato 2 = plancha, diseño 0 = listo)
//   v1.m11.r2,5x5,5.q25.f2.d0      (rectangular 2,5 x 5,5 cm — decimales con coma
//                                   para no chocar con el separador '.')
//   ...d2.t60                      (diseño a medida con 60 min de trabajo)
//
// A diferencia del base64, este código es estable frente a reordenamientos del
// catálogo (usa los `code` del material/tamaño, no su posición) y sirve tanto para
// la URL compartible como para identificar pedidos en la galería.
export const ORDER_CODE_VERSION = 'v1';

const RECT_CATEGORY = 'Rectangulares';

const round1 = (value: number): number => Math.round((value + Number.EPSILON) * 10) / 10;

// Límites de medidas de un pedido rectangular (cm). Evita que un link
// manipulado (`?o=v1.m11.r300x20...`) genere un pedido de 0 unidades.
const MIN_RECT_CM = 2;
const MAX_RECT_CM = 100;

/** Parsea "53x50" (mm) -> { w, h } en cm. null si no es un rectángulo válido. */
const parseRectDims = (raw: string): { w: number; h: number } | null => {
  const [rawW, rawH] = raw.split('x');
  if (!rawW || !rawH) return null;
  const mmW = Number(rawW);
  const mmH = Number(rawH);
  if (!Number.isFinite(mmW) || !Number.isFinite(mmH) || mmW <= 0 || mmH <= 0) return null;
  const w = mmW / 10;
  const h = mmH / 10;
  if (w < MIN_RECT_CM || h < MIN_RECT_CM || w > MAX_RECT_CM || h > MAX_RECT_CM) return null;
  return { w: round1(w), h: round1(h) };
};

// Devuelve null si el pedido no puede representarse (p.ej. material/tamaño sin code).
// Ahora acepta configuraciones parciales para generar URLs cortas desde el principio.
export function encodeOrderCode(
  order: Order,
  materials: Material[],
  shapesCatalog: ShapesCatalog,
  deliveryOptions?: DeliveryOption[],
  designOptions?: DesignOption[],
  adjustedW?: number,
  adjustedH?: number,
): string | null {
  const material = materials?.find((m) => m.id === order.materialId);
  if (!material || material.code == null) return null;

  const parts: string[] = [ORDER_CODE_VERSION, `m${material.code}`];

  if (order.shapeType === RECT_CATEGORY) {
    // Usar dimensiones calculadas si están disponibles, si no usar las originales
    const w = adjustedW && adjustedW > 0 ? adjustedW : Number(order.customRectW);
    const h = adjustedH && adjustedH > 0 ? adjustedH : Number(order.customRectH);
    if (!w || !h || w <= 0 || h <= 0) return null;
    
    // Convertir a milímetros para el código (sin redondeo adicional, ya están calculadas)
    const mmW = Math.round(w * 10);
    const mmH = Math.round(h * 10);
    
    // Usar prefijo diferente según modo
    const prefix = order.rectCalcMode === 'economico' ? 'r' : 's';
    parts.push(`${prefix}${mmW}x${mmH}`);
  } else {
    const item = shapesCatalog[order.shapeType]?.[order.sizeIndex];
    if (!item || item.code == null) return null;
    parts.push(`s${item.code}`);
  }

  // Campos opcionales - solo agregar si están disponibles
  if (order.sheetsQty && order.sheetsQty >= 1) {
    parts.push(`q${order.sheetsQty}`);
  }

  // Complejidad efectiva del corte: el servidor la necesita para recalcular el
  // precio del carrito (y un link compartido reproduce el mismo precio aunque
  // el admin haya forzado la complejidad).
  const complexity = Math.max(1, Math.min(10, Math.round(Number(order.complexity) || 1)));
  parts.push(`c${complexity}`);
  
  if (deliveryOptions) {
    const deliveryOption = deliveryOptions?.find((o) => o.id === order.deliveryFormat);
    if (deliveryOption) {
      parts.push(`f${deliveryOption.code}`);
    }
  }
  
  if (designOptions) {
    const designOption = designOptions?.find((o) => o.id === order.designType);
    if (designOption) {
      parts.push(`d${designOption.code}`);
      if (designOption.isCustomTime) {
        const minutes = Math.max(0, Math.min(600, Math.round(Number(order.customDesignTime) || 0)));
        parts.push(`t${minutes}`);
      }
    }
  }

  return parts.join('.');
}

const isOrderCode = (s: string): boolean => s.startsWith(`${ORDER_CODE_VERSION}.`);

// Reconstruye el Order desde el código corto. La complejidad NO se codifica: se
// recalcula sola al cargar (autoComplexity), por lo que arranca en un valor neutro.
// Devuelve null si el código es inválido o referencia opciones inexistentes.
// Ahora acepta configuraciones parciales (solo material, material+forma, etc).
export function decodeOrderCode(
  code: string,
  materials: Material[],
  shapesCatalog: ShapesCatalog,
  deliveryOptions?: DeliveryOption[],
  designOptions?: DesignOption[],
): Order | null {
  const tokens = code.split('.');
  if (tokens[0] !== ORDER_CODE_VERSION) return null;

  const order: Order = {
    shapeType: '',
    sizeIndex: -1,
    customRectW: '',
    customRectH: '',
    sheetsQty: 0,
    materialId: '',
    deliveryFormat: '',
    complexity: 3,
    designType: '',
    customDesignTime: 45,
  };

  for (const token of tokens.slice(1)) {
    const key = token[0];
    const val = token.slice(1);
    switch (key) {
      case 'm': {
        const material = materials?.find((m) => String(m.code) === val);
        if (!material) return null;
        order.materialId = material.id;
        break;
      }
      case 's': {
        // Puede ser un rectangular en modo "preciso" (mm: "203x271") o el
        // código de un tamaño del catálogo ("60").
        const dims = parseRectDims(val);
        if (dims) {
          order.shapeType = RECT_CATEGORY;
          order.rectCalcMode = 'preciso';
          order.customRectW = String(dims.w);
          order.customRectH = String(dims.h);
        } else {
          let resolved = false;
          for (const [category, items] of Object.entries(shapesCatalog)) {
            const idx = items.findIndex((it) => String(it.code) === val);
            if (idx >= 0) {
              order.shapeType = category;
              order.sizeIndex = idx;
              resolved = true;
              break;
            }
          }
          if (!resolved) return null;
        }
        break;
      }
      case 'r': {
        const dims = parseRectDims(val);
        if (!dims) return null;
        order.shapeType = RECT_CATEGORY;
        // Siempre en mm (modo económico)
        order.rectCalcMode = 'economico';
        order.customRectW = String(dims.w);
        order.customRectH = String(dims.h);
        break;
      }
      case 'q': {
        const qty = parseInt(val, 10);
        if (!Number.isFinite(qty) || qty < 1 || qty > 10000) return null;
        order.sheetsQty = qty;
        break;
      }
      case 'c': {
        const level = parseInt(val, 10);
        if (!Number.isFinite(level)) return null;
        order.complexity = Math.max(1, Math.min(10, level));
        break;
      }
      case 'f': {
        const code = parseInt(val, 10);
        if (!Number.isFinite(code)) return null;
        if (deliveryOptions && deliveryOptions.length > 0) {
          const deliveryOption = deliveryOptions.find((o) => o.code === code);
          // Código inexistente: no cargar un pedido a medias con el formato vacío.
          if (!deliveryOption) return null;
          order.deliveryFormat = deliveryOption.id;
        }
        break;
      }
      case 'd': {
        const code = parseInt(val, 10);
        if (!Number.isFinite(code)) return null;
        if (designOptions && designOptions.length > 0) {
          const designOption = designOptions.find((o) => o.code === code);
          if (!designOption) return null;
          order.designType = designOption.id;
        }
        break;
      }
      case 't': {
        const minutes = parseInt(val, 10);
        if (!Number.isFinite(minutes)) return null;
        order.customDesignTime = Math.max(0, Math.min(600, minutes));
        break;
      }
      default:
        break;
    }
  }

  return order;
}

// Decodifica el código corto v1 (requiere catálogo).
// Devuelve null si el código es inválido o referencia opciones inexistentes.
export function decodeAnyOrder(
  param: string,
  materials: Material[],
  shapesCatalog: ShapesCatalog,
  deliveryOptions?: DeliveryOption[],
  designOptions?: DesignOption[],
): Order | null {
  if (isOrderCode(param)) return decodeOrderCode(param, materials, shapesCatalog, deliveryOptions, designOptions);
  return null;
}
