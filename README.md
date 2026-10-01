# Calculadora de Stickers - Muy Únicos

Calculadora interactiva de stickers para WordPress construida con React, TypeScript, TailwindCSS y esbuild.

## Características

- **Cotizador en tiempo real**: Calcula precios basándose en material, forma, tamaño, cantidad y opciones de corte/diseño
- **Motor de precios data-driven**: Toda la lógica de pricing está separada en funciones puras en `src/core/priceEngine.ts`
- **Integración con WordPress**: Se carga mediante shortcode en temas GeneratePress
- **Panel de administración**: Permite editar configuración, materiales, catálogo de formas y galería
- **Códigos de pedido compartibles**: Genera URLs cortas y estables para compartir presupuestos
- **Galería de ejemplos**: Muestra fotos con pricing marketinero (precio por unidad a diferentes cantidades)
- **Validación robusta**: Manejo de errores con valores por defecto para evitar rupturas
- **Integración con Media Library de WordPress**: Modal nativo para selección/subida de imágenes
- **Responsive**: Diseño adaptable para móvil y desktop

## Estructura del Proyecto

```
calculadora/
├── assets/
│   ├── datos_config.json      # Configuración principal (cargada desde servidor)
│   ├── guardar_datos.php      # Endpoint para guardar configuración (admin)
│   ├── images/                # Imágenes del proyecto (default.webp, etc.)
│   ├── css/                   # CSS compilado
│   ├── js/                    # JS compilado
│   └── galeria/               # Imágenes de ejemplo
├── src/
│   ├── core/                  # Lógica de negocio (funciones puras)
│   │   ├── a4Layout.ts        # Cálculo de layout A4 para rectangulares
│   │   ├── orderCodec.ts      # Codificación/decodificación de pedidos
│   │   ├── options.ts         # Opciones por defecto de corte/diseño
│   │   ├── priceEngine.ts     # Motor de precios
│   │   ├── validation.ts     # Validación y normalización de datos
│   │   ├── whatsapp.ts        # Generación de mensajes de WhatsApp
│   │   └── wp.ts             # Configuración de WordPress
│   ├── components/            # Componentes UI React
│   │   ├── AdminGalleryPanel.tsx       # Panel de administración galería
│   │   ├── AdminMaterialsPanel.tsx    # Panel de administración materiales
│   │   ├── AdminShapesPanel.tsx       # Panel de administración formas
│   │   ├── AdminDeliveryDesignPanel.tsx  # Panel de administración corte/diseño
│   │   ├── InfoExtraEditor.tsx        # Editor de info adicional (modal WordPress)
│   │   ├── OptionInfoPanel.tsx        # Panel de info para vista cliente
│   │   ├── ImageLightbox.tsx
│   │   ├── MiniGallery.tsx
│   │   └── ...
│   ├── hooks/                 # Custom hooks React
│   │   ├── useConfig.ts       # Hook para cargar/guardar configuración
│   │   ├── useCalculatorState.ts     # Estado del cotizador
│   │   └── useGalleryState.ts        # Estado de la galería
│   ├── types/                 # Definiciones TypeScript
│   │   └── index.ts
│   ├── utils/                 # Utilidades
│   │   ├── ui.ts              # Funciones UI (resolveImage, etc.)
│   │   └── validation.ts      # Utilidades de validación
│   ├── App.tsx                # Componente principal
│   ├── index.tsx              # Punto de entrada (montaje en WordPress)
│   └── styles.css             # Estilos personalizados con prefijo cl-
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## Instalación

```bash
# Instalar dependencias
npm install
```

## Scripts Disponibles

```bash
# Compilar JavaScript (producción)
npm run build:js

# Compilar JavaScript con watch (desarrollo)
npm run watch:js

# Compilar CSS (producción)
npm run build:css

# Compilar CSS con watch (desarrollo)
npm run watch:css

# Compilar todo (JS + CSS)
npm run build

# Verificar tipos TypeScript
npm run typecheck
```

## Integración con WordPress

### 1. Configuración del Shortcode

El código va en el **`functions.php` del tema hijo**, o en un plugin de snippets
(WPCode / Fragmentos de código). Este es el shortcode real en producción:

```php
/**
 * Shortcode de la Calculadora de Stickers.
 * Pegar en functions.php del tema hijo (o en un Code Snippet).
 *
 * Estructura esperada en el tema:
 *   /assets/js/calculadora_stickers.js     (bundle compilado)
 *   /assets/css/calculadora_stickers.css   (Tailwind compilado)
 *   /assets/guardar_datos.php              (recibe el POST del admin)
 *   /assets/datos_config.json              (datos: config, materials, shapesCatalog...)
 *   /assets/datos_config_etag.php          (endpoint con ETag; sirve el .json de arriba)
 *   /assets/2_1_1.png, 2_1_2.png, ...     (previews de formas)
 */
function mu_sticker_calculator_shortcode() {
    $assets_url = get_stylesheet_directory_uri() . '/assets';

    // CSS (Tailwind compilado). filemtime como versión: al subir el archivo,
    // cambia el ?ver= y el navegador baja el nuevo sin purgar caché.
    $css_path = get_stylesheet_directory() . '/assets/css/calculadora_stickers.css';
    $css_ver  = file_exists( $css_path ) ? filemtime( $css_path ) : '1.0';

    wp_enqueue_style(
        'mu-sticker-calculator-css',
        $assets_url . '/css/calculadora_stickers.css',
        array(),
        $css_ver
    );

    // JS (React + lucide empaquetados en el bundle).
    $js_path = get_stylesheet_directory() . '/assets/js/calculadora_stickers.js';
    $js_ver  = file_exists( $js_path ) ? filemtime( $js_path ) : '1.0';

    wp_enqueue_script(
        'mu-sticker-calculator-js',
        $assets_url . '/js/calculadora_stickers.js',
        array(),
        $js_ver,
        true
    );

    $is_admin = current_user_can( 'manage_options' );

    // Datos para el bundle: admin real + URLs absolutas del tema.
    wp_localize_script( 'mu-sticker-calculator-js', 'WP_STICKER_DATA', array(
        'isAdmin'   => $is_admin,
        'assetsUrl' => $assets_url,
        // Endpoint con ETag: sirve datos_config.json con Cache-Control: max-age=60
        // y responde 304 si el If-None-Match coincide con el md5 actual.
        // OJO: este valor tiene prioridad sobre el fallback de src/core/wp.ts.
        // Si queda datos_config.json, el ETag no se usa nunca.
        'configUrl' => $assets_url . '/datos_config_etag.php',
        'saveUrl'   => $assets_url . '/guardar_datos.php',
    ) );

    // Media Library para el botón de galería del admin. Solo para admins:
    // son varios cientos de KB (wp-media, Backbone, underscore, jQuery UI).
    if ( $is_admin ) {
        wp_enqueue_media();
    }

    return '<div id="mu-sticker-calculator-root">Cargando cotizador pro...</div>';
}
add_shortcode( 'calculadora_stickers', 'mu_sticker_calculator_shortcode' );
```

> ⚠️ **Ojo con las rutas:** este código usa `get_stylesheet_directory_uri()`, que
> **solo funciona si vive en el tema hijo**. Si se mueve a un plugin, hay que cambiarlo
> por `get_theme_file_uri()`, porque los assets siguen en el tema.

### 2. Media Library en el panel de galería

El panel de galería (`AdminGalleryPanel`) y el editor de info extra (`InfoExtraEditor`)
usan `window.wp.media` para abrir el modal nativo de WordPress.

**No hace falta ningún plugin.** `wp_enqueue_media()` es una función del núcleo de
WordPress, y hay que llamarla en el shortcode:

```php
$is_admin = current_user_can( 'manage_options' );
if ( $is_admin ) {
    wp_enqueue_media();
}
```

Va después de los `wp_enqueue_*`. El condicional es obligatorio: `wp_enqueue_media()`
arrastra `wp-media`, Backbone, Underscore y jQuery UI (varios cientos de KB), y el botón
de galería solo existe para admins. Sin el `if`, los clientes los descargan de más.

> Nota histórica: antes esta sección describía un plugin
> (`plugin-calculadora-admin-integration.php`) que no está en el repo ni instalado en el
> servidor. **No hace falta**: la función del núcleo resuelve lo mismo.

**Si no se llama**, el modal no abre y se cae al fallback: `AdminGalleryPanel` abre
`/wp-admin/media-upload.php` en una pestaña nueva, e `InfoExtraEditor` muestra un
`alert`.

### 3. Usar el Shortcode

En cualquier página o post de WordPress:

```
[calculadora_stickers]
```

> ⚠️ El nombre del shortcode es `calculadora_stickers` (no `mu_sticker_calculator`,
> que era como figuraba antes en esta documentación y nunca existió en producción).
> Cambiarlo implica actualizar también el contenido de la página donde está insertado.

### 4. Archivo de Configuración

> ⚠️ **Deploy**: además de `datos_config.json`, hay que subir `assets/datos_config_etag.php`
> al servidor. Sin ese archivo, la calculadora queda sin configuración y muestra la
> pantalla de error de `loadError`. El despliegue es manual por FTP / Administrador
> de archivos a `/generatepress-child/`.
> El orden exacto de subida y la verificación están en **[CHECKLIST-DEPLOY.md](CHECKLIST-DEPLOY.md)**.

El archivo `assets/datos_config.json` contiene toda la configuración editable desde el panel de administración:
- `config`: Parámetros de pricing (salario, márgenes, tiempos)
- `materials`: Catálogo de materiales con costos y tiempos
- `shapesCatalog`: Catálogo de formas y tamaños
- `gallery`: Fotos de ejemplo con códigos de pedido
- `deliveryOptions`: Opciones de formato de corte
- `designOptions`: Opciones de tipo de diseño

## Validación y Normalización de Datos

### Manejo Robusto de Errores

La aplicación implementa validación y normalización automática para evitar errores y rupturas:

**Esquemas de validación (Zod):**
- Campos de imagen en `gallery`, `materials`, `shapes`, `deliveryOptions`, `designOptions` son opcionales (los nombres técnicos de variables se mantienen por compatibilidad)
- Valida estructura de datos al cargar desde servidor
- Previene errores por campos faltantes o incorrectos

**Normalización automática:**
```typescript
// Solo se normaliza gallery (ejemplos visuales deben tener imagen)
const normalizedGallery = data.gallery?.map(item => ({
  ...item,
  image: item.image?.trim() ? item.image : DEFAULT_IMAGE
})) || [];
```

**Lógica de info adicional:**
- Materials, shapes, etc. pueden tener `image` y `description` vacíos
- `OptionInfoPanel` solo muestra info si hay `description` O `image`
- Si ambos están vacíos, no se muestra el icono ni panel de info

### URL de Imagen por Defecto

```
https://muyunicos.com/wp-content/themes/generatepress-child/assets/images/default.webp
```

**Uso:**
- Gallery items (ejemplos visuales) siempre tienen imagen (default.webp si está vacía)
- Materials, shapes, etc. solo muestran imagen si el admin asigna una específica

## Integración con Galería de WordPress

### Modal Nativo de WordPress

La aplicación usa el modal nativo de WordPress Media Library para selección de imágenes:

**Patrones de implementación:**
```javascript
// Verificar disponibilidad
if (window.wp && window.wp.media) {
  // Reutilizar frame si existe
  if (wp.media.frames.calculadoraGalleryFrame) {
    wp.media.frames.calculadoraGalleryFrame.open();
    return;
  }

  // Crear nuevo frame
  wp.media.frames.calculadoraGalleryFrame = wp.media({
    title: 'Seleccionar imagen',
    button: { text: 'Usar esta imagen' },
    multiple: false,
    library: { type: 'image' }
  });

  // Manejar selección
  wp.media.frames.calculadoraGalleryFrame.on('select', function() {
    const attachment = wp.media.frames.calculadoraGalleryFrame.state().get('selection').first().toJSON();
    // Usar attachment.url
  });

  wp.media.frames.calculadoraGalleryFrame.open();
}
```

**Componentes con integración:**
- `AdminGalleryPanel.tsx` - Galería de ejemplos
- `InfoExtraEditor.tsx` - Materiales, formas, corte/diseño

**Características:**
- Interfaz nativa familiar para usuarios de WordPress
- Búsqueda y filtrado de imágenes
- Subida de nuevas imágenes directamente desde el modal
- Vista previa de imágenes en biblioteca
- Selección de diferentes tamaños de imagen
- Modal integrado (sin abrir ventanas adicionales)

## Desarrollo

### Compilar en modo watch

```bash
# Terminal 1: Watch JavaScript
npm run watch:js

# Terminal 2: Watch CSS
npm run watch:css
```

### Verificar tipos TypeScript

```bash
npm run typecheck
```

## Arquitectura

### Motor de Precios (`src/core/priceEngine.ts`)

El motor de precios es una **función pura** que recibe:
- `order`: Selecciones del usuario
- `config`: Parámetros de pricing
- `materials`: Catálogo de materiales
- `shapesCatalog`: Catálogo de formas
- `deliveryOptions`: Opciones de formato de corte (nombre técnico por compatibilidad)
- `designOptions`: Opciones de diseño

Devuelve un `PriceResult` con todos los cálculos detallados. Esto permite:
- Reutilizar la lógica en diferentes contextos (tabla de precios, galería, recomendador)
- Testear fácilmente (sin dependencias de React)
- Calcular precios para diferentes cantidades sin efectos secundarios

### Codec de Pedidos (`src/core/orderCodec.ts`)

Sistema de codificación de pedidos en dos formatos:
1. **Base64**: Autocontenido, compatible con URLs antiguas
2. **Código corto v1**: Formato legible y estable (ej: `v1.m11.s201.q25.f2.d0`)

El código corto usa los `code` numéricos de materiales y tamaños, por lo que es estable frente a reordenamientos del catálogo.

### Hook de Configuración (`src/hooks/useConfig.ts`)

Maneja:
- **Carga**: Fetch de `datos_config.json` desde el servidor
- **Validación**: Usa Zod para validar estructura de datos
- **Normalización**: Aplica valores por defecto donde sea necesario
- **Guardado**: Debounced POST a `guardar_datos.php` (solo admin)

### Validación (`src/core/validation.ts`)

**Esquemas Zod:**
- `ConfigSchema`: Parámetros de configuración
- `MaterialSchema`: Materiales del catálogo
- `ShapeItemSchema`: Formas y tamaños
- `GalleryItemSchema`: Items de galería de ejemplos
- `DeliveryOptionSchema`: Opciones de formato de corte
- `DesignOptionSchema`: Opciones de diseño

**Funciones:**
- `validateAppData()`: Valida estructura completa de datos
- `normalizeAppData()`: Aplica valores por defecto (solo a gallery)

## Estilos

El proyecto usa TailwindCSS con:
- **Prefijo**: `#mu-sticker-calculator-root` para evitar conflictos con el tema
- **Preflight desactivado**: No resetea estilos globales de WordPress
- **Clases personalizadas**: Prefijo `cl-` para componentes del widget

## Seguridad

### Archivo `guardar_datos.php`

Este archivo debe:
1. Verificar que el request viene de un admin autenticado de WordPress
2. Usar nonce de WordPress para protección CSRF
3. Sanitizar los datos antes de guardar
4. Validar la estructura de los datos

Ejemplo de implementación segura:

```php
<?php
// Cargar WordPress
require_once('../../../wp-load.php');

// Verificar nonce y permisos
if (!current_user_can('manage_options') || !check_ajax_referer('mu_sticker_calculator_nonce', 'nonce', false)) {
    wp_send_json_error('Unauthorized', 403);
    exit;
}

// Leer y sanitizar datos
$input = json_decode(file_get_contents('php://input'), true);
// ... validación y sanitización ...

// Guardar en datos_config.json
file_put_contents(__DIR__ . '/datos_config.json', json_encode($input, JSON_PRETTY_PRINT));

wp_send_json_success();
```

## Panel de Administración

### Acceso
- Solo disponible para usuarios con permisos `manage_options`
- Se activa mediante `window.WP_STICKER_DATA.isAdmin`

### Funcionalidades
- **Config**: Parámetros de pricing (salario, márgenes, tiempos)
- **Materiales**: Catálogo de materiales con costos, tiempos e info adicional
- **Formas**: Catálogo de formas y tamaños con cantidades por hoja
- **Galería**: Fotos de ejemplo con códigos de pedido
- **Formato de Corte y Diseño**: Opciones de formato de corte y tipo de diseño
- **Info adicional**: Editor para descripciones e imágenes (con modal WordPress)

### Info Adicional
- Materials, shapes, deliveryOptions (opciones de corte), designOptions pueden tener info adicional
- Info adicional incluye: `description` (texto) y `image` (URL)
- **Comportamiento:** Si NO hay description ni image → NO se muestra icono de info en vista cliente
- Si SÍ hay description O image → SÍ se muestra panel de info al tocar el icono
- El admin puede asignar imágenes usando el modal nativo de WordPress

## Solución de Problemas

### Validación fallida
**Error:** `Validación fallida: gallery.3.image: String must contain at least 1 character(s)`

**Solución:**
- El campo `image` ahora es opcional en el esquema de validación
- La normalización automática asigna `default.webp` a gallery items con imagen vacía
- La aplicación no se rompe por campos de imagen vacíos

### Modal de WordPress no se abre
**Síntoma:** el botón "Galería" abre `/wp-admin/media-upload.php` en una pestaña nueva.

**Causas:**
- El shortcode no llama a `wp_enqueue_media()` (la causa más común: ver sección 2)
- Usuario no tiene permisos de admin (`manage_options`)

**Solución:**
- Agregar `wp_enqueue_media()` dentro de `if ( $is_admin ) { ... }` en el shortcode
- Verificar permisos del usuario (`manage_options`)
- Inspeccionar la consola para errores de JavaScript

### Info adicional no se muestra
**Comportamiento esperado:**
- Si material/shape/etc. NO tiene `description` NI `image` → NO se muestra icono de info
- Si SÍ tiene `description` O `image` → SÍ se muestra icono y panel

**Verificación:**
- Revisar `datos_config.json` para confirmar que haya `description` o `image`
- `OptionInfoPanel` tiene lógica: `const hasInfo = !!option && (!!option.description || !!option.image)`

## Archivos Modificados (Mejoras Recientes)

1. `src/core/validation.ts` - Esquemas flexibles y normalización (solo gallery)
2. `src/hooks/useConfig.ts` - Integración de validación y normalización
3. `src/components/AdminGalleryPanel.tsx` - Botón galería con modal nativo
4. `src/components/InfoExtraEditor.tsx` - Botón galería + modal nativo (sin autocompletado)
5. `assets/datos_config.json` - Corrección de imagen vacía con URL completa

## Licencia

Proyecto privado para Muy Únicos.