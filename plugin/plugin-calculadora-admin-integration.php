<?php
/**
 * Plugin Name: Calculadora Admin - Media Library Integration
 * Description: Carga los scripts de WordPress Media Library para el panel de administración de la calculadora
 * Version: 1.0
 * Author: Tu Nombre
 * Requires at least: 5.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class CalculadoraAdminIntegration {
    
    private $target_product_id = 27859; // ID del producto donde está la calculadora
    
    public function __construct() {
        // Cargar scripts de media uploader en el admin de WordPress cuando se edita el producto
        add_action('admin_enqueue_scripts', array($this, 'enqueue_media_scripts'));
        
        // También cargar en el frontend si el usuario es admin y está en la página del producto
        add_action('wp_enqueue_scripts', array($this, 'enqueue_media_scripts_frontend'));
    }
    
    /**
     * Cargar scripts de media uploader en el admin de WordPress
     */
    public function enqueue_media_scripts($hook) {
        // Solo cargar en la página de edición del producto específico
        if ($hook === 'post.php' || $hook === 'post-new.php') {
            global $post;
            if ($post && $post->ID === $this->target_product_id) {
                wp_enqueue_media();
            }
        }
    }
    
    /**
     * Cargar scripts de media uploader en el frontend para admins
     */
    public function enqueue_media_scripts_frontend() {
        // Solo cargar si el usuario es admin y está en la página del producto
        if (!current_user_can('manage_options')) {
            return;
        }
        
        if (!is_product() || get_the_ID() !== $this->target_product_id) {
            return;
        }
        
        // Cargar scripts de media uploader de WordPress
        wp_enqueue_media();
        
        // Asegurar que los estilos de media uploader también se carguen
        wp_enqueue_style('wp-mediaelement');
    }
}

// Inicializar el plugin
add_action('plugins_loaded', function() {
    new CalculadoraAdminIntegration();
});
