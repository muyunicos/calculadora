/**
 * WooCommerce Cart Integration para la Calculadora de Stickers.
 *
 * El precio NO se toma del navegador: el servidor lo recalcula a partir del
 * código de pedido. Acá solo se envía el código + datos de presentación.
 *
 * Config en window.muCalcCart (inyectada por el plugin). Ya NO se usa
 * `wc_add_to_cart_params`: ese objeto es de WooCommerce y pisarlo rompe su
 * add-to-cart AJAX.
 */
(function ($) {
    'use strict';

    function getConfig() {
        return window.muCalcCart || {};
    }

    // El nonce embebido en el HTML vence (24 h) y el HTML puede venir de caché.
    function refreshNonce() {
        var config = getConfig();
        return $.ajax({
            type: 'POST',
            url: config.ajax_url,
            dataType: 'json',
            data: { action: config.nonce_action || 'mu_calc_cart_nonce' }
        }).then(function (response) {
            if (response && response.success && response.data && response.data.nonce) {
                if (window.muCalcCart) {
                    window.muCalcCart.nonce = response.data.nonce;
                }
                return response.data.nonce;
            }
            return '';
        });
    }

    function addToCartRequest(data, nonce) {
        var config = getConfig();
        var payload = $.extend({}, data, {
            description: data.description || buildItemDescription(data)
        });
        return $.ajax({
            type: 'POST',
            url: config.ajax_url,
            dataType: 'json',
            data: {
                action: 'calculator_add_to_cart',
                product_id: config.product_id || 0,
                quantity: 1,
                calculator_data: JSON.stringify(payload),
                nonce: nonce || ''
            }
        });
    }

    /**
     * Función global que la calculadora llama para agregar al carrito.
     * @param {Object} data - { orderCode, cotizadorUrl, material, formato, medida }
     */
    window.addToCartFromCalculator = function (data) {
        if (!data || !data.orderCode) {
            showErrorMessage('Falta el código del pedido. Volvé a configurarlo e intentá de nuevo.');
            return;
        }

        showLoadingIndicator();

        function handleResponse(response) {
            if (response && response.success) {
                hideLoadingIndicator();
                showSuccessMessage();
                var payload = response.data || {};
                // Fragments reales: el servidor ahora devuelve el HTML del mini-carrito.
                $(document.body).trigger('added_to_cart', [payload.fragments || {}, payload.cart_hash || '']);
                var cartUrl = payload.cart_url || getConfig().cart_url || '/carrito/';
                setTimeout(function () {
                    window.location.href = cartUrl;
                }, 1000);
                return;
            }
            hideLoadingIndicator();
            var message = response && response.data && response.data.error
                ? response.data.error
                : 'No se pudo agregar al carrito.';
            showErrorMessage(message);
        }

        function handleFailure(xhr) {
            hideLoadingIndicator();
            if (window.console) {
                console.error('Error AJAX al agregar al carrito', xhr && xhr.responseText);
            }
            showErrorMessage('Error de comunicación con el servidor.');
        }

        addToCartRequest(data, getConfig().nonce).done(function (response) {
            var invalidNonce = response && !response.success && response.data && response.data.code === 'invalid_nonce';
            if (!invalidNonce) {
                handleResponse(response);
                return;
            }

            // Nonce vencido: pedir uno nuevo y reintentar una sola vez.
            refreshNonce().then(function (fresh) {
                if (!fresh) {
                    showErrorMessage('La sesión expiró. Recargá la página e intentá de nuevo.');
                    return;
                }
                addToCartRequest(data, fresh).done(handleResponse).fail(handleFailure);
            }).fail(handleFailure);
        }).fail(handleFailure);
    };

    /** Descripción del item (texto plano; el servidor la escapa al mostrarla). */
    function buildItemDescription(data) {
        var parts = [];

        if (data.material) {
            parts.push('Material: ' + data.material);
        }
        if (data.formato) {
            parts.push('Formato: ' + data.formato);
        }
        if (data.medida) {
            parts.push('Medida: ' + data.medida);
        }
        if (data.quantity) {
            parts.push('Unidades: ' + data.quantity);
        }
        if (data.sheets) {
            parts.push('Planchas: ' + data.sheets);
        }
        if (data.orderCode) {
            parts.push('Código: ' + data.orderCode);
        }

        return parts.join(' | ');
    }

    function ensureSpinnerStyle() {
        if (!$('style[data-calculator-spinner]').length) {
            $('head').append('<style data-calculator-spinner>@keyframes calculatorSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>');
        }
    }

    function showLoadingIndicator() {
        if ($('.calculator-cart-loading').length === 0) {
            ensureSpinnerStyle();
            var $overlay = $('<div class="calculator-cart-loading">').css({
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'none',
                alignItems: 'center', justifyContent: 'center'
            });
            var $box = $('<div>').css({
                background: 'white', padding: '32px', borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)', textAlign: 'center'
            });
            var $spinner = $('<div>').css({
                width: '48px', height: '48px', margin: '0 auto 16px',
                border: '4px solid #f3f3f3', borderTop: '4px solid #10b981',
                borderRadius: '50%', animation: 'calculatorSpin 1s linear infinite'
            });
            $box.append($spinner, $('<div>').css({ color: '#374151', fontWeight: 600 }).text('Agregando al carrito...'));
            $overlay.append($box).appendTo('body');
        }
        $('.calculator-cart-loading').css('display', 'flex').fadeIn(150);
    }

    function hideLoadingIndicator() {
        $('.calculator-cart-loading').fadeOut(150, function () {
            $(this).remove();
        });
    }

    function showSuccessMessage() {
        if ($('.calculator-success-message').length === 0) {
            var $box = $('<div class="calculator-success-message">').css({
                position: 'fixed', top: '20px', right: '20px', background: '#10b981',
                color: 'white', padding: '16px 24px', borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100000, display: 'none'
            });
            $box.append($('<div>').css({ display: 'flex', alignItems: 'center', gap: '12px' })
                .append($('<span>').css({ fontWeight: 600 }).text('¡Agregado al carrito!')));
            $box.appendTo('body');
        }
        $('.calculator-success-message').fadeIn().delay(2000).fadeOut(function () {
            $(this).remove();
        });
    }

    function showErrorMessage(message) {
        // Se construye con .text() para no inyectar HTML que venga del servidor.
        var $box = $('<div class="calculator-error-message">').css({
            position: 'fixed', top: '20px', right: '20px', background: '#ef4444',
            color: 'white', padding: '16px 24px', borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100000, display: 'none'
        });
        $box.append($('<div>').css({ display: 'flex', alignItems: 'center', gap: '12px' })
            .append($('<span>').css({ fontWeight: 600 }).text(message)));
        $box.appendTo('body').fadeIn().delay(4000).fadeOut(function () {
            $(this).remove();
        });
    }

    $(document).ready(function () {
        if (window.console && window.muCalcCart) {
            console.log('🧮 Integración Carrito-WooCommerce cargada');
        }
    });

})(jQuery);