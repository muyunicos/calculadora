/**
 * WooCommerce Cart Integration para Calculadora
 * Agrega productos al carrito con descripción personalizada y código de pedido
 */

(function($) {
    'use strict';
    
    /**
     * Función global que la calculadora llama para agregar al carrito
     * @param {Object} data - Datos del pedido calculado
     */
    window.addToCartFromCalculator = function(data) {
        console.log('🧮 Agregando al carrito:', data);
        
        // Mostrar indicador de carga
        showLoadingIndicator();
        
        // Construir la URL del cotizador con el código de pedido
        const cotizadorUrl = 'https://muyunicos.com/cotizador/?o=' + (data.orderCode || '');
        
        // Descripción personalizada del item
        const itemDescription = buildItemDescription(data);
        
        // Generar nonce
        const nonce = wc_add_to_cart_params.nonce || '';
        
        // Usar endpoint AJAX personalizado
        $.ajax({
            type: 'POST',
            url: wc_add_to_cart_params.ajax_url,
            data: {
                action: 'calculator_add_to_cart',
                product_id: wc_add_to_cart_params.product_id || 27859,
                quantity: 1,
                calculator_data: JSON.stringify({
                    order_code: data.orderCode,
                    price: data.price,
                    description: itemDescription,
                    cotizador_url: cotizadorUrl,
                    material: data.material,
                    formato: data.formato,
                    medida: data.medida,
                    quantity: data.quantity,
                    sheets: data.sheets
                }),
                nonce: nonce
            },
            success: function(response) {
                if (response.success) {
                    console.log('✅ Producto agregado al carrito');
                    hideLoadingIndicator();
                    showSuccessMessage();
                    
                    // Actualizar el carrito de WooCommerce
                    $(document.body).trigger('added_to_cart', [response.fragments, response.cart_hash]);
                    
                    // Redirigir al carrito después de un breve delay
                    setTimeout(function() {
                        window.location.href = wc_add_to_cart_params.cart_url || '/carrito/';
                    }, 1000);
                } else {
                    console.error('❌ Error al agregar al carrito:', response);
                    hideLoadingIndicator();
                    showErrorMessage(response.data?.error || 'Error al agregar al carrito');
                }
            },
            error: function(xhr, status, error) {
                console.error('❌ Error AJAX:', error);
                console.error('Response:', xhr.responseText);
                hideLoadingIndicator();
                showErrorMessage('Error de comunicación con el servidor');
            }
        });
    };
    
    /**
     * Construir descripción personalizada del item
     */
    function buildItemDescription(data) {
        const parts = [];
        
        if (data.material) {
            parts.push(`Material: ${data.material}`);
        }
        
        if (data.formato) {
            parts.push(`Formato: ${data.formato}`);
        }
        
        if (data.medida) {
            parts.push(`Medida: ${data.medida}`);
        }
        
        if (data.quantity) {
            parts.push(`Cantidad: ~${data.quantity} unidades`);
        }
        
        if (data.sheets) {
            parts.push(`Planchas: ${data.sheets}`);
        }
        
        return parts.join(' | ');
    }
    
    /**
     * Mostrar indicador de carga
     */
    function showLoadingIndicator() {
        if ($('.calculator-cart-loading').length === 0) {
            $('body').append('<div class="calculator-cart-loading" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);"><div style="background:white;padding:32px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.2);text-align:center;"><div class="spinner" style="width:48px;height:48px;border:4px solid #f3f3f3;border-top:4px solid #10b981;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px;"></div><div style="color:#374151;font-weight:600;">Agregando al carrito...</div></div></div>');
            
            if (!$('style[data-calculator-spinner]').length) {
                $('head').append('<style data-calculator-spinner>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>');
            }
        }
        
        $('.calculator-cart-loading').fadeIn(200);
    }
    
    /**
     * Ocultar indicador de carga
     */
    function hideLoadingIndicator() {
        $('.calculator-cart-loading').fadeOut(200, function() {
            $(this).remove();
        });
    }
    
    /**
     * Mostrar mensaje de éxito
     */
    function showSuccessMessage() {
        if ($('.calculator-success-message').length === 0) {
            $('body').append('<div class="calculator-success-message" style="position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:16px 24px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:100000;display:none;"><div style="display:flex;align-items:center;gap-12px;"><svg style="width:24px;height:24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span style="font-weight:600;">¡Agregado al carrito!</span></div></div>');
            
            if (!$('style[data-calculator-slideIn]').length) {
                $('head').append('<style data-calculator-slideIn>@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}</style>');
            }
        }
        
        $('.calculator-success-message').fadeIn().delay(2000).fadeOut(function() {
            $(this).remove();
        });
    }
    
    /**
     * Mostrar mensaje de error
     */
    function showErrorMessage(message) {
        if ($('.calculator-error-message').length === 0) {
            $('body').append('<div class="calculator-error-message" style="position:fixed;top:20px;right:20px;background:#ef4444;color:white;padding:16px 24px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:100000;display:none;"><div style="display:flex;align-items:center;gap-12px;"><svg style="width:24px;height:24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg><span style="font-weight:600;">' + message + '</span></div></div>');
        }
        
        $('.calculator-error-message').fadeIn().delay(3000).fadeOut(function() {
            $(this).remove();
        });
    }
    
    /**
     * Inicialización cuando el documento está listo
     */
    $(document).ready(function() {
        console.log('🧮 Integración Carrito-WooCommerce cargada');
    });
    
})(jQuery);