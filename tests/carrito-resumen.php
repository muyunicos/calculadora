<?php
/**
 * Puerta del item de la calculadora en el carrito y en el pedido (sin WordPress).
 *
 * Cubre lo que el cliente y el admin ven de la linea:
 *  - el resumen en dos lineas (planchas + unidades / medida + material + formato);
 *  - la URL del cotizador, que el servidor guarda como `cotizador_url` y que antes
 *    se leia como `cotizadorUrl`: por eso no aparecian ni el boton "Editar" del
 *    carrito ni el link "Ver en Calculadora" del pedido;
 *  - el pedido nuevo (`_calculator_resumen`) y el viejo (texto plano congelado,
 *    que se reordena al vuelo y sin el codigo).
 *
 * Uso: php tests/carrito-resumen.php
 * Salida: CARRITO RESUMEN OK (N checks) | CARRITO RESUMEN: N fallo(s)
 */

define('ABSPATH', __DIR__ . '/');

// --- Stubs minimos de WordPress/Woo: solo lo que usa la clase ---
function add_action() {}
function add_filter() {}
function plugin_dir_path($file) { return rtrim(dirname($file), '/') . '/'; }
function esc_html($s) { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }
function esc_url($s) { return (string) $s; }
function esc_url_raw($s) { return (string) $s; }
function wc_price($p) { return '$' . number_format((float) $p, 0, ',', '.'); }

require __DIR__ . '/../woocommerce-plugin/plugin-calculadora-cart-integration.php';

/** Item de pedido falso: solo `get_meta`/`add_meta_data`. */
class PMU_ItemFalso
{
    private $meta = array();

    public function __construct($meta = array())
    {
        $this->meta = is_array($meta) ? $meta : array();
    }

    public function get_meta($key, $single = false)
    {
        return array_key_exists($key, $this->meta) ? $this->meta[$key] : '';
    }

    public function add_meta_data($key, $value, $unique = false)
    {
        $this->meta[$key] = $value;
    }

    public function meta()
    {
        return $this->meta;
    }
}

$checks = 0;
$fallos = 0;

function check($n, $ok, $detalle = '')
{
    global $checks, $fallos;
    $checks++;
    if (!$ok) {
        $fallos++;
    }
    echo ($ok ? 'OK   | ' : 'FALLA| ') . $n . ($detalle !== '' ? ' | ' . $detalle : '') . "\n";
}

$url = 'https://mp.cotizador/?o=v1.m10.s30.q5.c6.f1.d0';
$item = array(
    'sheets' => 5,
    'quantity' => 300,
    'medida' => 'Circulares 3,0 cm',
    'material' => 'Papel Adhesivo Fotografico',
    'formato' => 'Plancha Medio Corte',
);

$o = new CalculadoraCartIntegration();

// 1) Carrito: la clave que el servidor guarda es `cotizador_url`.
$nombre = $o->modify_cart_item_name('Etiquetas', array('calculator_data' => array('cotizador_url' => $url) + $item), 'k');
check('el carrito lleva la url del cotizador', strpos($nombre, $url) !== false);
check('el carrito lleva el resumen de dos lineas',
    strpos($nombre, '5 planchas de 60') !== false && strpos($nombre, '300 u') !== false);

// 2) Tolerancia con la clave vieja (camelCase) de carritos anteriores.
$viejo = $o->modify_cart_item_name('Etiquetas', array('calculator_data' => array('cotizadorUrl' => $url) + $item), 'k');
check('tambien lee la url vieja (cotizadorUrl)', strpos($viejo, $url) !== false);

// 3) Boton "Editar" del carrito.
ob_start();
$o->add_edit_button(array('calculator_data' => array('cotizador_url' => $url) + $item), 'k');
$boton = (string) ob_get_clean();
check('el boton Editar del carrito se pinta',
    strpos($boton, 'edit-calculator-item') !== false && strpos($boton, $url) !== false,
    trim($boton) === '' ? 'vacio' : 'ok');

ob_start();
$o->add_edit_button(array('calculator_data' => $item), 'k');
check('sin url no hay boton Editar', trim((string) ob_get_clean()) === '');

// 4) Pedido: `_calculator_url` y `_calculator_resumen` (antes la url quedaba vacia).
$orderItem = new PMU_ItemFalso();
$o->add_order_item_meta($orderItem, 'k', array('calculator_data' => array(
    'cotizador_url' => $url,
    'sheets' => 5,
    'quantity' => 300,
    'medida' => 'Circulares 3,0 cm',
    'material' => 'Papel Adhesivo Fotografico',
    'formato' => 'Plancha Medio Corte',
    'diseno' => array(),
)), null);
check('el pedido guarda _calculator_url', $orderItem->get_meta('_calculator_url') === $url,
    (string) $orderItem->get_meta('_calculator_url'));
$resumenGuardado = $orderItem->get_meta('_calculator_resumen');
check('el pedido guarda _calculator_resumen',
    is_array($resumenGuardado) && isset($resumenGuardado['quantity']) && $resumenGuardado['quantity'] === 300);

// 5) Pedido nuevo: resumen + link.
ob_start();
$o->display_order_item_meta(1, new PMU_ItemFalso(array(
    '_calculator_resumen' => $resumenGuardado,
    '_calculator_url' => $url,
)), null);
$html = (string) ob_get_clean();
check('el pedido muestra Ver en Calculadora',
    strpos($html, 'Ver en Calculadora') !== false && strpos($html, $url) !== false);
check('el pedido muestra el resumen de dos lineas',
    strpos($html, '5 planchas de 60') !== false && strpos($html, 'Circulares 3,0 cm') !== false);

// 6) Pedido viejo: el texto largo guardado se reordena y el codigo no se muestra.
$planoViejo = 'Material: Papel Adhesivo Fotografico | Formato: Plancha Medio Corte'
    . ' | Medida: Circulares 3,0 cm | Unidades: 300 | Planchas: 5'
    . ' | Codigo: v1.m10.s30.q5.c6.f1.d0';
ob_start();
$o->display_order_item_meta(2, new PMU_ItemFalso(array('_calculator_description' => $planoViejo)), null);
$viejoHtml = (string) ob_get_clean();
check('el pedido viejo se reordena',
    strpos($viejoHtml, '5 planchas de 60') !== false && strpos($viejoHtml, '300 u') !== false);
check('el pedido viejo ya no muestra el codigo', strpos($viejoHtml, 'v1.m10.s30') === false);

// 7) Un texto que no se reconoce se muestra tal cual (nunca rompe).
ob_start();
$o->display_order_item_meta(3, new PMU_ItemFalso(array('_calculator_description' => 'Cualquier cosa rara')), null);
check('un texto no reconocido se muestra igual',
    strpos((string) ob_get_clean(), 'Cualquier cosa rara') !== false);

// 8) Sin datos no pinta nada.
ob_start();
$o->display_order_item_meta(4, new PMU_ItemFalso(), null);
check('sin datos no pinta nada', trim((string) ob_get_clean()) === '');

echo "\n" . ($fallos
    ? 'CARRITO RESUMEN: ' . $fallos . ' fallo(s)'
    : 'CARRITO RESUMEN OK (' . $checks . ' checks)') . "\n";

exit($fallos ? 1 : 0);