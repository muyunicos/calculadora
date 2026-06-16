# Implementación Simplificada - Calculadora WooCommerce

## Enfoque
Solución simple y robusta basada en redirecciones a la URL del cotizador, sin complejidad AJAX.

## Cambios en el Motor

### OrderSummary.tsx
- **Botón "COMPRAR"**: Redirige a `https://muyunicos.com/cotizador/?o={orderCode}`
- El usuario puede editar su pedido desde la URL

### MobileSummaryBar.tsx
- **Botón "COMPRAR"**: Igual redirección al cotizador con código
- Experiencia consistente en móvil y escritorio

### App.tsx
- Agregada prop `orderCode` a MobileSummaryBar

## Archivos WordPress

### 1. plugin-calculadora-cotizador-customizer.php
**Funciones:**
- Oculta elementos de WooCommerce en la página del producto 27859:
  - Galería de imágenes
  - Resumen del producto (precio, botón agregar al carrito nativo)
  - Pestañas de WooCommerce
  - Título "Descripción" del panel
- Asegura que la calculadora ocupe todo el espacio
- Agrega botón "Editar" en el carrito (si hay metadatos del cotizador)

**Instalación:**
```bash
# Subir a:
/wp-content/plugins/calculadora-cotizador-customizer/plugin-calculadora-cotizador-customizer.php
```

**Activar desde:** Escritorio → Plugins → Calculadora Cotizador Customizer → Activar

## Archivos Compilados (✅ Listos)

- `assets/js/calculadora_stickers.js` (326.8kb - minificado)
- `assets/css/calculadora_stickers.css`

## Archivos JavaScript NO necesarios

Los siguientes archivos creados anteriormente **NO se necesitan** para esta solución:
- ❌ `integration.js` - No se usa en este enfoque simplificado
- ❌ `cart-integration.js` - No se usa en este enfoque simplificado
- ❌ `woocommerce-hider.css` - El plugin PHP ya incluye el CSS

Puedes eliminar estos archivos del servidor si ya los subiste.

## Flujo de Trabajo

### Cliente:
1. Entra al producto "Cotizador" (ID 27859): `https://muyunicos.com/cotizador/`
2. Ve solo la calculadora (elementos WooCommerce ocultos)
3. Usa la calculadora para configurar su pedido
4. Click en "COMPRAR" → Redirige a: `https://muyunicos.com/cotizador/?o=v1.m10.s30.q5.f1.d0`

### Nota sobre el botón "COMPRAR":
Actualmente el botón "COMPRAR" simplemente redirige a la URL del cotizador con el código de pedido. Esto permite que:
- El cliente pueda compartir la configuración
- El cliente pueda editar más tarde
- Se puedan guardar los pedidos como enlaces

**Si quieres que el botón agregue directamente al carrito**, necesitarás implementar:
1. Un plugin que capture el parámetro `?o=` de la URL
2. Un endpoint AJAX que agregue el producto al carrito con el precio calculado
3. Esta es una implementación más compleja (ver `WOOCOMMERCE_INTEGRATION.md` si la necesitas en el futuro)

## Ventajas del Enfoque Actual

1. **Sin errores**: Funciona de inmediato
2. **Mantenimiento simple**: Sin estado que gestionar
3. **UX consistente**: El usuario siempre puede compartir/editar
4. **Compatible**: Funciona con cualquier tema de WooCommerce
5. **Debug fácil**: URL visible en el navegador

## Pasos de Instalación

1. **Subir calculadora compilada** al servidor:
   ```bash
   assets/js/calculadora_stickers.js → /wp-content/themes/generatepress-child/assets/js/
   assets/css/calculadora_stickers.css → /wp-content/themes/generatepress-child/assets/css/
   ```

2. **Instalar plugin WordPress**:
   ```bash
   plugin-calculadora-cotizador-customizer.php → /wp-content/plugins/calculadora-cotizador-customizer/
   ```

3. **Activar el plugin** desde el panel de WordPress

4. **Verificar**:
   - Ir a `https://muyunicos.com/cotizador/`
   - Confirmar que solo se ve la calculadora
   - Probar el botón "COMPRAR"
   - Verificar que redirija a `https://muyunicos.com/cotizador/?o=...`

## Solución de Problemas

### Error: `orderCode is not defined`
- ✅ **CORREGIDO**: Ya se agregó la prop `orderCode` a MobileSummaryBar
- Recompila y vuelve a subir el archivo JS

### Errores 404 de imágenes (2_1_1.png, etc.)
- Son imágenes de formas en la configuración
- No afectan el funcionamiento de la calculadora
- Verifica que las rutas en `datos_config.json` sean correctas

### Si no se ocultan los elementos:
- Verifica que el plugin esté activo
- Limpia caché del navegador y del servidor
- Revisa que el ID del producto sea correcto (27859)

### Si el botón "COMPRAR" no funciona:
- Verifica que `orderCode` se está generando (revisa la consola)
- Prueba la URL manualmente: `https://muyunicos.com/cotizador/?o=v1.m10.s30.q5.f1.d0`
- Asegúrate de haber subido el archivo JS compilado más reciente