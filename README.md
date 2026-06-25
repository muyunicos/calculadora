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
├── plugin/
│   └── plugin-calculadora-admin-integration.php  # Integración Media Library WordPress
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
│   │   ├── useAdminState.ts          # Estado del panel admin
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

### 1. Configuración del Tema

En el archivo `functions.php` del tema hijo:

```php
function mu_sticker_calculator_enqueue() {
    // Registrar el script
    wp_register_script(
        'mu-sticker-calculator',
        get_stylesheet_directory_uri() . '/assets/js/calculadora_stickers.js',
        [],
        '0.1.0',
        true
    );

    // Registrar el estilo
    wp_register_style(
        'mu-sticker-calculator-style',
        get_stylesheet_directory_uri() . '/assets/css/calculadora_stickers.css',
        [],
        '0.1.0'
    );

    // Inyectar datos de configuración
    wp_localize_script('mu-sticker-calculator', 'WP_STICKER_DATA', [
        'isAdmin' => current_user_can('manage_options'),
        'assetsUrl' => get_stylesheet_directory_uri() . '/assets',
        'configUrl' => get_stylesheet_directory_uri() . '/assets/datos_config.json',
        'saveUrl' => get_stylesheet_directory_uri() . '/assets/guardar_datos.php',
    ]);
}
add_action('wp_enqueue_scripts', 'mu_sticker_calculator_enqueue');

// Shortcode para renderizar la calculadora
function mu_sticker_calculator_shortcode() {
    wp_enqueue_script('mu-sticker-calculator');
    wp_enqueue_style('mu-sticker-calculator-style');
    return '<div id="mu-sticker-calculator-root"></div>';
}
add_shortcode('mu_sticker_calculator', 'mu_sticker_calculator_shortcode');
```

### 2. Plugin de Integración Media Library

Para habilitar la selección de imágenes mediante el modal nativo de WordPress:

```bash
# Copiar el plugin al directorio de plugins de WordPress
cp plugin/plugin-calculadora-admin-integration.php /path/to/wordpress/wp-content/plugins/

# Activar el plugin desde el panel de administración de WordPress
```

**Funciones del plugin:**
- Carga los scripts de WordPress Media Library (`wp_enqueue_media`)
- Disponible en el admin de WordPress y frontend para usuarios con permisos de admin
- Incluye estilos necesarios para que el modal se visualice correctamente

### 3. Usar el Shortcode

En cualquier página o post de WordPress:

```
[mu_sticker_calculator]
```

### 4. Archivo de Configuración

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
**Causas:**
- Plugin `plugin-calculadora-admin-integration.php` no activado
- Usuario no tiene permisos de admin
- `wp_enqueue_media()` no cargado correctamente

**Solución:**
- Activar el plugin en WordPress
- Verificar permisos de usuario (`manage_options`)
- Inspeccionar consola para errores de JavaScript

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
6. `plugin/plugin-calculadora-admin-integration.php` - Plugin para Media Library (v1.1)

## Licencia

Proyecto privado para Muy Únicos.