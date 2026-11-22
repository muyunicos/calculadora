<?php
/**
 * Plugin Name: Calculadora Cart Integration
 * Description: Integra la calculadora con el carrito de WooCommerce para productos personalizados
 * Version: 1.2
 * Author: Tu Nombre
 * Requires at least: 5.0
 */

if (!defined('ABSPATH')) {
    exit;
}

// Motor de precios server-side (port de src/core/priceEngine.ts).
// El archivo tiene que subirse junto al plugin: si falta, el AJAX del carrito
// responde un error claro en lugar de un fatal.
$mu_calc_pricing_file = plugin_dir_path(__FILE__) . 'calculadora-pricing.php';
if (file_exists($mu_calc_pricing_file)) {
    require_once $mu_calc_pricing_file;
}

class CalculadoraCartIntegration {
    
    private $target_product_id = 27859; // ID del producto Cotizador
    
    public function __construct() {
        // Scripts y estilos
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        
        // Endpoint AJAX personalizado para agregar al carrito
        add_action('wp_ajax_calculator_add_to_cart', array($this, 'calculator_add_to_cart_ajax'));
        add_action('wp_ajax_nopriv_calculator_add_to_cart', array($this, 'calculator_add_to_cart_ajax'));

        // Refresco de nonce (la página puede venir cacheada y el nonce vence).
        add_action('wp_ajax_mu_calc_cart_nonce', array($this, 'refresh_nonce_ajax'));
        add_action('wp_ajax_nopriv_mu_calc_cart_nonce', array($this, 'refresh_nonce_ajax'));
        
        // Modificar precio del item en el carrito
        add_action('woocommerce_before_calculate_totals', array($this, 'set_calculator_item_price'), 10, 1);
        
        // Modificar nombre del item en el carrito
        add_filter('woocommerce_cart_item_name', array($this, 'modify_cart_item_name'), 10, 3);
        
        // Agregar metadatos al pedido
        add_action('woocommerce_checkout_create_order_line_item', array($this, 'add_order_item_meta'), 10, 4);
        
        // Mostrar metadatos en el admin
        add_action('woocommerce_order_item_meta_end', array($this, 'display_order_item_meta'), 10, 3);
        
        // Agregar botón de editar en el carrito
        add_action('woocommerce_after_cart_item_name', array($this, 'add_edit_button'), 10, 2);
        
        // CSS para ocultar elementos del producto Cotizador
        add_action('wp_head', array($this, 'add_hide_styles'));
    }
    
    /**
     * Enqueue scripts
     */
    public function enqueue_scripts() {
        // Cargar en página del producto, del carrito y del cotizador
        if (is_product() || is_cart() || is_page('cotizador')) {
            wp_enqueue_script(
                'calculadora-cart-integration',
                plugin_dir_url(__FILE__) . 'cart-integration.js',
                array('jquery'),
                '1.2',
                true
            );
            
            // Nonce propio (24 h). OJO: NO se debe reutilizar el nombre
            // `wc_add_to_cart_params`: WooCommerce localiza ese mismo objeto y
            // pisarlo rompe su add-to-cart AJAX en producto/carrito.
            wp_localize_script('calculadora-cart-integration', 'muCalcCart', array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'cart_url' => wc_get_cart_url(),
                'product_id' => $this->target_product_id,
                'nonce' => wp_create_nonce('calculator-add-to-cart'),
                'nonce_action' => 'mu_calc_cart_nonce',
            ));

            // Spec 019 (D26): el motor de galeria/visor vive en el TEMA; se encola solo
            // si esta (dependencia BLANDA). Sin tema, la calculadora usa sus componentes.
            if (function_exists('mu_galeria_encolar')) {
                mu_galeria_encolar();
            }
        }
    }
    
    /**
     * Endpoint AJAX personalizado para agregar al carrito
     */
    public function calculator_add_to_cart_ajax() {
        // Verificar nonce
        $nonce = isset($_POST['nonce']) ? sanitize_text_field(wp_unslash($_POST['nonce'])) : '';
        if (!wp_verify_nonce($nonce, 'calculator-add-to-cart')) {
            wp_send_json_error(array('error' => 'Invalid nonce', 'code' => 'invalid_nonce'));
        }

        $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
        $quantity = isset($_POST['quantity']) ? max(1, intval($_POST['quantity'])) : 1;
        $calculator_data = isset($_POST['calculator_data']) ? wp_unslash($_POST['calculator_data']) : '';

        // Verificar que sea el producto correcto
        if ($product_id !== $this->target_product_id) {
            wp_send_json_error(array('error' => 'Invalid product ID'));
        }

        $decoded_data = json_decode($calculator_data, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded_data)) {
            wp_send_json_error(array('error' => 'Invalid JSON data'));
        }

        // --- PRECIO RECALCULADO EN EL SERVIDOR ---
        // El `price` que manda el navegador se IGNORA: cualquiera podría enviar
        // price=1. Se recalcula a partir del código de pedido y datos_config.json.
        // Spec 038 (F-COD): el bundle manda `orderCode` (camelCase). Antes se leia
        // `order_code`: el desajuste hacia que la compra fallara SIEMPRE con
        // "Falta el codigo de pedido" (el payload traia el codigo, pero nadie lo leia).
        $order_code = isset($decoded_data['orderCode']) ? sanitize_text_field((string) $decoded_data['orderCode']) : '';
        if ($order_code === '') {
            wp_send_json_error(array('error' => 'Falta el código de pedido.'));
        }

        if (!function_exists('mu_calc_price_from_code')) {
            wp_send_json_error(array('error' => 'Falta calculadora-pricing.php en la carpeta del plugin.'));
        }

        $pricing = mu_calc_price_from_code($order_code);
        if ($pricing === null) {
            wp_send_json_error(array(
                'error' => 'No se pudo recalcular el precio del pedido. Verificá la configuración y el código de pedido.',
            ));
        }

        // Spec 037: el DISENO viaja con la linea (original + receta). Solo ids y
        // medidas: el arte NUNCA viaja compuesto (constitution §III del plugin).
        $diseno = array();
        if (isset($decoded_data['diseno']) && is_array($decoded_data['diseno'])) {
            $d = $decoded_data['diseno'];
            $d_id = isset($d['id']) ? strtolower(preg_replace('/[^a-f0-9]/', '', (string) $d['id'])) : '';
            $d_item = isset($d['itemKey']) ? strtolower(preg_replace('/[^a-z0-9-]/', '', (string) $d['itemKey'])) : '';
            $d_sid = isset($d['sid']) ? strtolower(preg_replace('/[^a-z0-9_-]/', '', (string) $d['sid'])) : '';
            $d_receta = isset($d['receta']) ? strtolower(preg_replace('/[^a-f0-9]/', '', (string) $d['receta'])) : '';
            if (preg_match('/^[a-f0-9]{12}$/', $d_id) && preg_match('/^cot-[a-z0-9]{8}$/', $d_item)) {
                $diseno = array(
                    'id' => $d_id,
                    'itemKey' => $d_item,
                    'sid' => substr($d_sid, 0, 64),
                    'w' => max(1, min(3000, isset($d['w']) ? (int) $d['w'] : 0)),
                    'h' => max(1, min(3000, isset($d['h']) ? (int) $d['h'] : 0)),
                    'receta' => preg_match('/^[a-f0-9]{12}$/', $d_receta) ? $d_receta : '',
                );
            }
        }

        // Solo se persisten datos de presentación ya saneados.
        $safe_data = array(
            'order_code' => $order_code,
            'price' => $pricing['price'],
            'description' => isset($decoded_data['description']) ? sanitize_text_field((string) $decoded_data['description']) : '',
            'cotizador_url' => isset($decoded_data['cotizadorUrl']) ? esc_url_raw((string) $decoded_data['cotizadorUrl']) : '',
            'material' => isset($decoded_data['material']) ? sanitize_text_field((string) $decoded_data['material']) : '',
            'formato' => isset($decoded_data['formato']) ? sanitize_text_field((string) $decoded_data['formato']) : '',
            'medida' => isset($decoded_data['medida']) ? sanitize_text_field((string) $decoded_data['medida']) : '',
            'quantity' => (int) $pricing['totalStickers'],
            'sheets' => (int) $pricing['sheets'],
            'diseno' => $diseno,
        );

        $cart_item_key = WC()->cart->add_to_cart(
            $product_id,
            $quantity,
            0, // variation ID
            array(), // variation data
            array('calculator_data' => $safe_data)
        );

        if (is_wp_error($cart_item_key) || !$cart_item_key) {
            $message = is_wp_error($cart_item_key) ? $cart_item_key->get_error_message() : 'No se pudo agregar al carrito.';
            wp_send_json_error(array('error' => $message));
        }

        // Fragments para que WooCommerce refresque el mini-carrito (antes se
        // disparaba `added_to_cart` con fragments undefined).
        ob_start();
        woocommerce_mini_cart();
        $mini_cart = ob_get_clean();

        wp_send_json_success(array(
            'cart_hash' => WC()->cart->get_cart_hash(),
            'cart_url' => wc_get_cart_url(),
            'fragments' => apply_filters('woocommerce_add_to_cart_fragments', array(
                'div.widget_shopping_cart_content' => '<div class="widget_shopping_cart_content">' . $mini_cart . '</div>',
            )),
        ));
    }

    /**
     * Devuelve un nonce fresco (la página puede venir de caché y el nonce vence).
     */
    public function refresh_nonce_ajax() {
        wp_send_json_success(array(
            'nonce' => wp_create_nonce('calculator-add-to-cart'),
        ));
    }
    
    /**
     * Modificar precio del item en el carrito
     */
    public function set_calculator_item_price($cart) {
        if (is_admin() && !defined('DOING_AJAX')) {
            return;
        }
        
        foreach ($cart->get_cart() as $cart_item_key => $cart_item) {
            // El precio guardado lo calculó el SERVIDOR al agregar al carrito
            // (nunca viene del navegador); se valida antes de aplicarlo.
            $price = isset($cart_item['calculator_data']['price']) ? $cart_item['calculator_data']['price'] : null;
            if (is_numeric($price) && is_finite((float) $price) && (float) $price > 0 && isset($cart_item['data'])) {
                $cart_item['data']->set_price((float) $price);
            }
        }
    }
    
    /**
     * URL del cotizador guardada en el item del carrito.
     *
     * El servidor guarda la version saneada como `cotizador_url` (es la que viaja
     * en `calculator_data`); el navegador la manda como `cotizadorUrl`. Se aceptan
     * las dos: la primera es la de siempre, la segunda cubre carritos viejos.
     *
     * Sin esta tolerancia el boton "Editar" del carrito y el link del pedido no
     * aparecian nunca: leian la clave camelCase, que el servidor no guarda.
     */
    private function url_cotizador($data) {
        if (!is_array($data)) {
            return '';
        }
        foreach (array('cotizador_url', 'cotizadorUrl') as $clave) {
            $url = isset($data[$clave]) ? (string) $data[$clave] : '';
            if ($url !== '') {
                return $url;
            }
        }
        return '';
    }

    /**
     * Modificar nombre del item en el carrito
     */
    public function modify_cart_item_name($name, $cart_item, $cart_item_key) {
        // Solo modificar items de la calculadora
        if (!isset($cart_item['calculator_data'])) {
            return $name;
        }
        
        $calculator_data = $cart_item['calculator_data'];
        $resumen = $this->resumen_item_html($calculator_data);
        
        if ($resumen !== '') {
            // Agregar descripción después del nombre del producto
            $name .= $resumen;
            
            // Agregar URL del cotizador como texto oculto
            $urlCot = $this->url_cotizador($calculator_data);
            if ($urlCot !== '') {
                $name .= '<div class="calculator-order-code" style="display: none;">' . esc_url($urlCot) . '</div>';
            }
        }
        
        return $name;
    }
    
    /**
     * Resumen del item en HTML: dos lineas, lo que se compra y como es.
     *
     * Misma informacion y MISMO orden que `buildItemDescription()` de
     * `cart-integration.js` (el texto plano del email y de la meta del pedido):
     * primero planchas y unidades, despues medida, material y formato. Aca va en
     * dos lineas porque el HTML respira; alla todo en una porque el texto plano
     * no tiene como.
     *
     * El codigo del pedido NO se muestra (spec 038, F5f): el admin lo tiene en la
     * ficha del pedido y en el PDF, y el servidor lo usa para recalcular el precio.
     *
     * @param  array $data `calculator_data` del item (carrito) o `_calculator_resumen` (pedido).
     * @return string HTML (vacio si no hay nada que mostrar).
     */
    private function resumen_item_html($data) {
        if (!is_array($data)) {
            return '';
        }

        $planchas = isset($data['sheets']) ? max(0, (int) $data['sheets']) : 0;
        $unidades = isset($data['quantity']) ? max(0, (int) $data['quantity']) : 0;

        $linea1 = array();
        if ($planchas > 0) {
            // "5 planchas de 60": solo con mas de una plancha y division exacta
            // (con una sola, "1 plancha de 60 · 60 u" repite el mismo numero).
            $porPlancha = ($planchas > 1 && $unidades > 0 && $unidades % $planchas === 0)
                ? intdiv($unidades, $planchas)
                : 0;
            $linea1[] = number_format($planchas, 0, ',', '.')
                . ($planchas === 1 ? ' plancha' : ' planchas')
                . ($porPlancha > 1 ? ' de ' . number_format($porPlancha, 0, ',', '.') : '');
        }
        if ($unidades > 0) {
            $linea1[] = number_format($unidades, 0, ',', '.') . ' u';
        }

        $linea2 = array();
        foreach (array('medida', 'material', 'formato') as $clave) {
            $valor = isset($data[$clave]) ? trim((string) $data[$clave]) : '';
            if ($valor !== '') {
                $linea2[] = $valor;
            }
        }

        $estilo = 'display: block; margin-top: 4px; font-size: 12px; line-height: 1.45; color: #64748b;';

        if (!$linea1 && !$linea2) {
            // Respaldo: items sin campos (carrito o pedido viejos) traen el texto plano.
            $plano = isset($data['description']) ? trim((string) $data['description']) : '';
            return $plano !== ''
                ? '<span class="calculator-item-description" style="' . $estilo . '">' . esc_html($plano) . '</span>'
                : '';
        }

        $html = '<span class="calculator-item-description" style="' . $estilo . '">';
        if ($linea1) {
            $html .= '<span style="display: block; color: #334155; font-weight: 600;">'
                . esc_html(implode(' · ', $linea1)) . '</span>';
        }
        if ($linea2) {
            $html .= '<span style="display: block;">' . esc_html(implode(' · ', $linea2)) . '</span>';
        }

        return $html . '</span>';
    }

    /**
     * Normaliza la descripcion vieja del carrito ("Material: X | Formato: Y | ...")
     * a los campos del resumen.
     *
     * Los pedidos anteriores congelaron ese texto largo; sin esto seguirian
     * mostrandolo asi. Devuelve array() si no reconoce el formato (ahi se muestra
     * el texto tal como se guardo).
     */
    private function resumen_legacy_campos($plano) {
        $campos = array();
        foreach (explode('|', (string) $plano) as $parte) {
            $parte = trim($parte);
            $pos = strpos($parte, ':');
            if ($pos === false) {
                continue;
            }
            $clave = strtolower(trim(substr($parte, 0, $pos)));
            $valor = trim(substr($parte, $pos + 1));
            if ($valor === '') {
                continue;
            }
            if ($clave === 'material') {
                $campos['material'] = $valor;
            } elseif ($clave === 'formato') {
                $campos['formato'] = $valor;
            } elseif ($clave === 'medida') {
                $campos['medida'] = $valor;
            } elseif ($clave === 'unidades') {
                $campos['quantity'] = (int) preg_replace('/[^0-9]/', '', $valor);
            } elseif ($clave === 'planchas') {
                $campos['sheets'] = (int) preg_replace('/[^0-9]/', '', $valor);
            }
            // 'codigo' se descarta: no se muestra al comprador (spec 038, F5f).
        }
        return $campos;
    }
    /**
     * Agregar metadatos al pedido
     */
    public function add_order_item_meta($item, $cart_item_key, $values, $order) {
        if (isset($values['calculator_data'])) {
            $calculator_data = $values['calculator_data'];
            
            $item->add_meta_data('_calculator_order_code', $calculator_data['orderCode'] ?? '', true);
            $item->add_meta_data('_calculator_price', $calculator_data['price'] ?? 0, true);
            $item->add_meta_data('_calculator_description', $calculator_data['description'] ?? '', true);
            // El resumen viaja estructurado: el detalle del pedido lo renderiza
            // `resumen_item_html()` sin depender del texto plano que se congelo.
            $item->add_meta_data('_calculator_resumen', array(
                'sheets'   => isset($calculator_data['sheets']) ? (int) $calculator_data['sheets'] : 0,
                'quantity' => isset($calculator_data['quantity']) ? (int) $calculator_data['quantity'] : 0,
                'medida'   => isset($calculator_data['medida']) ? (string) $calculator_data['medida'] : '',
                'material' => isset($calculator_data['material']) ? (string) $calculator_data['material'] : '',
                'formato'  => isset($calculator_data['formato']) ? (string) $calculator_data['formato'] : '',
            ), true);
            $item->add_meta_data('_calculator_url', $this->url_cotizador($calculator_data), true);
            // Spec 037: el plugin Personalizador PDF promueve el item del
            // cotizador con ESTAS metas (`_mu_origen` decide que NO se entregue PDF).
            if (!empty($calculator_data['diseno']) && is_array($calculator_data['diseno'])) {
                $d = $calculator_data['diseno'];
                $item->add_meta_data('_pmu_sid', (string) ($d['sid'] ?? ''), true);
                $item->add_meta_data('_pmu_item_key', (string) ($d['itemKey'] ?? ''), true);
                $item->add_meta_data('_mu_diseno_id', (string) ($d['id'] ?? ''), true);
                $item->add_meta_data('_mu_origen', 'cotizador', true);
            }
        }
    }
    
    /**
     * Resumen del item y datos de la calculadora en el pedido.
     *
     * `woocommerce_order_item_meta_end` corre en el admin Y en Mi cuenta: el
     * resumen (lo que se compra) va arriba; despues el precio recalculado y el
     * enlace al cotizador.
     */
    public function display_order_item_meta($item_id, $item, $order) {
        $calculator_url = $item->get_meta('_calculator_url');
        $calculator_price = $item->get_meta('_calculator_price');
        // Pedidos nuevos: resumen estructurado. Pedidos viejos: el texto plano que
        // se congelo al pagar; se reordena al vuelo (la metadata no se reescribe).
        $lineas = '';
        $guardado = $item->get_meta('_calculator_resumen', true);
        $plano = (string) $item->get_meta('_calculator_description', true);
        if (is_array($guardado) && $guardado) {
            $lineas = $this->resumen_item_html($guardado);
        } elseif ($plano !== '') {
            // Pedido viejo: la metadata se congelo con el formato largo. Se
            // reordena al vuelo (mismos campos, dos lineas); si no se reconoce,
            // se muestra el texto tal como se guardo.
            $lineas = $this->resumen_item_html($this->resumen_legacy_campos($plano));
            if ($lineas === '') {
            $lineas = '<span class="calculator-item-description" style="display: block; font-size: 12px; line-height: 1.45; color: #64748b;">'
                    . esc_html($plano) . '</span>';
            }
        }
        
        if ($calculator_url || $calculator_price || $lineas !== '') {
            echo '<div class="calculator-order-meta" style="background: #f0f9ff; padding: 10px; margin: 8px 0; border-radius: 4px; border-left: 4px solid #3b82f6;">';
            
            if ($lineas !== '') {
                echo $lineas;
            }

            if ($calculator_price) {
                echo '<div><strong>Precio Calculado:</strong> ' . wc_price($calculator_price) . '</div>';
            }
            
            if ($calculator_url) {
                echo '<div style="margin-top: 6px;"><a href="' . esc_url($calculator_url) . '" target="_blank" style="color: #3b82f6; text-decoration: underline;">📋 Ver en Calculadora</a></div>';
            }
            
            echo '</div>';
        }
    }
    
    /**
     * Agregar botón de editar en el carrito
     */
    public function add_edit_button($cart_item, $cart_item_key) {
        // Solo para items de la calculadora
        if (!isset($cart_item['calculator_data'])) {
            return;
        }
        
        $calculator_url = $this->url_cotizador($cart_item['calculator_data']);
        
        if ($calculator_url) {
            echo '<a href="' . esc_url($calculator_url) . '" class="button edit-calculator-item" style="font-size: 11px; padding: 4px 8px; margin-left: 8px; background: #10b981; color: white; border: none; border-radius: 3px; text-decoration: none; line-height: 1;">✏️ Editar</a>';
        }
    }
    
    /**
     * CSS para ocultar elementos del producto Cotizador
     */
    public function add_hide_styles() {
        // Solo aplicar en la página del producto Cotizador
        if (is_product() && get_the_ID() == $this->target_product_id) {
            ?>
            <style>
            /* Ocultar elementos de WooCommerce en el producto Cotizador */
            .woocommerce-product-gallery,
            .woocommerce-product-summary,
            .summary.entry-summary,
            .woocommerce-tabs .wc-tabs,
            .woocommerce-Tabs-panel--description h2 {
                display: none !important;
            }

            .woocommerce-product-gallery,
            .woocommerce-product-summary,
            .summary.entry-summary,
            .woocommerce-tabs .wc-tabs,
            .woocommerce-Tabs-panel--description, #mu-sticker-calculator-root {
                box-shadow: unset;
            }
            /* Asegurar que la calculadora ocupe todo el espacio */
            .woocommerce-Tabs-panel--description {
                padding: 0 !important;
                margin: 0 !important;
            }
            
            #mu-sticker-calculator-root {
                margin: 0 !important;
                max-width: 100% !important;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .woocommerce-Tabs-panel--description {
                    padding: 0 !important;
                }
            }
            </style>
            <?php
        }
    }
}

// Inicializar el plugin
add_action('plugins_loaded', function() {
    if (class_exists('WooCommerce')) {
        new CalculadoraCartIntegration();
    }
});
