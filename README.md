# Calculadora de Stickers - Muy Únicos

Calculadora interactiva de stickers para WordPress construida con React, TypeScript, TailwindCSS y esbuild.

## Características

- **Cotizador en tiempo real**: Calcula precios basándose en material, forma, tamaño, cantidad y opciones de entrega/diseño
- **Motor de precios data-driven**: Toda la lógica de pricing está separada en funciones puras en `src/core/priceEngine.ts`
- **Integración con WordPress**: Se carga mediante shortcode en temas GeneratePress
- **Panel de administración**: Permite editar configuración, materiales, catálogo de formas y galería
- **Códigos de pedido compartibles**: Genera URLs cortas y estables para compartir presupuestos
- **Galería de ejemplos**: Muestra fotos con pricing marketinero (precio por unidad a diferentes cantidades)
- **Responsive**: Diseño adaptable para móvil y desktop

## Estructura del Proyecto

```
calculadora/
├── assets/
│   ├── datos_config.json      # Configuración principal (cargada desde servidor)
│   ├── guardar_datos.php      # Endpoint para guardar configuración (admin)
│   ├── css/                   # CSS compilado
│   ├── js/                    # JS compilado
│   └── galeria/               # Imágenes de ejemplo
├── src/
│   ├── core/                  # Lógica de negocio (funciones puras)
│   │   ├── a4Layout.ts        # Cálculo de layout A4 para rectangulares
│   │   ├── orderCodec.ts      # Codificación/decodificación de pedidos
│   │   ├── options.ts         # Opciones por defecto de entrega/diseño
│   │   ├── priceEngine.ts     # Motor de precios
│   │   ├── whatsapp.ts        # Generación de mensajes de WhatsApp
│   │   └── wp.ts             # Configuración de WordPress
│   ├── components/            # Componentes UI React
│   │   ├── ImageLightbox.tsx
│   │   ├── InfoExtraEditor.tsx
│   │   ├── MiniGallery.tsx
│   │   ├── MobileSummaryBar.tsx
│   │   ├── OptionInfoPanel.tsx
│   │   ├── PriceTable.tsx
│   │   └── StepSection.tsx
│   ├── hooks/                 # Custom hooks React
│   │   └── useConfig.ts       # Hook para cargar/guardar configuración
│   ├── types/                 # Definiciones TypeScript
│   │   └── index.ts
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

### 2. Usar el Shortcode

En cualquier página o post de WordPress:

```
[mu_sticker_calculator]
```

### 3. Archivo de Configuración

El archivo `assets/datos_config.json` contiene toda la configuración editable desde el panel de administración:
- `config`: Parámetros de pricing (salario, márgenes, tiempos)
- `materials`: Catálogo de materiales con costos y tiempos
- `shapesCatalog`: Catálogo de formas y tamaños
- `gallery`: Fotos de ejemplo con códigos de pedido
- `deliveryOptions`: Opciones de formato de entrega
- `designOptions`: Opciones de tipo de diseño

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
- `deliveryOptions`: Opciones de entrega
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
- **Guardado**: Debounced POST a `guardar_datos.php` (solo admin)
- **Fallbacks**: Completa opciones faltantes con defaults para backward compatibility

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

## Licencia

Proyecto privado para Muy Únicos.
