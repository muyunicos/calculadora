# Implementación Calculadora WooCommerce - Integración Carrito

## Enfoque
El botón "COMPRAR" agrega el producto al carrito de WooCommerce con:
- Precio calculado dinámicamente
- Descripción personalizada (material, formato, medida, cantidad)
- Código de pedido para edición posterior
- URL del cotizador para "Editar" en el carrito

## Cambios Recientes (v2.0)

### Fix: Error 400 Bad Request
- Cambiado del endpoint nativo `woocommerce_ajax_add_to_cart` a endpoint personalizado `calculator_add_to_cart`
- Agregado nonce para seguridad
- Datos agregados directamente en el AJAX vía `WC()->cart->add_to_cart()`
- Precio extraído de `calculator_data['price']` en lugar de `calculator_price`

## Cambios en el Motor TypeScript

### OrderSummary.tsx
- **Botón "COMPRAR"**: Llama a `window.addToCartFromCalculator(datos)`
- Pasa todos los datos del pedido calculado

### MobileSummaryBar.tsx
- **Botón "COMPRAR"**: Mismo comportamiento que OrderSummary
- Props agregadas: `orderCode`, `formatoLabel`, `material`, `sheets`, `quantity`

### App.tsx
- Prop `formatoLabel` pasada a OrderSummary
- Prop `orderCode` pasada a MobileSummaryBar

## Archivos WordPress

### 1. plugin-calculadora-cart-integration.php
**Funciones:**
- Carga `cart-integration.js` en páginas de producto y carrito
- **Endpoint AJAX personalizado** `calculator_add_to_cart` para agregar productos
- Agrega datos de la calculadora directamente al carrito
- Modifica el precio del item en el carrito desde `calculator_data['price']`
- Agrega descripción personalizada al item
- Agrega botón "Editar" en el carrito que redirige al cotizador
- **CSS para ocultar elementos WooCommerce** en la página del producto 27859:
  - Galería de imágenes
  - Resumen del producto (precio, botón nativo)
  - Pestañas de WooCommerce
  - Título "Descripción"
  - Asegura que la calculadora ocupe todo el espacio

**Instalación:**
```bash
# Subir a:
/wp-content/plugins/calculadora-cart-integration/plugin-calculadora-cart-integration.php
/wp-content/plugins/calculadora-cart-integration/cart-integration.js
```

**Activar desde:** Escritorio → Plugins → Calculadora Cart Integration → Activar

### 2. cart-integration.js
**Función:**
- `window.addToCartFromCalculator(datos)` - Función global que llama la calculadora
- Construye descripción personalizada
- **Usa endpoint AJAX personalizado** `calculator_add_to_cart` con nonce
- Agrega al carrito via `WC()->cart->add_to_cart()` en el servidor
- Redirige al carrito después de agregar
- Muestra mensajes de éxito/error

## Flujo de Trabajo

### Cliente:
1. Entra al producto "Cotizador" (ID 27859)
2. Ve solo la calculadora (elementos WooCommerce ocultos)
3. Usa la calculadora para configurar su pedido
4. Click en "COMPRAR"
5. **Loading indicator** aparece
6. **Producto agregado al carrito** con:
   - Precio calculado
   - Descripción: "Material: XXX | Formato: XXX | Medida: XXX | Cantidad: ~XXX | Planchas: XXX"
   - URL del cotizador guardada
7. **Redirección al carrito** automáticamente
8. En el carrito puede:
   - Ver descripción personalizada
   - Botón "Editar" para volver al cotizador con su configuración
   - Continuar con el checkout

### Admin:
1. En el pedido del admin:
   - Precio calculado resaltado
   - Link "📋 Ver en Calculadora" para ver la configuración original

## Archivos Compilados (✅ Listos)

- `assets/js/calculadora_stickers.js` (327.1kb - minificado)
- `assets/css/calculadora_stickers.css`

## Archivos para Subir al Servidor

### WordPress Plugin (necesario):
```
/wp-content/plugins/calculadora-cart-integration/
├── plugin-calculadora-cart-integration.php
└── cart-integration.js
```

### Calculadora compilada:
```
/wp-content/themes/generatepress-child/assets/
├── js/calculadora_stickers.js (327.1kb)
└── css/calculadora_stickers.css
```

## Cambios Recientes (v2.1)

### Botón WhatsApp actualizado:
- Número de WhatsApp cambiado a `542235331311` (número del tema)
- Imagen del botón "Consultar" cambiada a imagen del tema: `https://muyunicos.com/wp-content/uploads/2025/10/whatsapp.webp`
- SVG de MessageCircle eliminado del componente OrderSummary

### Calculadora compilada:
```
/wp-content/themes/generatepress-child/assets/
├── js/calculadora_stickers.js
└── css/calculadora_stickers.css
```

## Pasos de Instalación

1. **Subir calculadora compilada**:
   ```bash
   assets/js/calculadora_stickers.js → /wp-content/themes/generatepress-child/assets/js/
   assets/css/calculadora_stickers.css → /wp-content/themes/generatepress-child/assets/css/
   ```

2. **Subir plugin WordPress**:
   ```bash
   plugin-calculadora-cart-integration.php → /wp-content/plugins/calculadora-cart-integration/
   cart-integration.js → /wp-content/plugins/calculadora-cart-integration/
   ```

3. **Activar el plugin**:
   - Escritorio → Plugins
   - "Calculadora Cart Integration" → Activar

4. **Verificar**:
   - Ir a `https://muyunicos.com/cotizador/`
   - Confirmar que solo se ve la calculadora (sin galería ni botones WooCommerce)
   - Completar un pedido en la calculadora
   - Click en "COMPRAR"
   - Verificar que:
     - Aparece indicador de carga
     - Se agrega al carrito
     - Redirige al carrito
     - El precio es correcto
     - La descripción es correcta
     - El botón "Editar" aparece

## Solución de Problemas

### Error: `orderCode is not defined`
- ✅ **CORREGIDO**: Ya se agregó la prop `orderCode` a MobileSummaryBar y OrderSummary
- Asegúrate de haber subido el archivo JS compilado más reciente

### No se ocultan los elementos:
- Verifica que el plugin esté activo
- Limpia caché del navegador y del servidor
- Revisa que el ID del producto sea correcto (27859)

### El producto no se agrega al carrito (Error 400 Bad Request):
- Abre consola del navegador (F12)
- Revisa el error en el response del AJAX
- Verifica que el plugin esté activo
- Verifica que el nonce esté generado correctamente
- Limpia caché del navegador
- Desactiva temporalmente otros plugins de caché/optimización
- **Nota**: Este error ocurría con el endpoint nativo de WooCommerce. Se solucionó usando un endpoint AJAX personalizado con nonce.

### El precio en el carrito es incorrecto:
- Revisa los metadatos en el carrito (WC → Session)
- Verifica que `calculator_price` se esté guardando correctamente
- Revisa el hook `woocommerce_before_calculate_totals`

### El botón "Editar" no aparece:
- Verifica que `calculator_url` se esté guardando
- Revisa el hook `woocommerce_after_cart_item_name`

## Ventajas

1. **Experiencia nativa WooCommerce**: Usa el carrito y checkout existentes
2. **Precio dinámico**: El precio se calcula en la calculadora y se mantiene en todo el flujo
3. **Descripción personalizada**: El cliente ve exactamente lo que compró
4. **Edición fácil**: El cliente puede modificar su pedido desde el carrito
5. **Metadatos para admin**: El admin puede ver la configuración original

Esta es la implementación completa para integrar la calculadora con WooCommerce.