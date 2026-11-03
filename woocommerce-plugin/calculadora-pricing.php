<?php
/**
 * Motor de precios del lado servidor para la Calculadora de Stickers.
 *
 * Es un port fiel de src/core/priceEngine.ts + src/core/a4Layout.ts +
 * src/core/orderCodec.ts. Existe por una razón de negocio: el precio que llega
 * desde el navegador NO se puede confiar (cualquiera puede POSTear price=1).
 * El endpoint del carrito vuelve a calcular el precio a partir del código de
 * pedido (v1...) y del datos_config.json del tema.
 *
 * Si cambiás la fórmula en TypeScript, cambiala también acá: hay un test de
 * paridad en tests/precio-paridad.test.ts que compara ambos resultados.
 */

if (!defined('ABSPATH')) {
    exit;
}

/** Número finito desde un valor del JSON (acepta "12.5" y 12.5). */
function mu_calc_num($value, $fallback = 0.0) {
    return is_numeric($value) ? (float) $value : (float) $fallback;
}

function mu_calc_clamp($value, $min, $max) {
    return min($max, max($min, $value));
}

function mu_calc_round2($value) {
    return round((float) $value, 2);
}

function mu_calc_round3($value) {
    return round((float) $value, 3);
}

/**
 * Ruta del datos_config.json. Se puede sobreescribir con el filtro
 * `mu_calc_config_path` (por ejemplo, si el archivo vive en un plugin).
 */
function mu_calc_config_path() {
    $candidates = array();

    if (function_exists('get_stylesheet_directory')) {
        $candidates[] = get_stylesheet_directory() . '/assets/datos_config.json';
    }
    if (function_exists('get_template_directory')) {
        $candidates[] = get_template_directory() . '/assets/datos_config.json';
    }
    // Layout del repo (el .json está en assets/ y este archivo en woocommerce-plugin/).
    $candidates[] = dirname(__DIR__) . '/assets/datos_config.json';

    foreach ($candidates as $path) {
        if (is_string($path) && $path !== '' && is_readable($path)) {
            return $path;
        }
    }
    return '';
}

/** Configuración ya decodificada, o null si no se puede leer. */
function mu_calc_load_config() {
    $path = mu_calc_config_path();
    if (function_exists('apply_filters')) {
        $path = apply_filters('mu_calc_config_path', $path);
    }
    if (!$path || !is_readable($path)) {
        return null;
    }
    $raw = file_get_contents($path);
    if ($raw === false) {
        return null;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

/** "53x50" (mm) -> {w,h} en cm, con los mismos límites que el frontend. */
function mu_calc_parse_rect($raw) {
    $parts = explode('x', (string) $raw);
    if (count($parts) !== 2) {
        return null;
    }
    if (!is_numeric($parts[0]) || !is_numeric($parts[1])) {
        return null;
    }
    $w = ((float) $parts[0]) / 10;
    $h = ((float) $parts[1]) / 10;
    if ($w < 2 || $h < 2 || $w > 100 || $h > 100) {
        return null;
    }
    return array('w' => round($w, 1), 'h' => round($h, 1));
}

/** Cuántos stickers entran por hoja A4 (misma lógica que a4Layout.ts). */
function mu_calc_a4_layout($rawW, $rawH, $mode = 'preciso') {
    $w = is_numeric($rawW) ? (float) $rawW : 0;
    $h = is_numeric($rawH) ? (float) $rawH : 0;

    if ($w <= 0 || $h <= 0) {
        return array('qty' => 0, 'adjustedW' => $w, 'adjustedH' => $h);
    }

    $rectWmm = max(2, $w) * 10;
    $rectHmm = max(2, $h) * 10;

    $sheets = array(
        'preciso' => array('w' => 203, 'h' => 271, 'tol' => 0),
        'economico' => array('w' => 210, 'h' => 297, 'tol' => 5),
    );
    $sheet = isset($sheets[$mode]) ? $sheets[$mode] : $sheets['preciso'];

    $orientations = array(
        array('sw' => $sheet['w'], 'sh' => $sheet['h']),
        array('sw' => $sheet['h'], 'sh' => $sheet['w']),
    );

    $best = null;
    foreach ($orientations as $orientation) {
        $cols = (int) floor($orientation['sw'] / $rectWmm);
        $rows = (int) floor($orientation['sh'] / $rectHmm);
        if ($cols < 1 || $rows < 1) {
            continue;
        }
        $qty = $cols * $rows;
        $finalWmm = $rectWmm;
        $finalHmm = $rectHmm;

        if ($mode === 'economico' && $sheet['tol'] > 0) {
            $wPerfect = $orientation['sw'] / $cols;
            $hPerfect = $orientation['sh'] / $rows;
            if ($wPerfect >= $rectWmm && ($wPerfect - $rectWmm) <= $sheet['tol']) {
                $finalWmm = $wPerfect;
            }
            if ($hPerfect >= $rectHmm && ($hPerfect - $rectHmm) <= $sheet['tol']) {
                $finalHmm = $hPerfect;
            }
        }

        if ($best === null || $qty > $best['qty']) {
            $best = array('qty' => $qty, 'w' => $finalWmm, 'h' => $finalHmm);
        }
    }

    if ($best === null) {
        return array('qty' => 0, 'adjustedW' => $w, 'adjustedH' => $h);
    }

    return array(
        'qty' => $best['qty'],
        'adjustedW' => round($best['w'] / 10, 1),
        'adjustedH' => round($best['h'] / 10, 1),
    );
}

function mu_calc_auto_complexity($qtyPerSheet) {
    return (int) max(1, min(10, ceil(((float) $qtyPerSheet) / 10)));
}

/**
 * Decodifica un código de pedido v1 (mismo formato que orderCodec.ts).
 * Devuelve null si el código es inválido o referencia opciones inexistentes.
 */
function mu_calc_decode_order($code, $config) {
    $code = trim((string) $code);
    $tokens = explode('.', $code);
    if (count($tokens) < 2 || $tokens[0] !== 'v1') {
        return null;
    }

    $materials = isset($config['materials']) && is_array($config['materials']) ? $config['materials'] : array();
    $catalog = isset($config['shapesCatalog']) && is_array($config['shapesCatalog']) ? $config['shapesCatalog'] : array();
    $deliveryOptions = isset($config['deliveryOptions']) && is_array($config['deliveryOptions']) ? $config['deliveryOptions'] : array();
    $designOptions = isset($config['designOptions']) && is_array($config['designOptions']) ? $config['designOptions'] : array();

    $order = array(
        'shapeType' => '',
        'sizeIndex' => -1,
        'customRectW' => 0,
        'customRectH' => 0,
        'sheetsQty' => 0,
        'materialId' => '',
        'deliveryFormat' => '',
        'designType' => '',
        'complexity' => null,
        'customDesignTime' => 45,
        'rectCalcMode' => 'preciso',
    );

    foreach (array_slice($tokens, 1) as $token) {
        if ($token === '') {
            continue;
        }
        $key = $token[0];
        $val = substr($token, 1);

        switch ($key) {
            case 'm':
                $found = null;
                foreach ($materials as $material) {
                    if (isset($material['code']) && (string) $material['code'] === $val) {
                        $found = $material;
                        break;
                    }
                }
                if ($found === null) {
                    return null;
                }
                $order['materialId'] = $found['id'];
                break;

            case 's':
                $dims = mu_calc_parse_rect($val);
                if ($dims !== null) {
                    $order['shapeType'] = 'Rectangulares';
                    $order['rectCalcMode'] = 'preciso';
                    $order['customRectW'] = $dims['w'];
                    $order['customRectH'] = $dims['h'];
                } else {
                    $resolved = false;
                    foreach ($catalog as $category => $items) {
                        if (!is_array($items)) {
                            continue;
                        }
                        foreach ($items as $index => $item) {
                            if (isset($item['code']) && (string) $item['code'] === $val) {
                                $order['shapeType'] = $category;
                                $order['sizeIndex'] = (int) $index;
                                $resolved = true;
                                break 2;
                            }
                        }
                    }
                    if (!$resolved) {
                        return null;
                    }
                }
                break;

            case 'r':
                $dims = mu_calc_parse_rect($val);
                if ($dims === null) {
                    return null;
                }
                $order['shapeType'] = 'Rectangulares';
                $order['rectCalcMode'] = 'economico';
                $order['customRectW'] = $dims['w'];
                $order['customRectH'] = $dims['h'];
                break;

            case 'q':
                if (!is_numeric($val)) {
                    return null;
                }
                $qty = (int) $val;
                if ($qty < 1 || $qty > 10000) {
                    return null;
                }
                $order['sheetsQty'] = $qty;
                break;

            case 'c':
                if (!is_numeric($val)) {
                    return null;
                }
                $order['complexity'] = (int) mu_calc_clamp((int) $val, 1, 10);
                break;

            case 'f':
                if (!is_numeric($val)) {
                    return null;
                }
                $found = null;
                foreach ($deliveryOptions as $option) {
                    if (isset($option['code']) && (int) $option['code'] === (int) $val) {
                        $found = $option;
                        break;
                    }
                }
                if ($found === null) {
                    return null;
                }
                $order['deliveryFormat'] = $found['id'];
                break;

            case 'd':
                if (!is_numeric($val)) {
                    return null;
                }
                $found = null;
                foreach ($designOptions as $option) {
                    if (isset($option['code']) && (int) $option['code'] === (int) $val) {
                        $found = $option;
                        break;
                    }
                }
                if ($found === null) {
                    return null;
                }
                $order['designType'] = $found['id'];
                break;

            case 't':
                if (!is_numeric($val)) {
                    return null;
                }
                $order['customDesignTime'] = (int) mu_calc_clamp((int) $val, 0, 600);
                break;

            default:
                // Tokens desconocidos se ignoran (compatibilidad hacia adelante).
                break;
        }
    }

    return $order;
}

/**
 * Precio final del pedido (port de calcularPrecio). null si el pedido no se
 * puede cotizar (material/opción inexistente, 0 unidades por hoja, etc.).
 */
function mu_calc_compute_price($order, $config) {
    $cfg = isset($config['config']) && is_array($config['config']) ? $config['config'] : array();
    $materials = isset($config['materials']) && is_array($config['materials']) ? $config['materials'] : array();
    $catalog = isset($config['shapesCatalog']) && is_array($config['shapesCatalog']) ? $config['shapesCatalog'] : array();
    $deliveryOptions = isset($config['deliveryOptions']) && is_array($config['deliveryOptions']) ? $config['deliveryOptions'] : array();
    $designOptions = isset($config['designOptions']) && is_array($config['designOptions']) ? $config['designOptions'] : array();

    $material = null;
    foreach ($materials as $item) {
        if (isset($item['id']) && $item['id'] === $order['materialId']) {
            $material = $item;
            break;
        }
    }
    if ($material === null) {
        return null;
    }

    $deliveryOption = null;
    foreach ($deliveryOptions as $option) {
        if (isset($option['id']) && $option['id'] === $order['deliveryFormat']) {
            $deliveryOption = $option;
            break;
        }
    }
    if ($deliveryOption === null) {
        return null;
    }

    $designOption = null;
    foreach ($designOptions as $option) {
        if (isset($option['id']) && $option['id'] === $order['designType']) {
            $designOption = $option;
            break;
        }
    }
    if ($designOption === null) {
        return null;
    }

    // 1. Cantidades
    if ($order['shapeType'] === 'Rectangulares') {
        $layout = mu_calc_a4_layout($order['customRectW'], $order['customRectH'], $order['rectCalcMode']);
        $qtyPerSheet = (int) $layout['qty'];
    } else {
        $qtyPerSheet = 0;
        if (
            isset($catalog[$order['shapeType']]) &&
            is_array($catalog[$order['shapeType']]) &&
            isset($catalog[$order['shapeType']][$order['sizeIndex']]['qty'])
        ) {
            $qtyPerSheet = (int) $catalog[$order['shapeType']][$order['sizeIndex']]['qty'];
        }
    }
    if ($qtyPerSheet <= 0) {
        return null;
    }

    $sheets = (int) mu_calc_clamp(round(mu_calc_num($order['sheetsQty'])), 1, 100000);
    $totalStickers = $qtyPerSheet * $sheets;

    // 2. Impresión
    $printCostPerSheet = mu_calc_num(isset($material['sheetCost']) ? $material['sheetCost'] : 0)
        + mu_calc_num(isset($material['inkCost']) ? $material['inkCost'] : 0)
        + mu_calc_num(isset($material['printWear']) ? $material['printWear'] : 0);

    // 3. Corte
    $complexity = $order['complexity'] !== null
        ? (int) mu_calc_clamp(round($order['complexity']), 1, 10)
        : mu_calc_auto_complexity($qtyPerSheet);
    $minCutTime = max(0, mu_calc_num(isset($material['minCutTime']) ? $material['minCutTime'] : 0));
    $maxCutTime = max($minCutTime, mu_calc_num(isset($material['maxCutTime']) ? $material['maxCutTime'] : $minCutTime));
    $complexityFactor = ($complexity - 1) / 9;
    $baseCutTime = $minCutTime + (($maxCutTime - $minCutTime) * $complexityFactor);
    $cutWearCostPerSheet = max(0, mu_calc_num(isset($material['cutWear']) ? $material['cutWear'] : 0));

    $cutFactor = isset($deliveryOption['cutFactor']) && is_numeric($deliveryOption['cutFactor'])
        ? max(0, (float) $deliveryOption['cutFactor'])
        : 1;
    $cutWearFactor = isset($deliveryOption['cutWearFactor']) && is_numeric($deliveryOption['cutWearFactor'])
        ? max(0, (float) $deliveryOption['cutWearFactor'])
        : 1;

    $baseCutTime = max(0, $baseCutTime * $cutFactor);
    $cutWearCostPerSheet = max(0, $cutWearCostPerSheet * $cutWearFactor);

    // 4. Materiales + merma
    $totalRawMaterial = ($printCostPerSheet + $cutWearCostPerSheet) * $sheets;
    $wasteMargin = mu_calc_clamp(mu_calc_num(isset($cfg['wasteMargin']) ? $cfg['wasteMargin'] : 0), 0, 100);
    $wasteAmount = $totalRawMaterial * ($wasteMargin / 100);
    $costWithWaste = $totalRawMaterial + $wasteAmount;

    // 5. Tiempos + mano de obra
    $designTime = max(
        0,
        !empty($designOption['isCustomTime'])
            ? mu_calc_num($order['customDesignTime'])
            : mu_calc_num(isset($designOption['designMinutes']) ? $designOption['designMinutes'] : 0)
    );
    $variableTimeMins = (mu_calc_num(isset($material['printTime']) ? $material['printTime'] : 0) + $baseCutTime) * $sheets;
    $totalLogisticsTime = max(0, mu_calc_num(isset($cfg['timeDelivery']) ? $cfg['timeDelivery'] : 0));
    $fixedTimeMins = max(0, mu_calc_num(isset($cfg['timeCustomerService']) ? $cfg['timeCustomerService'] : 0)) + $designTime;
    $totalTimeMins = $fixedTimeMins + $variableTimeMins + $totalLogisticsTime;
    $laborCost = ($totalTimeMins / 60) * max(0, mu_calc_num(isset($cfg['hourlyRate']) ? $cfg['hourlyRate'] : 0));

    // 6. Precio final (markup sobre costo, igual que el frontend)
    $totalCost = $costWithWaste + $laborCost + max(0, mu_calc_num(isset($cfg['packagingCost']) ? $cfg['packagingCost'] : 0));
    $profitMargin = mu_calc_clamp(mu_calc_num(isset($cfg['profitMargin']) ? $cfg['profitMargin'] : 0), 0, 1000);
    $profitAmount = $totalCost * ($profitMargin / 100);
    $finalPrice = mu_calc_round2($totalCost + $profitAmount);

    return array(
        'price' => $finalPrice,
        'totalStickers' => $totalStickers,
        'pricePerSticker' => $totalStickers > 0 ? mu_calc_round2($finalPrice / $totalStickers) : 0,
        'sheets' => $sheets,
    );
}

/** Atajo: código v1 -> precio recalculado en el servidor. null si no se puede. */
function mu_calc_price_from_code($orderCode) {
    $config = mu_calc_load_config();
    if ($config === null) {
        return null;
    }
    $order = mu_calc_decode_order($orderCode, $config);
    if ($order === null) {
        return null;
    }
    return mu_calc_compute_price($order, $config);
}