<?php
/**
 * Runner de paridad: imprime en JSON el precio que calcula el motor PHP del
 * carrito para un código de pedido v1.
 *
 * Uso: php tests/precio-paridad.php "v1.m10.s50.q5.f1.d0.c7"
 * Salida: {"price":...} o null.
 */

define('ABSPATH', __DIR__ . '/');

require __DIR__ . '/../woocommerce-plugin/calculadora-pricing.php';

$code = isset($argv[1]) ? (string) $argv[1] : '';
// Segundo argumento opcional: JSON con overrides de `config` (spec 038, promos).
// Sin el, se usa el datos_config.json real (comportamiento historico).
$pricing = mu_calc_price_from_code($code);
$override = isset($argv[2]) ? json_decode((string) $argv[2], true) : null;
if (is_array($override) && $pricing !== null) {
    $config = mu_calc_load_config();
    if ($config !== null) {
        $config['config'] = array_replace((array) $config['config'], (array) $override);
        $order = mu_calc_decode_order($code, $config);
        if ($order !== null) {
            $pricing = mu_calc_compute_price($order, $config);
        }
    }
}

echo json_encode($pricing === null ? null : $pricing);