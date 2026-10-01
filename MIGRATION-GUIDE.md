# MUY ÚNICOS — ARCHITECTURE GUIDE

Monolithic functions.php DEPRECATED. Toda la lógica vive en inc/, css/ y js/.

⚠️ IA / LLM DIRECTIVE: Leer este documento antes de sugerir cambios de arquitectura.
Compliance estricto con "Pragmatic Modularity", "Pull Request Workflow" y "HPOS" es obligatorio.

════════════════════════════════════════════════════════════════
1. REGLAS CORE
════════════════════════════════════════════════════════════════

MODULARIDAD PRAGMÁTICA ("Goldilocks")
- Ajustes pequeños de UI < 50 líneas → agrupar en global-ui.css / global-ui.js
- Funcionalidades complejas o aisladas → archivo propio, carga condicional

CARGA CONDICIONAL ESTRICTA
- Nunca cargar assets globalmente si no aplican a header/footer/UI transversal.
- Usar is_shop(), is_checkout(), is_cart(), is_user_logged_in(), is_product(), etc.
- NUNCA wp_add_inline_style() / wp_add_inline_script() — todo CSS/JS en archivos cacheables.
  · EXCEPCIÓN login: wp_add_inline_style() dentro de login_enqueue_scripts está permitido
    solo para propiedades dinámicas PHP.
  · EXCEPCIÓN emails: style="" inline es obligatorio en fragmentos HTML de email.

FLUJO DE TRABAJO Y DESPLIEGUE
- Rama semántica obligatoria: perf/, refactor/, fix/, feat/
- No hay entorno de Staging. Las pruebas se realizan en Producción, por lo que todo código
  debe estar encapsulado (if !function_exists), ser defensivo y estar exhaustivamente revisado.
- Despliegue MANUAL vía FTP/Administrador de archivos a /generatepress-child/.
- Backups automáticos diarios de Hostinger actúan como red de seguridad principal.
- Actualizar SIEMPRE este archivo en el PR o antes del despliegue.

════════════════════════════════════════════════════════════════
2. INFRAESTRUCTURA, SERVIDOR Y OPERACIONES
════════════════════════════════════════════════════════════════

Hosting: Hostinger Plan Business (Espacio: 200GB | RAM: 3072 MB | Núcleos: 2 | PHP Workers: 60)
Stack: PHP 8.5.4 | MySQL 11.8.3-MariaDB-log | LiteSpeed Cache 7.9
Tema: GeneratePress 3.6.1 + GeneratePress Child

Dominio y Seguridad:
- Dominio principal (muyunicos.com) en DonWeb.
- Redirección automática de muyunicos.com.ar a muyunicos.com.
- CDN de Hostinger por subdominio, con nivel de seguridad alto y bloqueo de tráfico
  por país en el edge (SC, CN, IN, SG bloqueados) para mitigar el abuso de recursos.
- TLS 1.3.

Caché y CDN (LiteSpeed + CDN de Hostinger):
- Config de la calculadora (assets/datos_config.json) se sirve vía assets/datos_config_etag.php
  (ETag = md5 del archivo, Cache-Control: public, max-age=60, responde 304 si el If-None-Match coincide).
  El endpoint SOLO se usa si el functions.php del tema hijo inyecta
  'configUrl' => .../assets/datos_config_etag.php. Si inyecta el .json, el ETag no se usa.
  El admin guarda vía guardar_datos.php sobre el mismo .json, así que el ciclo guardar→leer es coherente.
- LiteSpeed Cache utiliza el Preajuste Avanzado (Guest Mode ON, sin combinar CSS/JS para proteger modularidad).
- El Retraso de JS (JS Delay) se activa manualmente en la configuración de página.
- La CDN de Hostinger es la única CDN activa. El proveedor anterior (Cloudflare) fue retirado.
- La purga de caché NO es automática: hay que purgarla a mano en LiteSpeed y en la CDN de Hostinger.
- La CDN no almacena el HTML en caché. El HTML cacheado por subdominio lo maneja estrictamente LiteSpeed.
- ⚠️ No existe la cabecera `cf-cache-status`: toda verificación de caché se hace desde la
  pestaña Network del navegador (status 200 vs 304), nunca desde headers de CDN.

Object Cache (LiteSpeed):
- Caché de objetos: ON (Memcached, prueba de conexión exitosa).
- Extensión: Memcached (Redis también disponible y activado).
- Configuración: Método Memcached | Host ::1 | Puerto 11211.
- TTL por defecto del objeto: 360 segundos.
- Conexión persistente: ON.
- Caché WP-Admin: ON.
- Grupos globales: users, userlogins, useremail, userslugs, usermeta, user_meta,
  site-transient, site-options, site-lookup, site-details, blog-lookup, blog-details,
  blog-id-cache, rss, global-posts, global-cache-test.
- Grupos NO cacheables: comment, counts, plugins, wc_session_id.
- Implicación: wp_using_ext_object_cache() = true → mu_ajax_rate_limit_check()
  usa la capa en memoria (Memcached) como primaria, sin escrituras DB directas.

Cronjobs:
- DISABLE_WP_CRON está activo.
- Dependencia exclusiva del System Cron de Hostinger. 
  Las tareas pesadas (reindexado, transient clears) se ejecutan a nivel servidor para 
  evitar penalizar el rendimiento del frontend.

════════════════════════════════════════════════════════════════
3. CONFIGURACIÓN COMERCIAL Y LOGÍSTICA
════════════════════════════════════════════════════════════════

Configuración Multi-País (17 Zonas Activas):
- Base: Argentina (ARS). Geoposicionamiento activo y precios dinámicos según país.
- Precios sin impuestos incluidos (impuesto calculado por dirección de envío).

Modelo Híbrido:
- Digitales (Global): Etiquetas escolares, PDFs. Sin costo de envío, entrega instantánea.
- Físicos (Solo AR): Stickers, outlet, gaming Wii. 
  · Logística: Entregas coordinadas de forma directa o retiros locales en Mar del Plata.
  · Control de Checkout: Si un producto físico está en el carrito y el cliente cambia 
    a un país extranjero, se debe bloquear la compra con el aviso: 
    "Este artículo no está disponible en tu ubicación actual".

Pagos, Analítica y Correos:
- Pasarelas: Mercado Pago (principal LATAM) y PayPal. (Tarifas dinámicas por pasarela).
- Correos Transaccionales: WP Mail SMTP 4.9.0. (Sin plataformas de automatización externas).
- Analítica: Google Analytics y Meta Pixel activos.

════════════════════════════════════════════════════════════════
4. SYSTEM MAP — ÁRBOL DE DIRECTORIOS
════════════════════════════════════════════════════════════════

muyunicos/ (generatepress-child)
│
├── functions.php           # Enqueue central (mu_enqueue_assets) + mu_load_module()
├── style.css               # Variables CSS globales (:root), reset, child theme header
│
├── inc/                    # Módulos PHP — lógica de negocio y hooks
│   ├── icons.php           # [PRIMERO] mu_get_icon() — repositorio SVG
│   ├── compat-litespeed.php # [SEGUNDO] Compatibilidad LiteSpeed Cache.
│   │                        # 1. Excluye scripts del JS Delay (ej. gla-gtag-events.js).
│   │                        # 2. INCLUYE: mu_litespeed_vary_by_subdomain() para forzar
│   │                        # separación de caché HTML mediante $_SERVER['HTTP_HOST'].
│   │                        # Esto evita Cache Collisions (contaminación cruzada de
│   │                        # errores 404 de productos físicos en otros países) y
│   │                        # protege las etiquetas SEO Hreflang específicas de cada país.
│   ├── geo.php             # Multi-país: detección, modal sugerencia, prefijo idioma.
│   ├── seo-hreflang.php    # SEO Multi-país: hreflang tags, meta descripciones localizadas.
│   ├── digital-restriction.php  # Restricción productos físicos por subdominio e índices.
│   │                            # (Aquí se inyectan las validaciones de checkout físico/país).
│   ├── auth-modal.php      # Modal Login/Registro + endpoints wc_ajax_mu_*
│   ├── login.php           # Personalización wp-login.php
│   ├── checkout.php        # Checkout Híbrido + Login Gate
│   ├── cart.php            # Multi-item add, buffers BACS
│   ├── flexible-price.php  # Precio Flexible: mapa O(1), validación, AJAX handler.
│   ├── hero-banners.php    # Hero Banners Manager (UI Admin y render).
│   ├── ui.php              # Header icons, Cart badge, WhatsApp, shortcodes, bestsellers.
│   ├── orders-files.php    # Gestor de archivos de pedido: Admin + Email + Mi Cuenta
│   ├── orders-workflow.php # Estado 'wc-production', emails inteligentes, Admin UI
│   ├── downloads-bonus.php # Bonus & Guías: inyección tabla descargas + emails.
│   ├── navigation-chips.php # Navigation Chips: breadcrumb, índice compacto, chips.
│   ├── products-core.php   # Core: constantes, hooks carrito/orden
│   ├── addon-nombre.php    # Addon Nombre
│   └── addon-etiquetas.php # Addon Etiquetas
│
├── templates/              # Plantillas PHP standalone
│   └── coming-soon.php     # CSS inline, logo hardcodeado, bypass de hooks pesados WP.
│
├── css/                    # CSS modular
│   ├── components/         # global-ui.css, header.css, footer.css, modal-auth.css...
│   ├── admin*.css          # Estilos backend
│   └── [secciones].css     # home, shop, product, cart, checkout, testimonials...
│
└── js/                     # JS modular
    ├── global-ui.js        # initCarousels()
    ├── [módulos].js        # hero, auth, geo, shop, product, checkout, admin...

════════════════════════════════════════════════════════════════
5. SISTEMA DE DISEÑO (API EXCLUSIVA)
════════════════════════════════════════════════════════════════

⚠️ NO inventar variables nuevas. Solo las definidas en :root de style.css.

Categoría    | Variables
-------------|--------------------------------------------------------------------------
Colores      | --primario (#2B9FCF)  --secundario (#FFD77A)  --texto  --blanco  --fondo
Spacing      | --mu-space-xs (5px)  --mu-space-sm (10px)  --mu-space-md (20px)  --mu-space-lg (40px)
Radius       | --mu-radius-sm (6px)  --mu-radius (12px)  --mu-radius-md  --mu-radius-full
Tipografía   | --mu-font-display (Fredoka One)  --mu-font-base (Inter)

ICONOS SVG
echo mu_get_icon('name'); // NUNCA inline SVG directo (excepto en templates standalone)

════════════════════════════════════════════════════════════════
6. CONVENCIONES DE CÓDIGO
════════════════════════════════════════════════════════════════

BASE DE DATOS Y HPOS (High-Performance Order Storage)
- WooCommerce tiene activo HPOS (OrdersTableDataStore) por defecto.
- PROHIBIDO interactuar con la tabla `wp_posts` o `wp_postmeta` para leer/guardar pedidos.
- Utilizar estrictamente el CRUD de WooCommerce: $order->get_meta(), $order->update_meta_data(), etc.

PHP
- Siempre: if ( ! function_exists( 'mu_fn' ) ) { ... }
- WP Cron: wp_schedule_single_event() delega al System Cron nativo de Hostinger.
- DB Queries: NUNCA 'limit' => -1 en frontend. Siempre limitar + transient.
- Transients: clave mu_[contexto]_{id}. Invalidar en el hook de cambio de estado.

JavaScript
- IIFE + 'use strict' + DOMContentLoaded. Cero jQuery salvo obligación WC legacy.
- Datos PHP→JS: wp_localize_script().
- Animaciones de botón: NUNCA style.transform inline. Usar clases CSS delegadas a GPU.

CSS
- Prefijo + BEM: .mu-[componente]__elem--[mod]
- Sobrescrituras GP: /* override GP: [motivo] */

════════════════════════════════════════════════════════════════
7. DEUDA TÉCNICA
════════════════════════════════════════════════════════════════

- [ ] digital-restriction.php / cart.php: Implementar validación `woocommerce_check_cart_items` para bloquear checkout de productos físicos si el país cambia. ("Este artículo no está disponible en tu ubicación actual").
- [ ] checkout.js: libphonenumber-js desde CDN unpkg.com — evaluar auto-host local.
- [ ] orders-workflow.php: bulk actions Legacy → migrar definitivamente a hooks de HPOS (woocommerce_order_list_table_bulk_actions).
- [ ] digital-restriction.php: N+1 en display_digital_price_in_catalog — evaluar get_post_meta() directo.
- [ ] coming-soon.css: archivo deprecado pero presente. Eliminar tras confirmar inactividad.