<?php
/**
 * Puente de guardado para la Calculadora de Stickers.
 * Ubicación: wp-content/themes/<tu-tema>/assets/guardar_datos.php
 * Escribe en el mismo directorio: datos_config.json
 *
 * Seguridad: solo administradores de WordPress (manage_options) pueden escribir.
 * La lectura la hace React directamente sobre datos_config.json (público).
 */

// Buscar wp-load.php subiendo directorios (robusto ante la profundidad del tema).
$dir = __DIR__;
$wp_load = '';
for ($i = 0; $i < 10; $i++) {
    if (file_exists($dir . '/wp-load.php')) {
        $wp_load = $dir . '/wp-load.php';
        break;
    }
    $parent = dirname($dir);
    if ($parent === $dir) break; // llegamos a la raíz del filesystem
    $dir = $parent;
}

if ($wp_load === '') {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['status' => 'error', 'message' => 'No se encontró wp-load.php']);
    exit;
}
require_once($wp_load);

header('Content-Type: application/json; charset=utf-8');

// Solo POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido']);
    exit;
}

// 1. Verificar que sea un administrador con sesión iniciada
if (!is_user_logged_in() || !current_user_can('manage_options')) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Acceso denegado']);
    exit;
}

// 2. Recibir y validar el JSON
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'JSON inválido']);
    exit;
}

// 3. Validar estructura mínima esperada ({ config, materials, shapesCatalog })
if (!isset($data['config']) || !isset($data['materials']) || !isset($data['shapesCatalog'])) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'Faltan campos: config, materials o shapesCatalog']);
    exit;
}

// 4. Escribir el archivo de forma atómica (tmp + rename) en el mismo directorio
$target = __DIR__ . '/datos_config.json';
$tmp    = $target . '.tmp';
$json   = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

if ($json === false || file_put_contents($tmp, $json, LOCK_EX) === false || !rename($tmp, $target)) {
    @unlink($tmp);
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'No se pudo escribir el archivo']);
    exit;
}

echo json_encode(['status' => 'success']);
