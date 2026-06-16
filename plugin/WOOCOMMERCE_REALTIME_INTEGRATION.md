# Integración en Tiempo Real - WordPress + WooCommerce + GeneratePress

## Stack
- WordPress (última versión)
- WooCommerce (última versión)  
- GeneratePress (última versión)

## Arquitectura de la Solución

La calculadora se incrusta vía shortcode en la descripción del producto y actualiza el precio de WooCommerce en tiempo real.

## Implementación

### Archivos Incluidos

He preparado 3 archivos listos para usar:

1. **plugin-calculadora-ajax-integration.php** - Plugin completo para WordPress
2. **integration.js** - JavaScript para la comunicación AJAX
3. **integration.css** - Estilos optimizados para GeneratePress

### 1. Instalación del Plugin

1. **Sube el plugin**:
   ```bash
   # Copia plugin-calculadora-ajax-integration.php a:
   /wp-content/plugins/calculadora-ajax-integration/plugin-calculadora-ajax-integration.php
   ```

2. **Sube los assets**:
   ```bash
   # Copia integration.js e integration.css a la misma carpeta del plugin
   /wp-content/plugins/calculadora-ajax-integration/integration.js
   /wp-content/plugins/calculadora-ajax-integration/integration.css
   ```

3. **Activa el plugin** desde el panel de WordPress:
   - Escritorio → Plugins → Calculadora AJAX Integration → Activar

4. **Configura el ID del producto** (si es diferente de 27859):
   - Edita `plugin-calculadora-ajax-integration.php`
   - Cambia la línea: `private $target_product_id = 27859;`
   - Pon el ID de tu producto con la calculadora

### 2. Configurar el Producto WooCommerce

1. **Crear producto simple** (o usar el existente con ID 27859):
   - **ID del producto**: 27859
   - Nombre: "Stickers Personalizados" (o el nombre actual)
   - Precio base: $0 (se actualizará dinámicamente) 
   - Stock: Ilimitado
   - Estado: Publicado

2. **Añadir la calculadora en la descripción**:
   - Usar el shortcode: `[calculadora_stickers]`
   - Asegurarte de que los assets estén en la ubicación correcta

### 3. Los archivos JavaScript y CSS ya están incluidos

Crear archivo: `/wp-content/plugins/calculadora-realtime-integration.php`

```php
<?php
/**
 * Plugin Name: Calculadora WooCommerce Realtime Integration
 * Description: Integra la calculadora con WooCommerce actualizando precio en tiempo real
 * Version: 1.0
 * Author: Tu Nombre
 */

if (!defined('ABSPATH')) {
    exit;
}

class CalculadoraRealtimeIntegration {
    
    public function __construct() {
        // Agregar script en páginas de producto
        add_action('woocommerce_before_single_product', array($this, 'add_integration_script'));
        
        // Agregar campo oculto para el precio calculado
        add_action('woocommerce_before_add_to_cart_button', array($this, 'add_price_field'));
        
        // Modificar precio al agregar al carrito
        add_filter('woocommerce_add_cart_item_data', array($this, 'add_cart_item_custom_price'), 10, 2);
        
        // Modificar precio del item en carrito
        add_action('woocommerce_before_calculate_totals', array($this 'custom_cart_item_price'), 10, 1);
    }
    
    /**
     * Agregar script de integración en páginas de producto
     */
    public function add_integration_script() {
        if (!is_product()) {
            return;
        }
        ?>
        <script>
        // Función global que la calculadora puede llamar
        window.updateWooCommercePrice = function(calculatedPrice) {
            console.log('Actualizando precio de WooCommerce:', calculatedPrice);
            
            // Actualizar precio visible en la página
            const priceElement = document.querySelector('.price .amount');
            if (priceElement) {
                priceElement.textContent = '$' + calculatedPrice.toLocaleString('es-AR');
            }
            
            // Actualizar precio en el botón de agregar al carrito
            const priceButton = document.querySelector('.single_add_to_cart_button');
            if (priceButton) {
                priceButton.dataset.calculatedPrice = calculatedPrice;
            }
            
            // Guardar en campo oculto
            const hiddenField = document.getElementById('calculadora_calculated_price');
            if (hiddenField) {
                hiddenField.value = calculatedPrice;
            }
            
            // Actualizar precio en el formulario para WooCommerce
            const priceInput = document.querySelector('input[name="price"]');
            if (priceInput) {
                priceInput.value = calculatedPrice;
            }
        };
        
        // Escuchar cambios en el formulario del producto
        document.addEventListener('DOMContentLoaded', function() {
            const addToCartForm = document.querySelector('form.cart');
            if (addToCartForm) {
                addToCartForm.addEventListener('submit', function(e) {
                    const calculatedPrice = document.getElementById('calculadora_calculated_price');
                    if (calculatedPrice && calculatedPrice.value) {
                        // Agregar el precio calculado al formulario
                        const priceInput = document.createElement('input');
                        priceInput.type = 'hidden';
                        priceInput.name = 'calculadora_price';
                        priceInput.value = calculatedPrice.value;
                        addToCartForm.appendChild(priceInput);
                    }
                });
            }
        });
        </script>
        <?php
    }
    
    /**
     * Agregar campo oculto para el precio calculado
     */
    public function add_price_field() {
        ?>
        <input type="hidden" id="calculadora_calculated_price" name="calculadora_price" value="">
        <?php
    }
    
    /**
     * Guardar el precio calculado al agregar al carrito
     */
    public function add_cart_item_custom_price($cart_item_data, $product_id) {
        if (isset($_POST['calculadora_price']) && !empty($_POST['calculadora_price'])) {
            $calculated_price = floatval($_POST['calculadora_price']);
            $cart_item_data['calculadora_price'] = $calculated_price;
        }
        return $cart_item_data;
    }
    
    /**
     * Aplicar el precio calculado al item en el carrito
     */
    public function custom_cart_item_price($cart) {
        foreach ($cart->get_cart() as $cart_item) {
            if (isset($cart_item['calculadora_price'])) {
                $cart_item['data']->set_price($cart_item['calculadora_price']);
            }
        }
    }
}

new CalculadoraRealtimeIntegration();
```

### 3. Los archivos JavaScript y CSS ya están incluidos

El plugin que instalaste ya incluye:
- **integration.js** - Con toda la lógica de comunicación AJAX
- **integration.css** - Estilos optimizados para GeneratePress

No necesitas crear estos archivos manualmente.

Agregar a tu tema hijo o al plugin:

```css
/* Animación cuando el precio se actualiza */
.price-updated {
    transition: all 0.3s ease;
    transform: scale(1.05);
    background-color: #e8f5e9;
    padding: 10px;
    border-radius: 5px;
}

.flash-animation {
    animation: flash 0.5s ease-in-out;
}

@keyframes flash {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}

/* Asegurar que la calculadora se vea bien en GeneratePress */
#mu-sticker-calculator-root {
    margin: 20px 0;
    max-width: 100%;
}

/* Responsive para móvil */
@media (max-width: 768px) {
    #mu-sticker-calculator-root {
        margin: 10px 0;
    }
}
```

### 4. Modificaciones en la Calculadora

He implementado los siguientes cambios en la calculadora:

#### OrderSummary.tsx
- **Botón "ACTUALIZAR PRECIO"**: Llama a `window.updateWooCommercePrice()` con el precio calculado
- **Mantiene botón CONSULTAR**: Para consultas por WhatsApp
- **Elimina botón COMPRAR directo**: Ya existe en WooCommerce

#### MobileSummaryBar.tsx
- **Botón "Actualizar Precio"**: Actualiza precio de WooCommerce y hace scroll al resumen
- **Botón de consulta**: Icono de WhatsApp (si hay consultLink)
- **Responsive**: Se adapta mejor a móvil

#### Cambios necesarios:
1. **Compilar el bundle**: `npm run build` o tu comando de build
2. **Subir archivo JS compilado**: `/assets/js/calculadora_stickers.js`
3. **Verificar función**: `window.updateWooCommercePrice` debe estar disponible

### 5. Probar la Integración

#### Prueba 1: Función JavaScript disponible
1. Abre la página del producto en el navegador
2. Abre la consola (F12)
3. Escribe: `window.updateWooCommercePrice(1500)`
4. Verifica que el precio de WooCommerce se actualice

#### Prueba 2: Desde la calculadora
1. Completa un pedido en la calculadora
2. Click en "ACTUALIZAR PRECIO"
3. Verifica que el precio de WooCommerce cambie
4. Agrega al carrito
5. Verifica que el precio se mantenga

#### Prueba 3: En móvil
1. Prueba en dispositivo móvil
2. Usa la barra móvil inferior
3. Click en "Actualizar Precio"
4. Verifica scroll y actualización

### 8. Consideraciones Específicas para GeneratePress

GeneratePress tiene algunas particularidades:

#### A. Hooks del Tema
GeneratePress usa hooks específicos. Si necesitas modificar la posición de la calculadora:

```php
// En functions.php de tu tema hijo
add_action('generate_after_entry_content', function() {
    if (is_product()) {
        echo do_shortcode('[calculadora_stickers]');
    }
});
```

#### B. Estilos del Tema
GeneratePress tiene un sistema de espacios consistente. Asegúrate de:

```css
/* Contenedor de calculadora en GeneratePress */
.woocommerce-page #mu-sticker-calculator-root {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

/* Integración con el diseño de GeneratePress */
.woocommerce-page .entry-content {
    padding-bottom: 40px;
}
```

### 7. Troubleshooting

#### El precio no se actualiza
- Verifica que jQuery esté cargado (GeneratePress lo carga por defecto)
- Revisa la consola por errores de JavaScript
- Verifica que el ID del producto sea correcto

#### El precio en el carrito es incorrecto
- Revisa las sesiones de WooCommerce
- Verifica que el precio se guarde correctamente en `$cart_item_data`
- Revisa los hooks de WooCommerce

#### Conflictos con GeneratePress
- Desactiva temporalmente otros plugins
- Verifica que no haya conflicto con otras funciones de precio
- Revisa la prioridad de los hooks

### 11. Optimización

Para mejor rendimiento:

```php
// Solo cargar scripts en páginas de producto
public function enqueue_scripts() {
    if (!is_product()) {
        return;
    }
    // ... código de enqueue
}
```

### 12. Seguridad

```php
// Validar y sanitizar todos los inputs
$price = isset($_POST['price']) ? floatval(sanitize_text_field($_POST['price'])) : 0;

// Verificar nonce si es necesario
if (!check_ajax_referer('calculator_nonce', 'nonce', false)) {
    wp_send_json_error('Invalid nonce');
}
```

### 13. Flujo de Trabajo Final

1. Cliente entra a página de producto
2. Calculadora carga en la descripción
3. Cliente usa calculadora y obtiene precio
4. Click en "ACTUALIZAR PRECIO" → Precio de WooCommerce se actualiza
5. Cliente click en "Agregar al carrito" → Precio correcto se mantiene
6. Checkout con precio personalizado

Esta integración es completamente transparente para el cliente y mantiene la experiencia nativa de WooCommerce.