/**
 * Contrato del carrito (spec 038, F-COD).
 *
 * El bundle manda `calculator_data` en camelCase (`orderCode`, `cotizadorUrl`) y el
 * PHP del carrito leia SOLO snake_case (`order_code`, `cotizador_url`): la compra
 * fallaba SIEMPRE con "Falta el codigo de pedido". Se deja UNA sola forma (la del
     * bundle), sin repliegues: el contrato es uno.
 *
 * Uso: node tests/carrito-contrato.test.js
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const php = fs.readFileSync(path.join(raiz, 'woocommerce-plugin', 'plugin-calculadora-cart-integration.php'), 'utf8');
const js = fs.readFileSync(path.join(raiz, 'woocommerce-plugin', 'cart-integration.js'), 'utf8');

const resultados = [];
function check(nombre, ok, detalle) {
    resultados.push({ nombre, ok: !!ok, detalle: detalle === undefined ? '' : String(detalle) });
    console.log((ok ? '  OK   ' : '  FALLA') + ' ' + nombre + (detalle !== undefined ? ' | ' + detalle : ''));
}
function grupo(texto) { console.log('== ' + texto + ' =='); }

grupo('El cliente manda camelCase');
check('cart-integration.js manda orderCode', /orderCode/.test(js));
check('cart-integration.js manda cotizadorUrl', /cotizadorUrl/.test(js));

grupo('El PHP lee exactamente esas claves');
check('lee orderCode del payload', /isset\(\$decoded_data\['orderCode'\]\)/.test(php));
check('ya NO lee order_code del payload', !/isset\(\$decoded_data\['order_code'\]\)/.test(php));
check('cotizador_url sale de cotizadorUrl', /isset\(\$decoded_data\['cotizadorUrl'\]\)/.test(php));
check('el nombre del item usa cotizadorUrl', /esc_url\(\$calculator_data\['cotizadorUrl'\]\)/.test(php));
check('_calculator_order_code usa orderCode', /_calculator_order_code', \$calculator_data\['orderCode'\]/.test(php));
check('_calculator_url usa cotizadorUrl', /_calculator_url', \$calculator_data\['cotizadorUrl'\]/.test(php));
check('la ficha del admin usa cotizadorUrl', /calculator_data'\]\['cotizadorUrl'\]/.test(php));
check('version del plugin subio (cache-bust)', /Version: 1\.[2-9]/.test(php) && /'1\.[2-9]'/.test(php));

const fallos = resultados.filter((r) => !r.ok).length;
console.log('\n' + (fallos ? 'CARRITO CONTRATO: ' + fallos + ' fallo(s)' : 'CARRITO CONTRATO OK (' + resultados.length + ' checks)'));
process.exit(fallos ? 1 : 0);