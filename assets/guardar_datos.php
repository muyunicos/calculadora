<?php
/**
 * Endpoint de guardado de la configuracion de la Calculadora de Stickers.
 *
 * El frontend (admin) hace POST con JSON { config, materials, shapesCatalog } y
 * este script lo persiste en datos_config.json, en el mismo directorio.
 *
 * Seguridad: el archivo queda accesible directo en /assets/guardar_datos.php, por
 * eso bootstrapea WordPress y exige capacidad de admin (manage_options). El cookie
 * de sesion viaja porque el fetch del front es del mismo dominio.
 *
 * La logica de validacion y escritura vive en mu_sticker_save_config() para poder
 * testearla sin WordPress (define MU_STICKER_TEST antes de incluir este archivo).
 */

/**
 * Valida el payload y lo escribe de forma atomica en $targetFile.
 *
 * @param string $raw        Cuerpo crudo del request (JSON).
 * @param string $targetFile Ruta absoluta del datos_config.json a escribir.
 * @return array{0:int,1:array} [codigoHttp, cuerpoRespuesta]
 */
function mu_sticker_save_config($raw, $targetFile) {
    if ($raw === '' || $raw === false || $raw === null) {
        return array(400, array('ok' => false, 'error' => 'Cuerpo vacio.'));
    }

    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
        return array(400, array('ok' => false, 'error' => 'JSON invalido.'));
    }

    // Estructura esperada: { config: object, materials: array, shapesCatalog: object, shapesShowMoreIndex?: object, gallery?: array }.
    if (!isset($data['config']) || !is_array($data['config'])) {
        return array(422, array('ok' => false, 'error' => 'Falta "config".'));
    }
    if (!isset($data['materials']) || !is_array($data['materials']) || array_values($data['materials']) !== $data['materials']) {
        return array(422, array('ok' => false, 'error' => '"materials" debe ser una lista.'));
    }
    if (!isset($data['shapesCatalog']) || !is_array($data['shapesCatalog'])) {
        return array(422, array('ok' => false, 'error' => 'Falta "shapesCatalog".'));
    }

    // Persistimos solo las claves conocidas para no guardar basura extra.
    $clean = array(
        'config'        => $data['config'],
        'materials'     => array_values($data['materials']),
        'shapesCatalog' => $data['shapesCatalog'],
    );

    // Incluir shapesShowMoreIndex si está presente y válido
    if (isset($data['shapesShowMoreIndex']) && is_array($data['shapesShowMoreIndex'])) {
        $validatedIndex = array();
        foreach ($data['shapesShowMoreIndex'] as $category => $idx) {
            if (is_string($category) && is_numeric($idx)) {
                $idx = intval($idx);
                // Validar que el índice esté en rango [0, cantidad de items en la categoría]
                $categorySize = isset($data['shapesCatalog'][$category]) ? count($data['shapesCatalog'][$category]) : 0;
                if ($idx >= 0 && $idx <= $categorySize) {
                    $validatedIndex[$category] = $idx;
                }
            }
        }
        if (!empty($validatedIndex)) {
            $clean['shapesShowMoreIndex'] = $validatedIndex;
        }
    }

    // Incluir gallery si está presente
    if (isset($data['gallery']) && is_array($data['gallery'])) {
        $clean['gallery'] = $data['gallery'];
    }

    $json = json_encode($clean, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return array(500, array('ok' => false, 'error' => 'No se pudo serializar el JSON.'));
    }

    $dir = dirname($targetFile);
    if (!is_writable($dir) || (file_exists($targetFile) && !is_writable($targetFile))) {
        return array(500, array('ok' => false, 'error' => 'El archivo de config no es escribible.'));
    }

    // Escritura atomica: archivo temporal + rename en el mismo directorio.
    $tmp = tempnam($dir, 'cfg_');
    if ($tmp === false || file_put_contents($tmp, $json, LOCK_EX) === false) {
        if ($tmp !== false) { @unlink($tmp); }
        return array(500, array('ok' => false, 'error' => 'No se pudo escribir el archivo temporal.'));
    }
    if (!rename($tmp, $targetFile)) {
        @unlink($tmp);
        return array(500, array('ok' => false, 'error' => 'No se pudo reemplazar la config.'));
    }
    @chmod($targetFile, 0644);

    return array(200, array('ok' => true));
}

/**
 * Localiza wp-load.php subiendo directorios desde $start.
 *
 * @return string|null Ruta a wp-load.php o null si no se encuentra.
 */
function mu_sticker_find_wp_load($start) {
    $dir = $start;
    for ($i = 0; $i < 10; $i++) {
        $candidate = $dir . '/wp-load.php';
        if (file_exists($candidate)) {
            return $candidate;
        }
        $parent = dirname($dir);
        if ($parent === $dir) {
            break; // Llegamos a la raiz del filesystem.
        }
        $dir = $parent;
    }
    return null;
}

// --- EJECUCION ---
// Se omite cuando el archivo se incluye en un test (MU_STICKER_TEST definido).
if (!defined('MU_STICKER_TEST')) {

    header('Content-Type: application/json; charset=utf-8');

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('ok' => false, 'error' => 'Metodo no permitido.'));
        exit;
    }

    $wpLoad = mu_sticker_find_wp_load(__DIR__);
    if ($wpLoad === null) {
        http_response_code(500);
        echo json_encode(array('ok' => false, 'error' => 'No se pudo cargar WordPress.'));
        exit;
    }
    require_once $wpLoad;

    if (!function_exists('current_user_can') || !current_user_can('manage_options')) {
        http_response_code(403);
        echo json_encode(array('ok' => false, 'error' => 'No autorizado.'));
        exit;
    }

    list($code, $body) = mu_sticker_save_config(
        file_get_contents('php://input'),
        __DIR__ . '/datos_config.json'
    );
    http_response_code($code);
    echo json_encode($body);
    exit;
}
