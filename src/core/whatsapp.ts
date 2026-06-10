import type { Order, PriceResult } from '../types';
import { encodeOrder } from './orderCodec';
import { WHATSAPP_PHONE } from './wp';

const SHARE_BASE_URL = 'https://muyunicos.com/calculadora';

export function buildShareUrl(order: Order): string {
  const base64Order = typeof window !== 'undefined' ? encodeOrder(order) : '';
  return `${SHARE_BASE_URL}?o=${base64Order}`;
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

export function buildWhatsappLink(message: string): string {
  return `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(message)}`;
}
