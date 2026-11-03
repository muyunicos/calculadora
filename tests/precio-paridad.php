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
$pricing = mu_calc_price_from_code($code);

echo json_encode($pricing === null ? null : $pricing);