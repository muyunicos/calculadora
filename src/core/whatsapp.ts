import type { Material, Order, PriceResult, ShapesCatalog, DeliveryOption, DesignOption } from '../types';
import { encodeOrder, encodeOrderCode } from './orderCodec';
import { WHATSAPP_PHONE } from './wp';

const SHARE_BASE_URL = 'https://muyunicos.com/calculadora';

// Prefiere el código corto y estable (v1.m..s..); si no puede generarse (datos sin
// `code`), cae al base64 autocontenido para no romper el compartir.
export function buildShareUrl(
  order: Order,
  materials: Material[],
  shapesCatalog: ShapesCatalog,
  deliveryOptions?: DeliveryOption[],
  designOptions?: DesignOption[],
): string {
  const shortCode = encodeOrderCode(order, materials, shapesCatalog, deliveryOptions || [], designOptions || []);
  const code = shortCode ?? (typeof window !== 'undefined' ? encodeOrder(order) : '');
  return `${SHARE_BASE_URL}?o=${code}`;
}

const formatoLabel = (deliveryFormat: Order['deliveryFormat']): string =>
  deliveryFormat === 'sincorte'
    ? 'Sin Cortar'
    : deliveryFormat === 'individual'
      ? 'Troquel Individual'
      : 'Planchas (Medio corte)';

export function buildWhatsappMessage(
  order: Order,
  results: PriceResult | null,
  sizeText: string,
  shareUrl: string,
): string {
  return `Hola! Quería encargar stickers:

📦 *Material:* ${results?.activeMaterial?.name || ''}
✂️ *Formato:* ${formatoLabel(order.deliveryFormat)}
📏 *Medida:* ${order.shapeType} ${sizeText}
🔢 *Cantidad:* ${results?.totalStickers || 0} unid. (${order.sheetsQty} planchas)
💰 *Total Estimado:* $${results?.finalPrice?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) || 0}

🔗 *Ver detalle del presupuesto:*
${shareUrl}`;
}

export function buildConsultWhatsappMessage(
  order: Order,
  results: PriceResult | null,
  sizeText: string,
  shareUrl: string,
): string {
  return `Hola! Quería consultarte por estos stickers:

📦 *Material:* ${results?.activeMaterial?.name || ''}
✂️ *Formato:* ${formatoLabel(order.deliveryFormat)}
📏 *Medida:* ${order.shapeType} ${sizeText}
🔢 *Cantidad:* ${results?.totalStickers || 0} unid. (${order.sheetsQty} planchas)
💰 *Total Estimado:* $${results?.finalPrice?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) || 0}

🔗 *Ver detalle del presupuesto:*
${shareUrl}`;
}

export function buildWhatsappLink(message: string): string {
  return `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(message)}`;
}
