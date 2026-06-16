<?php
/**
 * Plugin Name: Calculadora AJAX Integration for WooCommerce
 * Description: Integración vía AJAX para actualizar precio de producto desde calculadora en tiempo real
 * Version: 1.0
 * Author: Tu Nombre
 * Requires PHP: 7.4+
 * Requires at least: 5.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class CalculadoraAjaxIntegration {
    
    private $plugin_version = '1.0';
    private $target_product_id = 27859; // ID del producto donde está la calculadora
    
    public function __construct() {
        // Scripts y estilos
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('wp_head', array($this, 'add_inline_styles'));
        
        // Endpoint AJAX
        add_action('wp_ajax_update_calculator_price', array($this, 'update_price_ajax'));
        add_action('wp_ajax_nopriv_update_calculator_price', array($this, 'update_price_ajax'));
        
        // Integración con WooCommerce
        add_action('woocommerce_add_to_cart', array($this, 'save_calculator_price'), 10, 6);
        add_action('woocommerce_before_calculate_totals', array($this, 'apply_calculator_price'), 10, 1);
        
        // Modificar display del precio
        add_filter('woocommerce_get_price_html', array($this, 'custom_price_display'), 10, 2);
        
        // Metadatos en el pedido
        add_action('woocommerce_checkout_create_order_line_item', array($this, 'add_order_item_meta'), 10, 4);
        
        // Mostrar metadatos en admin
        add_action('woocommerce_order_item_meta_end', array($this, 'display_order_item_meta'), 10, 3);
    }
    
    /**
     * Enqueue scripts y estilos
     */
    public function enqueue_scripts() {
        // Solo cargar en el producto específico con la calculadora
        if (!is_product() || get_the_ID() !== $this->target_product_id) {
            return;
        }
        
        wp_enqueue_script(
            'calculadora-integration',
            plugin_dir_url(__FILE__) . 'integration.js',
            array('jquery'),
            $this->plugin_version,
            true
        );
        
        wp_localize_script('calculadora-integration', 'calculatorData', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'productId' => $this->target_product_id,
            'nonce' => wp_create_nonce('calculator_nonce')
        ));
        
        wp_enqueue_style(
            'calculadora-integration-styles',
            plugin_dir_url(__FILE__) . 'integration.css',
            array(),
            $this->plugin_version
        );
    }
    
    /**
     * Estilos inline para GeneratePress
     */
    public function add_inline_styles() {
        if (!is_product()) {
            return;
        }
        ?>
        <style>
        /* Animación cuando el precio se actualiza */
        .price-updated {
            transition: all 0.3s ease;
            transform: scale(1.02);
            background-color: #e8f5e9;
            padding: 8px 12px;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .price-updated .amount {
            color: #2e7d32 !important;
            font-weight: bold;
        }

        @keyframes priceFlash {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
            100% { opacity: 1; transform: scale(1); }
        }

        .price-flash {
            animation: priceFlash 0.5s ease-in-out;
        }

        /* Contenedor de calculadora en GeneratePress */
        #mu-sticker-calculator-root {
            margin: 20px 0;
            max-width: 100%;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        /* Responsive */
        @media (max-width: 768px) {
            #mu-sticker-calculator-root {
                margin: 10px 0;
            }
            
            .price-updated {
                padding: 6px 10px;
                font-size: 0.9em;
            }
        }

        /* Integración con diseño de WooCommerce */
        .woocommerce-page #mu-sticker-calculator-root {
            margin: 30px auto;
            max-width: 1200px;
        }

        /* Indicador de precio personalizado */
        .calculator-custom-price {
            display: none;
        }
        
        .price.calculator-active .calculator-custom-price {
            display: block;
            color: #2e7d32;
            font-size: 0.85em;
            margin-top: 5px;
        }
        </style>
        <?php
    }
    
    /**
     * Endpoint AJAX para actualizar precio
     */
    public function update_price_ajax() {
        // Verificar nonce
        if (!check_ajax_referer('calculator_nonce', 'nonce', false)) {
            wp_send_json_error('Invalid nonce');
        }
        
        $price = isset($_POST['price']) ? floatval($_POST['price']) : 0;
        $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
        
        // Verificar que sea el producto correcto
        if ($product_id !== $this->target_product_id) {
            wp_send_json_error('Invalid product ID');
        }
        
        // Validar precio
        if ($price < 0) {
            wp_send_json_error('Invalid price');
        }
        
        // Guardar en sesión de WooCommerce
        if (WC()->session) {
            WC()->session->set('calculator_price_' . $product_id, $price);
            WC()->session->set('calculator_product_id', $product_id);
        }
        
        wp_send_json_success(array(
            'price' => $price,
            'formatted' => wc_price($price)
        ));
    }
    
    /**
     * Guardar precio cuando se agrega al carrito
     */
    public function save_calculator_price($cart_item_key, $product_id, $quantity, $variation_id, $variation, $cart_item_data) {
        // Solo aplicar para el producto específico
        if ($product_id !== $this->target_product_id) {
            return $cart_item_data;
        }
        
        $price = WC()->session ? WC()->session->get('calculator_price_' . $product_id) : null;
        
        if ($price && $price > 0) {
            $cart_item_data['calculator_price'] = $price;
            $cart_item_data['calculator_product_id'] = $product_id;
        }
        
        return $cart_item_data;
    }
    
    /**
     * Aplicar precio calculado en carrito
     */
    public function apply_calculator_price($cart) {
        if (is_admin() && !defined('DOING_AJAX')) {
            return;
        }
        
        foreach ($cart->get_cart() as $cart_item_key => $cart_item) {
            if (isset($cart_item['calculator_price']) && $cart_item['calculator_price'] > 0) {
                $cart_item['data']->set_price($cart_item['calculator_price']);
                $cart_item['data']->set_custom_price($cart_item['calculator_price']);
            }
        }
    }
    
    /**
     * Modificar display del precio
     */
    public function custom_price_display($price, $product) {
        $product_id = $product->get_id();
        $calculator_price = WC()->session ? WC()->session->get('calculator_price_' . $product_id) : null;
        
        if ($calculator_price && $calculator_price > 0) {
            $formatted_calculator_price = wc_price($calculator_price);
            return '<span class="calculator-custom-price">Precio calculado: ' . $formatted_calculator_price . '</span>' . $price;
        }
        
        return $price;
    }
    
    /**
     * Agregar metadatos al item del pedido
     */
    public function add_order_item_meta($item, $cart_item_key, $values, $order) {
        if (isset($values['calculator_price'])) {
            $item->add_meta_data('_calculator_price', $values['calculator_price'], true);
            $item->add_meta_data('_calculator_product_id', $values['calculator_product_id'], true);
        }
    }
    
    /**
     * Mostrar metadatos en el admin
     */
    public function display_order_item_meta($item_id, $item, $order) {
        $calculator_price = $item->get_meta('_calculator_price');
        
        if ($calculator_price) {
            echo '<div class="calculator-price-meta" style="background: #e8f5e9; padding: 8px; margin: 5px 0; border-radius: 4px;">';
            echo '<strong>Precio Calculado:</strong> ' . wc_price($calculator_price);
            echo '</div>';
        }
    }
}

// Inicializar el plugin
add_action('plugins_loaded', function() {
    if (class_exists('WooCommerce')) {
        new CalculadoraAjaxIntegration();
    }
});