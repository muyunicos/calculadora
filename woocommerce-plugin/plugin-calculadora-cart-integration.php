<?php
/**
 * Plugin Name: Calculadora Cart Integration
 * Description: Integra la calculadora con el carrito de WooCommerce para productos personalizados
 * Version: 1.0
 * Author: Tu Nombre
 * Requires at least: 5.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class CalculadoraCartIntegration {
    
    private $target_product_id = 27859; // ID del producto Cotizador
    
    public function __construct() {
        // Scripts y estilos
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        
        // Endpoint AJAX personalizado para agregar al carrito
        add_action('wp_ajax_calculator_add_to_cart', array($this, 'calculator_add_to_cart_ajax'));
        add_action('wp_ajax_nopriv_calculator_add_to_cart', array($this, 'calculator_add_to_cart_ajax'));
        
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
        // Cargar en página del producto y del carrito
        if (is_product() || is_cart()) {
            wp_enqueue_script(
                'calculadora-cart-integration',
                plugin_dir_url(__FILE__) . 'cart-integration.js',
                array('jquery'),
                '1.0',
                true
            );
            
            // Generar nonce
            $nonce = wp_create_nonce('calculator-add-to-cart');
            
            // Localizar datos de WooCommerce
            wp_localize_script('calculadora-cart-integration', 'wc_add_to_cart_params', array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'cart_url' => wc_get_cart_url(),
                'product_id' => $this->target_product_id,
                'nonce' => $nonce
            ));
            
            // También hacer el nonce disponible globalmente
            wp_localize_script('calculadora-cart-integration', 'calculator_add_to_cart_nonce', $nonce);
        }
    }
    
    /**
     * Endpoint AJAX personalizado para agregar al carrito
     */
    public function calculator_add_to_cart_ajax() {
        // Verificar nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'calculator-add-to-cart')) {
            wp_send_json_error(array('error' => 'Invalid nonce'));
        }
        
        $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
        $quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : 1;
        $calculator_data = isset($_POST['calculator_data']) ? sanitize_text_field($_POST['calculator_data']) : '';
        
        // Verificar que sea el producto correcto
        if ($product_id !== $this->target_product_id) {
            wp_send_json_error(array('error' => 'Invalid product ID'));
        }
        
        // Agregar al carrito
        $cart_item_key = WC()->cart->add_to_cart(
            $product_id,
            $quantity,
            0, // variation ID
            array(), // variation data
            array(
                'calculator_data' => json_decode(stripslashes($calculator_data), true)
            )
        );
        
        if (is_wp_error($cart_item_key)) {
            wp_send_json_error(array('error' => $cart_item_key->get_error_message()));
        }
        
        // Obtener datos del carrito para la respuesta
        $cart = WC()->cart;
        $fragments = WC()->cart->get_cart();
        
        wp_send_json_success(array(
            'cart_hash' => WC()->cart->get_cart_hash(),
            'cart_url' => wc_get_cart_url()
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
            // Buscar el precio en calculator_data
            if (isset($cart_item['calculator_data']['price']) && $cart_item['calculator_data']['price'] > 0) {
                $cart_item['data']->set_price($cart_item['calculator_data']['price']);
            }
        }
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
        $description = $calculator_data['description'] ?? '';
        
        if ($description) {
            // Agregar descripción después del nombre del producto
            $name .= '<div class="calculator-item-description" style="font-size: 12px; color: #666; margin-top: 4px; line-height: 1.4;">' . esc_html($description) . '</div>';
            
            // Agregar URL del cotizador como texto oculto
            if (!empty($calculator_data['cotizador_url'])) {
                $name .= '<div class="calculator-order-code" style="display: none;">' . esc_url($calculator_data['cotizador_url']) . '</div>';
            }
        }
        
        return $name;
    }
    
    /**
     * Agregar metadatos al pedido
     */
    public function add_order_item_meta($item, $cart_item_key, $values, $order) {
        if (isset($values['calculator_data'])) {
            $calculator_data = $values['calculator_data'];
            
            $item->add_meta_data('_calculator_order_code', $calculator_data['order_code'] ?? '', true);
            $item->add_meta_data('_calculator_price', $calculator_data['price'] ?? 0, true);
            $item->add_meta_data('_calculator_description', $calculator_data['description'] ?? '', true);
            $item->add_meta_data('_calculator_url', $calculator_data['cotizador_url'] ?? '', true);
        }
    }
    
    /**
     * Mostrar metadatos en el admin
     */
    public function display_order_item_meta($item_id, $item, $order) {
        $calculator_url = $item->get_meta('_calculator_url');
        $calculator_price = $item->get_meta('_calculator_price');
        
        if ($calculator_url || $calculator_price) {
            echo '<div class="calculator-order-meta" style="background: #f0f9ff; padding: 10px; margin: 8px 0; border-radius: 4px; border-left: 4px solid #3b82f6;">';
            
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
        
        $calculator_url = $cart_item['calculator_data']['cotizador_url'] ?? '';
        
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