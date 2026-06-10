import type { DeliveryFormat, DesignType, Material, Order, ShapesCatalog } from '../types';

// --- CODIFICACIÓN BASE64 UTF-8 (sin escape/unescape deprecados) ---
// Produce el mismo base64 que btoa(unescape(encodeURIComponent(...))), por lo que
// las URLs generadas con la versión anterior siguen siendo compatibles.
export const encodeOrder = (obj: Order): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

export const decodeOrder = (b64: string): Order => {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as Order;
};

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

// El índice define el número que viaja en el código (no cambiar el orden).
const FORMATS: DeliveryFormat[] = ['sincorte', 'individual', 'plancha'];
const DESIGNS: DesignType[] = ['none', 'basic', 'custom'];
const RECT_CATEGORY = 'Rectangulares';

const numToCode = (v: number | string): string => String(v).replace('.', ',');
const codeToNum = (v: string): string => v.replace(',', '.');

// Devuelve null si el pedido no puede representarse (p.ej. material/tamaño sin code).
export function encodeOrderCode(
  order: Order,
  materials: Material[],
  shapesCatalog: ShapesCatalog,
): string | null {
  const material = materials.find((m) => m.id === order.materialId);
  if (!material || material.code == null) return null;

  const parts: string[] = [ORDER_CODE_VERSION, `m${material.code}`];

  if (order.shapeType === RECT_CATEGORY) {
    const w = Number(order.customRectW);
    const h = Number(order.customRectH);
    if (!w || !h || w <= 0 || h <= 0) return null;
    parts.push(`r${numToCode(order.customRectW)}x${numToCode(order.customRectH)}`);
  } else {
    const item = shapesCatalog[order.shapeType]?.[order.sizeIndex];
    if (!item || item.code == null) return null;
    parts.push(`s${item.code}`);
  }

  const fIdx = FORMATS.indexOf(order.deliveryFormat as DeliveryFormat);
  const dIdx = DESIGNS.indexOf(order.designType as DesignType);
  if (!order.sheetsQty || order.sheetsQty < 1 || fIdx < 0 || dIdx < 0) return null;

  parts.push(`q${order.sheetsQty}`, `f${fIdx}`, `d${dIdx}`);
  if (order.designType === 'custom') parts.push(`t${order.customDesignTime}`);

  return parts.join('.');
}

const isOrderCode = (s: string): boolean => s.startsWith(`${ORDER_CODE_VERSION}.`);

// Reconstruye el Order desde el código corto. La complejidad NO se codifica: se
// recalcula sola al cargar (autoComplexity), por lo que arranca en un valor neutro.
// Devuelve null si el código es inválido o referencia opciones inexistentes.
export function decodeOrderCode(
  code: string,
  materials: Material[],
  shapesCatalog: ShapesCatalog,
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
        const material = materials.find((m) => String(m.code) === val);
        if (!material) return null;
        order.materialId = material.id;
        break;
      }
      case 's': {
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
        break;
      }
      case 'r': {
        const [w, h] = val.split('x');
        if (!w || !h) return null;
        order.shapeType = RECT_CATEGORY;
        order.customRectW = codeToNum(w);
        order.customRectH = codeToNum(h);
        break;
      }
      case 'q':
        order.sheetsQty = parseInt(val, 10) || 0;
        break;
      case 'f':
        order.deliveryFormat = FORMATS[parseInt(val, 10)] ?? '';
        break;
      case 'd':
        order.designType = DESIGNS[parseInt(val, 10)] ?? '';
        break;
      case 't':
        order.customDesignTime = parseInt(val, 10) || 45;
        break;
      default:
        break;
    }
  }

  return order;
}

// Decodifica cualquier formato de `?o=`: el código corto v1 (requiere catálogo) o
// el base64 viejo (autocontenido). Mantiene compatibilidad con links ya compartidos.
export function decodeAnyOrder(
  param: string,
  materials: Material[],
  shapesCatalog: ShapesCatalog,
): Order | null {
  if (isOrderCode(param)) return decodeOrderCode(param, materials, shapesCatalog);
  try {
    return decodeOrder(param);
  } catch {
    return null;
  }
}
