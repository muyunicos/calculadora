<?php
/**
 * Endpoint con ETag para servir datos_config.json con caché inteligente.
 * 
 * Este endpoint implementa validación condicional usando ETag:
 * - Si el archivo no cambió, devuelve 304 Not Modified (casi sin CPU)
 * - Si el archivo cambió, devuelve el contenido nuevo
 * - Cache-Control de 1 minuto para permitir caché intermedia
 * 
 * Esto reduce significativamente el consumo de CPU del servidor mientras
 * asegura que los cambios de precios sean visibles en máximo 1 minuto.
 */

$configFile = __DIR__ . '/datos_config.json';

// Verificar que el archivo exista
if (!file_exists($configFile)) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'datos_config.json no encontrado']);
    exit;
}

// Generar ETag basado en el contenido del archivo
$etag = md5_file($configFile);

// Configurar headers de caché
header("ETag: \"$etag\"");
header("Cache-Control: public, max-age=60"); // 1 minuto de caché
header('Content-Type: application/json; charset=utf-8');

// Validar If-None-Match del cliente para ver si tiene la versión más reciente
if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && 
    trim($_SERVER['HTTP_IF_NONE_MATCH'], '"') === $etag) {
    // El cliente ya tiene la versión más reciente
    http_response_code(304);
    exit;
}

// Si llegamos aquí, el cliente necesita el contenido actual
readfile($configFile);
