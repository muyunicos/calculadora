import type { Material, Order, PriceResult, ShapesCatalog, DeliveryOption, DesignOption } from '../types';
import { encodeOrderCode } from './orderCodec';

const SHARE_BASE_URL = 'https://muyunicos.com/cotizador';

// Genera URL con código corto y estable (v1.m..s..). Acepta configuraciones parciales.
export function buildShareUrl(
  order: Order,
  materials: Material[],
  shapesCatalog: ShapesCatalog,
  deliveryOptions?: DeliveryOption[],
  designOptions?: DesignOption[],
  adjustedW?: number,
  adjustedH?: number,
): string {
  const shortCode = encodeOrderCode(order, materials, shapesCatalog, deliveryOptions || [], designOptions || [], adjustedW, adjustedH);
  if (!shortCode) return SHARE_BASE_URL; // Fallback si no se puede generar código
  return `${SHARE_BASE_URL}?o=${shortCode}`;
}

const formatoLabel = (deliveryFormat: Order['deliveryFormat']): string =>
  deliveryFormat === 'sincorte'
    ? 'Sin Cortar'
    : deliveryFormat === 'individual'
      ? 'Troquel Individual'
      : 'Planchas (Medio corte)';

// Función combinada para generar mensajes de WhatsApp
export function buildWhatsappMessage(
  order: Order,
  results: PriceResult | null,
  sizeText: string,
  shareUrl: string,
  isConsult: boolean = false,
): string {
  const intro = isConsult ? 'Hola! Quería consultarte por estos stickers:' : 'Hola! Quería encargar stickers:';
  
  return `${intro}

📦 *Material:* ${results?.activeMaterial?.name || ''}
✂️ *Formato:* ${formatoLabel(order.deliveryFormat)}
📏 *Medida:* ${order.shapeType} ${sizeText}
🔢 *Cantidad:* ${results?.totalStickers || 0} unid. (${order.sheetsQty} planchas)
💰 *Total Estimado:* $${results?.finalPrice?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) || 0}

🔗 *Ver detalle del presupuesto:*
${shareUrl}`;
}

// Alias para compatibilidad con código existente
export const buildConsultWhatsappMessage = (
  order: Order,
  results: PriceResult | null,
  sizeText: string,
  shareUrl: string,
): string => buildWhatsappMessage(order, results, sizeText, shareUrl, true);

export function buildWhatsappLink(message: string): string {
  return `https://api.whatsapp.com/send?phone=542235331311&text=${encodeURIComponent(message)}`;
}
