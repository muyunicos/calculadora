<?php
/**
 * Test de integración del endpoint de guardado (sin WordPress).
 *
 * Recibe el JSON por stdin, lo pasa por mu_sticker_save_config() y devuelve
 * { code, body, written } donde `written` es el archivo resultante (o null).
 *
 * Uso: echo '<json>' | php tests/guardar-paridad.php
 */

define('MU_STICKER_TEST', 1);

require __DIR__ . '/../assets/guardar_datos.php';

$json = stream_get_contents(STDIN);
$dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'mu_calc_test_' . uniqid();
mkdir($dir);
$target = $dir . DIRECTORY_SEPARATOR . 'datos_config.json';

list($code, $body) = mu_sticker_save_config($json, $target);

$written = file_exists($target) ? json_decode(file_get_contents($target), true) : null;

// Limpieza del directorio temporal.
if (file_exists($target)) {
    @unlink($target);
}
if (file_exists($target . '.bak')) {
    @unlink($target . '.bak');
}
@rmdir($dir);

echo json_encode(array('code' => $code, 'body' => $body, 'written' => $written));