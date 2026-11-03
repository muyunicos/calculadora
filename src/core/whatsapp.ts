import type { Material, Order, PriceResult, ShapesCatalog, DeliveryOption, DesignOption } from '../types';
import { encodeOrderCode } from './orderCodec';
import { WHATSAPP_PHONE } from './wp';

const SHARE_BASE_URL = 'https://muyunicos.com/cotizador';

// Base del link compartible: la página actual (funciona en staging, subdirectorio
// o dominio nuevo) y, sin window (tests), la URL de producción.
function shareBase(): string {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return `${window.location.origin}${window.location.pathname}`;
  }
  return SHARE_BASE_URL;
}

// Genera la URL con código corto y estable (v1.m..s..), conservando cualquier
// otro query param que ya tenga la página (utm, etc.).
export function buildShareUrl(
  order: Order,
  materials: Material[],
  shapesCatalog: ShapesCatalog,
  deliveryOptions?: DeliveryOption[],
  designOptions?: DesignOption[],
  adjustedW?: number,
  adjustedH?: number,
): string {
  const base = shareBase();
  const shortCode = encodeOrderCode(
    order,
    materials,
    shapesCatalog,
    deliveryOptions || [],
    designOptions || [],
    adjustedW,
    adjustedH,
  );
  if (!shortCode) return base; // sin código no hay nada que compartir

  const [path, query = ''] = base.split('?');
  const params = new URLSearchParams(query);
  params.set('o', shortCode);
  return `${path}?${params.toString()}`;
}

// Etiqueta del formato: la del Admin si viene; si no, el texto histórico.
const formatoLabel = (deliveryFormat: Order['deliveryFormat'], customLabel?: string): string => {
  if (customLabel) return customLabel;
  if (deliveryFormat === 'sincorte') return 'Sin Cortar';
  if (deliveryFormat === 'individual') return 'Troquel Individual';
  if (deliveryFormat === 'plancha') return 'Planchas (Medio corte)';
  return String(deliveryFormat || 'A definir');
};

// Función combinada para generar mensajes de WhatsApp.
export function buildWhatsappMessage(
  order: Order,
  results: PriceResult | null,
  sizeText: string,
  shareUrl: string,
  isConsult: boolean = false,
  formato?: string,
): string {
  const intro = isConsult ? 'Hola! Quería consultarte por estos stickers:' : 'Hola! Quería encargar stickers:';

  return `${intro}

📦 *Material:* ${results?.activeMaterial?.name || ''}
✂️ *Formato:* ${formatoLabel(order.deliveryFormat, formato)}
📏 *Medida:* ${order.shapeType} ${sizeText}
🔢 *Cantidad:* ${results?.totalStickers || 0} unid. (${order.sheetsQty} planchas)
💰 *Total Estimado:* $${results?.finalPrice?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) || 0}

🔗 *Ver detalle del presupuesto:*
${shareUrl}`;
}

// Alias para compatibilidad con código existente.
export const buildConsultWhatsappMessage = (
  order: Order,
  results: PriceResult | null,
  sizeText: string,
  shareUrl: string,
  formato?: string,
): string => buildWhatsappMessage(order, results, sizeText, shareUrl, true, formato);

export function buildWhatsappLink(message: string): string {
  return `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(message)}`;
}