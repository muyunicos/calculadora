// --- DATOS INYECTADOS POR WORDPRESS (wp_localize_script) ---
// El shortcode expone window.WP_STICKER_DATA con isAdmin y las URLs del tema.
// Fallbacks para poder probar el componente fuera de WP.

interface WpStickerData {
  isAdmin?: boolean;
  assetsUrl?: string;
  configUrl?: string;
  saveUrl?: string;
  // Nonce de WordPress para el guardado (wp_create_nonce). Si el shortcode no lo
  // inyecta, el guardado sigue funcionando con la cookie de sesión + capability.
  saveNonce?: string;
  productId?: number;
  // Spec 037: puente con el plugin Personalizador PDF (el cotizador lo usa como
  // proveedor de diseño). `baseUrl` es la URL de la carpeta del plugin; el resto
  // son los endpoints que ya usan sus módulos (`PMU_TIENDA`).
  pmu?: {
    baseUrl?: string;
    postUrl?: string;
    ajaxUrl?: string;
    nonce?: string;
  };
}

declare global {
  interface Window {
    WP_STICKER_DATA?: WpStickerData;
    // Objetos que inyecta el plugin cuando sus módulos se cargan en esta página.
    PMU_TIENDA?: Record<string, unknown>;
    PMU_COTIZADOR?: Record<string, unknown>;
  }
}

const WP: WpStickerData = (typeof window !== 'undefined' && window.WP_STICKER_DATA) || {};

export const ASSETS_URL = WP.assetsUrl || './assets'; // .../tema/assets
export const CONFIG_URL = WP.configUrl || `${ASSETS_URL}/datos_config_etag.php`;
export const SAVE_URL = WP.saveUrl || `${ASSETS_URL}/guardar_datos.php`;
// Nonce opcional para el POST de guardado (si el shortcode lo inyecta).
export const SAVE_NONCE = WP.saveNonce || '';
// ID del producto "Cotizador" (usado por el fallback de la Media Library).
export const PRODUCT_ID = Number(WP.productId) || 0;
// Solo un admin real de WP puede ver/editar el modo Admin.
export const CAN_BE_ADMIN = !!WP.isAdmin;

// Número de WhatsApp del negocio (a futuro debería venir de la config).
export const WHATSAPP_PHONE = '542235331311';
// --- PUENTE CON EL PLUGIN PERSONALIZADOR PDF (spec 037) ---
// El cotizador es un CONSUMIDOR declarado del plugin: sube el original del
// comprador, compone el mockup 300x300 en el navegador y guarda sus ideas. Todos
// los datos del puente los inyecta el tema; si faltan, el paso de diseno se
// degrada (D9) y el cotizador sigue cotizando y comprando.
export const PMU_BASE = WP.pmu?.baseUrl || '';
export const PMU_POST = WP.pmu?.postUrl || '';
export const PMU_AJAX = WP.pmu?.ajaxUrl || '';
export const PMU_NONCE = WP.pmu?.nonce || '';
/** Sin `baseUrl` o sin nonce no hay puente: el paso de diseno se oculta. */
export const PMU_DISPONIBLE = !!(PMU_BASE && (PMU_POST || PMU_AJAX) && PMU_NONCE);
