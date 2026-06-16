# Integración WooCommerce - Calculadora de Stickers

## Overview del Sistema

El motor de la calculadora ahora genera URLs de WooCommerce que incluyen el código del pedido en formato corto (ej: `v1.m10.s30.q5.f1.d0`). Cuando el cliente hace click en "Comprar", es redirigido a:

```
https://muyunicos.com/calculadora/?add-to-cart=123&p=v1.m10.s30.q5.f1.d0
```

Donde:
- `123` = ID del producto genérico en WooCommerce
- `p=v1.m10.s30.q5.f1.d0` = Código del pedido con la configuración completa

## Estructura del Código de Pedido

Formato: `v1.m{material_code}.s{size_code}.q{quantity}.f{format_code}.d{design_code}.t{time}`

Ejemplo: `v1.m11.s201.q25.f2.d0`
- `v1` = Versión del formato
- `m11` = Material con código 11
- `s201` = Forma/tamaño con código 201
- `q25` = 25 planchas
- `f2` = Formato con código 2 (Planchas)
- `d0` = Diseño con código 0 (Listo para imprimir)
- `t60` = (opcional) Tiempo personalizado en minutos

Para rectangulares: `v1.m11.r50x50.q25.f2.d0`
- `r50x50` = Rectangular 5.0cm x 5.0cm (en milímetros, modo económico)

## Implementación en WordPress

### 1. Crear Plugin para Interceptar el Parámetro

Crear archivo: `/wp-content/plugins/calculadora-woo-integration.php`

```php
<?php
/**
 * Plugin Name: Calculadora WooCommerce Integration
 * Description: Integra la calculadora de stickers con WooCommerce
 * Version: 1.0
 */

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

class CalculadoraWooIntegration {
    
    private $generic_product_id = 123; // ID del producto genérico
    
    public function __construct() {
        add_action('template_redirect', array($this, 'handle_calculadora_parameter'));
        add_filter('woocommerce_add_to_cart_product_id', array($this, 'modify_product_id'), 10, 1);
        add_action('woocommerce_before_calculate_totals', array($this, 'custom_price'), 10, 1);
        add_filter('woocommerce_product_get_title', array($this, 'modify_product_title'), 10, 2);
        add_filter('woocommerce_cart_item_name', array($this, 'modify_cart_item_name'), 10, 3);
    }
    
    /**
     * Interceptar el parámetro 'p' con el código de pedido
     */
    public function handle_calculadora_parameter() {
        if (isset($_GET['p']) && !empty($_GET['p'])) {
            $order_code = sanitize_text_field($_GET['p']);
            $this->store_order_code($order_code);
        }
    }
    
    /**
     * Almacenar el código de pedido en sesión
     */
    private function store_order_code($code) {
        WC()->session->set('calculadora_order_code', $code);
    }
    
    /**
     * Obtener el código de pedido de sesión
     */
    private function get_order_code() {
        return WC()->session->get('calculadora_order_code', '');
    }
    
    /**
     * Modificar el ID del producto cuando viene de la calculadora
     */
    public function modify_product_id($product_id) {
        $order_code = $this->get_order_code();
        if (!empty($order_code) && $product_id == $this->generic_product_id) {
            return $this->generic_product_id;
        }
        return $product_id;
    }
    
    /**
     * Decodificar el código de pedido
     */
    private function decode_order_code($code) {
        $tokens = explode('.', $code);
        if ($tokens[0] !== 'v1') {
            return null;
        }
        
        $order = array(
            'material_code' => '',
            'size_code' => '',
            'quantity' => 0,
            'format_code' => '',
            'design_code' => '',
            'custom_time' => 0,
            'is_rectangular' => false,
            'rect_w' => 0,
            'rect_h' => 0,
            'rect_mode' => ''
        );
        
        foreach (array_slice($tokens, 1) as $token) {
            $key = $token[0];
            $val = substr($token, 1);
            
            switch ($key) {
                case 'm':
                    $order['material_code'] = $val;
                    break;
                case 's':
                    // Verificar si es formato rectangular (mm)
                    if (preg_match('/^\d+x\d+$/', $val)) {
                        $dimensions = explode('x', $val);
                        $order['is_rectangular'] = true;
                        $order['rect_w'] = intval($dimensions[0]) / 10; // Convertir a cm
                        $order['rect_h'] = intval($dimensions[1]) / 10;
                        $order['rect_mode'] = 'preciso';
                    } else {
                        $order['size_code'] = $val;
                    }
                    break;
                case 'r':
                    // Rectangular modo económico
                    if (preg_match('/^\d+x\d+$/', $val)) {
                        $dimensions = explode('x', $val);
                        $order['is_rectangular'] = true;
                        $order['rect_w'] = intval($dimensions[0]) / 10; // Convertir a cm
                        $order['rect_h'] = intval($dimensions[1]) / 10;
                        $order['rect_mode'] = 'economico';
                    }
                    break;
                case 'q':
                    $order['quantity'] = intval($val);
                    break;
                case 'f':
                    $order['format_code'] = intval($val);
                    break;
                case 'd':
                    $order['design_code'] = intval($val);
                    break;
                case 't':
                    $order['custom_time'] = intval($val);
                    break;
            }
        }
        
        return $order;
    }
    
    /**
     * Calcular el precio basado en el código de pedido
     * NOTA: Necesitas implementar la lógica de precios aquí
     * o integrar con el motor de precios existente
     */
    private function calculate_price($order) {
        // Aquí debes implementar la lógica de cálculo de precios
        // Puedes:
        // 1. Portar la lógica del motor de precios a PHP
        // 2. Hacer una llamada API al motor de precios
        // 3. Usar un sistema de precios basado en reglas
        
        // Ejemplo simplificado:
        $base_price_per_sheet = 500; // Precio base por plancha
        $material_multiplier = $this->get_material_multiplier($order['material_code']);
        $design_multiplier = $this->get_design_multiplier($order['design_code']);
        $format_multiplier = $this->get_format_multiplier($order['format_code']);
        
        $total = $order['quantity'] * $base_price_per_sheet * 
                 $material_multiplier * $design_multiplier * $format_multiplier;
        
        return $total;
    }
    
    /**
     * Obtener multiplicador de material (ejemplo)
     */
    private function get_material_multiplier($code) {
        // Mapear códigos de materiales a multiplicadores
        $multipliers = array(
            '10' => 1.0,  // Material básico
            '11' => 1.2,  // Material premium
            '12' => 1.5,  // Material especial
        );
        return isset($multipliers[$code]) ? $multipliers[$code] : 1.0;
    }
    
    /**
     * Obtener multiplicador de diseño (ejemplo)
     */
    private function get_design_multiplier($code) {
        $multipliers = array(
            '0' => 1.0,  // Listo para imprimir
            '1' => 1.3,  // Diseño simple
            '2' => 1.8,  // Diseño complejo
        );
        return isset($multipliers[$code]) ? $multipliers[$code] : 1.0;
    }
    
    /**
     * Obtener multiplicador de formato (ejemplo)
     */
    private function get_format_multiplier($code) {
        $multipliers = array(
            '0' => 0.8,  // Sin cortar
            '1' => 1.5,  // Troquel individual
            '2' => 1.0,  // Planchas
        );
        return isset($multipliers[$code]) ? $multipliers[$code] : 1.0;
    }
    
    /**
     * Modificar el precio del producto en el carrito
     */
    public function custom_price($cart_object) {
        foreach ($cart_object->get_cart() as $cart_item_key => $cart_item) {
            if ($cart_item['product_id'] == $this->generic_product_id) {
                $order_code = $this->get_order_code();
                if (!empty($order_code)) {
                    $order = $this->decode_order_code($order_code);
                    if ($order) {
                        $custom_price = $this->calculate_price($order);
                        $cart_item['data']->set_price($custom_price);
                        
                        // Guardar metadatos para mostrar en el carrito/pedido
                        $cart_item['data']->update_meta_data('_calculadora_order_code', $order_code);
                        $cart_item['data']->update_meta_data('_calculadora_material', $order['material_code']);
                        $cart_item['data']->update_meta_data('_calculadora_quantity', $order['quantity']);
                    }
                }
            }
        }
    }
    
    /**
     * Modificar el título del producto
     */
    public function modify_product_title($title, $product) {
        if ($product->get_id() == $this->generic_product_id) {
            $order_code = $this->get_order_code();
            if (!empty($order_code)) {
                $order = $this->decode_order_code($order_code);
                if ($order) {
                    $material_name = $this->get_material_name($order['material_code']);
                    $format_name = $this->get_format_name($order['format_code']);
                    $quantity = $order['quantity'];
                    
                    $title = "Stickers Personalizados - {$material_name} - {$format_name} ({$quantity} planchas)";
                }
            }
        }
        return $title;
    }
    
    /**
     * Modificar el nombre del item en el carrito
     */
    public function modify_cart_item_name($name, $cart_item, $cart_item_key) {
        if ($cart_item['product_id'] == $this->generic_product_id) {
            $order_code = $cart_item['data']->get_meta('_calculadora_order_code');
            if (!empty($order_code)) {
                $order = $this->decode_order_code($order_code);
                if ($order) {
                    $material_name = $this->get_material_name($order['material_code']);
                    $format_name = $this->get_format_name($order['format_code']);
                    $quantity = $order['quantity'];
                    
                    $name = "Stickers Personalizados - {$material_name} - {$format_name} ({$quantity} planchas)";
                    
                    // Agregar descripción detallada
                    $description = $this->build_order_description($order);
                    $name .= '<br><small class="text-muted">' . $description . '</small>';
                }
            }
        }
        return $name;
    }
    
    /**
     * Construir descripción detallada del pedido
     */
    private function build_order_description($order) {
        $description = array();
        
        $material_name = $this->get_material_name($order['material_code']);
        $description[] = "Material: {$material_name}";
        
        if ($order['is_rectangular']) {
            $description[] = "Medida: {$order['rect_w']}x{$order['rect_h']}cm ({$order['rect_mode']})";
        } else {
            $size_name = $this->get_size_name($order['size_code']);
            $description[] = "Tamaño: {$size_name}";
        }
        
        $format_name = $this->get_format_name($order['format_code']);
        $description[] = "Formato: {$format_name}";
        
        $design_name = $this->get_design_name($order['design_code']);
        $description[] = "Diseño: {$design_name}";
        
        if ($order['custom_time'] > 0) {
            $description[] = "Tiempo: {$order['custom_time']} min";
        }
        
        return implode(' | ', $description);
    }
    
    /**
     * Obtener nombre del material (ejemplo - conectar con tu base de datos)
     */
    private function get_material_name($code) {
        $names = array(
            '10' => 'Vinilo Blanco Mate',
            '11' => 'Vinilo Transparente',
            '12' => 'Holográfico',
        );
        return isset($names[$code]) ? $names[$code] : "Material {$code}";
    }
    
    /**
     * Obtener nombre del formato
     */
    private function get_format_name($code) {
        $names = array(
            '0' => 'Sin Cortar',
            '1' => 'Troquel Individual',
            '2' => 'Planchas',
        );
        return isset($names[$code]) ? $names[$code] : "Formato {$code}";
    }
    
    /**
     * Obtener nombre del diseño
     */
    private function get_design_name($code) {
        $names = array(
            '0' => 'Listo para imprimir',
            '1' => 'Diseño Simple',
            '2' => 'Diseño Complejo',
        );
        return isset($names[$code]) ? $names[$code] : "Diseño {$code}";
    }
    
    /**
     * Obtener nombre del tamaño
     */
    private function get_size_name($code) {
        $sizes = array(
            '201' => '3cm diámetro',
            '202' => '5cm diámetro',
            '203' => '8cm diámetro',
        );
        return isset($sizes[$code]) ? $sizes[$code] : "Tamaño {$code}";
    }
}

// Inicializar el plugin
new CalculadoraWooIntegration();
```

### 2. Configurar el Producto Genérico en WooCommerce

1. Crear un producto simple en WooCommerce con:
   - Nombre: "Stickers Personalizados (Cálculo Dinámico)"
   - Precio: $0 (se calculará dinámicamente)
   - Stock: Ilimitado
   - Nota el ID del producto (ej: 123)

2. Actualizar el ID en el plugin:
   ```php
   private $generic_product_id = 123; // Cambiar al ID real
   ```

### 3. Implementación Avanzada del Motor de Precios

Para cálculos de precios precisos, tienes varias opciones:

#### Opción A: Portar la lógica a PHP
Porta toda la lógica del archivo `src/core/priceEngine.ts` a PHP en el plugin.

#### Opción B: API Endpoint
Crea un endpoint en el motor que calcule el precio y llámalo desde WordPress:

```php
private function calculate_price_via_api($order_code) {
    $api_url = 'https://muyunicos.com/calculadora/api/calculate-price';
    $response = wp_remote_post($api_url, array(
        'body' => json_encode(array('order_code' => $order_code)),
        'headers' => array('Content-Type' => 'application/json'),
        'timeout' => 10
    ));
    
    if (is_wp_error($response)) {
        return 0;
    }
    
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    return isset($data['price']) ? floatval($data['price']) : 0;
}
```

#### Opción C: Precios Pre-calculados
Crea una tabla de precios basada en combinaciones comunes.

## Archivos Modificados en el Motor

1. **src/core/whatsapp.ts**: Agregada función `buildWooCommerceUrl()`
2. **src/App.tsx**: 
   - Importación de `buildWooCommerceUrl`
   - Generación de URL de WooCommerce
   - Paso de `wooCommerceUrl` a componentes
3. **src/components/MobileSummaryBar.tsx**: 
   - Nueva prop `wooCommerceUrl`
   - Botón "Comprar" que usa la URL de WooCommerce
4. **src/components/OrderSummary.tsx**: 
   - Nueva prop `wooCommerceUrl`
   - Botón "COMPRAR" actualizado para usar la URL dinámica

## Configuración del ID del Producto

Actualiza el ID del producto en `src/core/whatsapp.ts`:

```typescript
const WOOCOMMERCE_PRODUCT_ID = '123'; // Cambiar al ID real de tu producto
```

## Pruebas

1. Completa un pedido en la calculadora
2. Haz click en "Comprar"
3. Verifica que redirija a WooCommerce con el código correcto
4. Verifica que el producto tenga el precio calculado
5. Verifica que el título y descripción se actualicen correctamente

## Consideraciones Importantes

1. **Sincronización de Catálogos**: Los códigos de materiales, tamaños, formatos y diseños deben coincidir exactamente entre el motor y WordPress.

2. **Cálculo de Precios**: Asegúrate de que la lógica de precios en WordPress sea idéntica a la del motor para evitar discrepancias.

3. **Manejo de Errores**: Implementa validaciones robustas para códigos inválidos o productos no encontrados.

4. **Sesión**: El plugin usa sesiones de WooCommerce para mantener el código del pedido durante el proceso de checkout.

5. **Metadatos del Pedido**: Los metadatos personalizados se guardan para referencia futura y pueden usarse en emails de confirmación o en el panel de admin.

## Soporte

Para problemas o preguntas sobre la integración, revisa:
- Logs de errores de WordPress
- Consola del navegador para errores de JavaScript
- Logs del servidor para errores de API