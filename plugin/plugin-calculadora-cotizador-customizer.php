<?php
/**
 * Plugin Name: Calculadora Cotizador - Product Page Customizer
 * Description: Personaliza la página del producto Cotizador (27859) ocultando elementos de WooCommerce
 * Version: 1.0
 * Author: Tu Nombre
 * Requires at least: 5.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class CalculadoraCotizadorCustomizer {
    
    private $target_product_id = 27859; // ID del producto Cotizador
    
    public function __construct() {
        // CSS para ocultar elementos del producto Cotizador
        add_action('wp_head', array($this, 'add_hide_styles'));
        
        // Modificar el botón de "Editar" en el carrito para redirigir al cotizador
        add_filter('woocommerce_cart_item_name', array($this, 'add_edit_link'), 10, 3);
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
    
    /**
     * Agregar botón de editar en el carrito para items del Cotizador
     */
    public function add_edit_link($name, $cart_item, $cart_item_key) {
        // Solo modificar items del producto Cotizador
        if ($cart_item['product_id'] == $this->target_product_id) {
            // Intentar obtener el código de pedido de los metadatos
            $order_code = wc_get_order_item_meta($cart_item_key, '_calculator_order_code', true);
            
            if ($order_code) {
                $cotizador_url = 'https://muyunicos.com/cotizador/?o=' . $order_code;
                $edit_link = '<a href="' . esc_url($cotizador_url) . '" style="font-size: 11px; padding: 4px 8px; margin-left: 8px; background: #10b981; color: white; border: none; border-radius: 3px; text-decoration: none; line-height: 1;">✏️ Editar</a>';
                return $name . $edit_link;
            }
        }
        
        return $name;
    }
}

// Inicializar el plugin
add_action('plugins_loaded', function() {
    new CalculadoraCotizadorCustomizer();
});