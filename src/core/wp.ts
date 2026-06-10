// --- DATOS INYECTADOS POR WORDPRESS (wp_localize_script) ---
// El shortcode expone window.WP_STICKER_DATA con isAdmin y las URLs del tema.
// Fallbacks para poder probar el componente fuera de WP.

interface WpStickerData {
  isAdmin?: boolean;
  assetsUrl?: string;
  configUrl?: string;
  saveUrl?: string;
}

declare global {
  interface Window {
    WP_STICKER_DATA?: WpStickerData;
  }
}

const WP: WpStickerData = (typeof window !== 'undefined' && window.WP_STICKER_DATA) || {};

export const ASSETS_URL = WP.assetsUrl || './assets'; // .../tema/assets
export const CONFIG_URL = WP.configUrl || `${ASSETS_URL}/datos_config.json`;
export const SAVE_URL = WP.saveUrl || `${ASSETS_URL}/guardar_datos.php`;
// Solo un admin real de WP puede ver/editar el modo Admin.
export const CAN_BE_ADMIN = !!WP.isAdmin;

// Número de WhatsApp del negocio (a futuro debería venir de la config).
export const WHATSAPP_PHONE = '542235331311';
