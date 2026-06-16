# Carpeta `plugin/`

Esta carpeta contiene archivos obsoletos que no están en uso actualmente en la implementación.

## Archivos en esta carpeta:

- `integration.css` - CSS antiguo (no se usa, el CSS está en el plugin PHP)
- `woocommerce-hider.css` - CSS antiguo para ocultar elementos (no se usa)
- `integration.js` - JavaScript antiguo (reemplazado por cart-integration.js)
- `IMPLEMENTACION_SIMPLIFICADA.md` - Documentación de enfoque simplificado no utilizado
- `WOOCOMMERCE_INTEGRATION.md` - Documentación antigua de enfoque diferente
- `WOOCOMMERCE_REALTIME_INTEGRATION.md` - Documentación antigua de enfoque en tiempo real
- `plugin-calculadora-ajax-integration.php` - Versión antigua del plugin (reemplazado por plugin-calculadora-cart-integration.php)
- `plugin-calculadora-cotizador-customizer.php` - Plugin simplificado no utilizado

## Implementación actual

La implementación actual está en la carpeta `woocommerce-plugin/`:
- `plugin-calculadora-cart-integration.php` - Plugin activo para integración con WooCommerce
- `cart-integration.js` - JavaScript para agregar al carrito
- `IMPLEMENTACION_CARRITO.md` - Documentación actual de la implementación

## Nota

Estos archivos se mantienen por historial/backup, pero no son necesarios para la implementación actual.
Pueden eliminarse si no se necesitan.