/**
 * Integration.js - Calculadora WooCommerce Integration
 * Conecta la calculadora con WooCommerce para actualización de precios en tiempo real
 */

(function($) {
    'use strict';
    
    /**
     * Función global que la calculadora llama
     * Esta función es invocada desde OrderSummary.tsx y MobileSummaryBar.tsx
     */
    window.updateWooCommercePrice = function(price) {
        console.log('🧮 Calculadora: Actualizando precio de WooCommerce:', price);
        
        // Validar que el precio sea un número válido
        if (typeof price !== 'number' || isNaN(price) || price < 0) {
            console.error('❌ Precio inválido:', price);
            return false;
        }
        
        // Mostrar indicador de carga
        showLoadingIndicator();
        
        // Llamada AJAX para actualizar el precio
        $.ajax({
            url: calculatorData.ajaxUrl,
            type: 'POST',
            data: {
                action: 'update_calculator_price',
                price: price,
                product_id: calculatorData.productId,
                nonce: calculatorData.nonce
            },
            success: function(response) {
                if (response.success) {
                    console.log('✅ Precio actualizado correctamente:', response.data);
                    updatePriceDisplay(response.data);
                    hideLoadingIndicator();
                    showSuccessMessage();
                } else {
                    console.error('❌ Error en respuesta del servidor:', response);
                    hideLoadingIndicator();
                    showErrorMessage('Error al actualizar precio');
                }
            },
            error: function(xhr, status, error) {
                console.error('❌ Error AJAX:', error);
                hideLoadingIndicator();
                showErrorMessage('Error de comunicación');
            }
        });
        
        return true;
    };
    
    /**
     * Actualizar el display del precio en la página
     */
    function updatePriceDisplay(data) {
        // Actualizar precio principal de WooCommerce
        $('.price .amount').each(function() {
            const $this = $(this);
            $this.text(data.formatted);
            $this.closest('.price').addClass('price-updated calculator-active');
        });
        
        // Actualizar precio en variaciones si existen
        $('.woocommerce-variation-price .amount').text(data.formatted);
        
        // Actualizar precio en botón de agregar al carrito
        $('.single_add_to_cart_button').attr('data-price', data.price);
        
        // Efecto visual de actualización
        $('.price').addClass('price-flash');
        setTimeout(function() {
            $('.price').removeClass('price-flash');
        }, 500);
        
        // Remover clase de actualización después de 2 segundos
        setTimeout(function() {
            $('.price').removeClass('price-updated');
        }, 2000);
    }
    
    /**
     * Mostrar indicador de carga
     */
    function showLoadingIndicator() {
        if ($('.calculator-loading').length === 0) {
            $('body').append('<div class="calculator-loading" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.3);z-index:9999;display:flex;align-items:center;justify-content:center;"><div style="background:white;padding:20px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);"><div style="width:40px;height:40px;border:4px solid #f3f3f3;border-top:4px solid #3498db;border-radius:50%;animation:spin 1s linear infinite;"></div></div></div>');
            
            // Agregar animación CSS
            if (!$('style[data-calculator-spinner]').length) {
                $('head').append('<style data-calculator-spinner>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>');
            }
        }
        
        $('.calculator-loading').fadeIn(200);
    }
    
    /**
     * Ocultar indicador de carga
     */
    function hideLoadingIndicator() {
        $('.calculator-loading').fadeOut(200, function() {
            $(this).remove();
        });
    }
    
    /**
     * Mostrar mensaje de éxito
     */
    function showSuccessMessage() {
        if ($('.calculator-success-message').length === 0) {
            $('.price').after('<div class="calculator-success-message" style="background:#4caf50;color:white;padding:10px 15px;border-radius:4px;margin-top:10px;font-size:14px;display:none;">✓ Precio actualizado correctamente</div>');
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
            $('.price').after('<div class="calculator-error-message" style="background:#f44336;color:white;padding:10px 15px;border-radius:4px;margin-top:10px;font-size:14px;display:none;">✗ ' + message + '</div>');
        }
        
        $('.calculator-error-message').fadeIn().delay(3000).fadeOut(function() {
            $(this).remove();
        });
    }
    
    /**
     * Inicialización cuando el documento está listo
     */
    $(document).ready(function() {
        console.log('🧮 Integración Calculadora-WooCommerce cargada');
        
        // Verificar que los datos necesarios estén disponibles
        if (typeof calculatorData === 'undefined') {
            console.error('❌ calculatorData no está definido');
            return;
        }
        
        // Verificar que la función de la calculadora esté disponible
        if (typeof window.updateWooCommercePrice === 'undefined') {
            console.warn('⚠️ window.updateWooCommercePrice no está disponible aún');
        }
        
        // Interceptar envío del formulario para asegurar que el precio calculado se envíe
        $('form.cart').on('submit', function(e) {
            const calculatorPrice = WC()?.session?.get('calculator_price_' + calculatorData.productId);
            if (calculatorPrice && calculatorPrice > 0) {
                console.log('🧮 Enviando pedido con precio calculado:', calculatorPrice);
                // El precio ya está guardado en sesión, WooCommerce lo usará automáticamente
            }
        });
        
        // Manejar cambios en variaciones de producto si existen
        $('.variations_form').on('found_variation', function(event, variation) {
            // Si hay variaciones, el precio puede cambiar, pero el calculado tiene prioridad
            console.log('🧮 Variación detectada, pero manteniendo precio calculado');
        });
        
        // Debug: Mostrar información de la integración
        if (window.location.search.includes('debug_calc=true')) {
            console.group('🧮 Debug Calculadora Integration');
            console.log('Product ID:', calculatorData.productId);
            console.log('AJAX URL:', calculatorData.ajaxUrl);
            console.log('Session Price:', WC()?.session?.get('calculator_price_' + calculatorData.productId));
            console.groupEnd();
        }
    });
    
    // Soporte para WooCommerce actualizado
    window.WC = window.WC || {};
    
})(jQuery);