/**
 * Runner de tests del núcleo (sin dependencias nuevas).
 *
 * Compila los módulos .ts a CommonJS en memoria con esbuild (ya instalado) y
 * corre asserts de Node. Además compara el precio calculado en TypeScript con
 * el que calcula el motor PHP del carrito (tests/precio-paridad.php), que es
 * el que se usa para cobrar.
 *
 * Uso: npm test
 */

const { buildSync } = require('esbuild');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');

/** Carga un módulo TS como CJS en memoria. */
function loadModule(relativePath) {
  const result = buildSync({
    entryPoints: [path.join(root, relativePath)],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    write: false,
    logLevel: 'silent',
  });
  const code = result.outputFiles[0].text;
  const module = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'require', code)(module, module.exports, require);
  return module.exports;
}

const { calcA4Layout } = loadModule('src/core/a4Layout.ts');
const { encodeOrderCode, decodeAnyOrder } = loadModule('src/core/orderCodec.ts');
const { calcularPrecio, autoComplexity, missingSelections, galleryPricing } = loadModule('src/core/priceEngine.ts');
const { validateAppData } = loadModule('src/core/validation.ts');
const { findMaterialCodeDuplicates, findShapeCodeDuplicates } = loadModule('src/utils/validation.ts');

const rawConfig = JSON.parse(fs.readFileSync(path.join(root, 'assets/datos_config.json'), 'utf8'));
const validated = validateAppData(rawConfig);
assert.equal(validated.success, true, 'La config de producción debe validar');
const data = validated.data;

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}

// --- SANEADOR ---
test('la config de producción sanea sin errores', () => {
  assert.equal(data.materials.length, rawConfig.materials.length);
  assert.equal(data.config.hourlyRate, rawConfig.config.hourlyRate);
});

test('una foto sin código se repara y queda oculta (antes rompía la carga)', () => {
  const payload = JSON.parse(JSON.stringify(rawConfig));
  payload.gallery = [{ id: 'gTest', image: '', order: '', visible: true }];
  const result = validateAppData(payload);
  assert.equal(result.success, true);
  assert.equal(result.data.gallery[0].visible, false);
  assert.ok(result.warnings.length > 0);
});

test('ids de formato/diseño propios se aceptan (antes el enum los rechazaba)', () => {
  const payload = JSON.parse(JSON.stringify(rawConfig));
  payload.deliveryOptions.push({
    id: `formato_${Date.now()}`, code: 9, label: 'Nuevo', cutFactor: 1, cutWearFactor: 1, visible: true,
  });
  assert.equal(validateAppData(payload).success, true);
});

test('hourlyRate null/Infinity se recalcula en vez de romper la carga', () => {
  const payload = JSON.parse(JSON.stringify(rawConfig));
  payload.config.hourlyRate = null;
  payload.config.weeklyHours = 0;
  const result = validateAppData(payload);
  assert.equal(result.success, true);
  assert.ok(Number.isFinite(result.data.config.hourlyRate));
});

test('un material sin nombre se descarta (no rompe todo el archivo)', () => {
  const payload = JSON.parse(JSON.stringify(rawConfig));
  payload.materials.push({ id: 'mSinNombre', name: '   ', sheetCost: 1 });
  const result = validateAppData(payload);
  assert.equal(result.success, true);
  assert.equal(result.data.materials.some((m) => m.id === 'mSinNombre'), false);
});

test('detecta códigos duplicados de material y de tamaño', () => {
  const materials = [{ id: 'a', name: 'A', code: 10 }, { id: 'b', name: 'B', code: 10 }];
  assert.equal(findMaterialCodeDuplicates(materials).length, 1);
  const catalog = { C: [{ size: '2cm', qty: 1, code: 5 }, { size: '3cm', qty: 1, code: 5 }] };
  assert.equal(findShapeCodeDuplicates(catalog).length, 1);
  assert.equal(findShapeCodeDuplicates(data.shapesCatalog).length, 0, 'la config real no debe tener duplicados');
});

test('round-trip: sanear -> guardar -> sanear no cambia nada', () => {
  const first = validateAppData(rawConfig);
  assert.equal(first.success, true);
  const second = validateAppData(JSON.parse(JSON.stringify(first.data)));
  assert.equal(second.success, true);
  assert.deepEqual(second.data, first.data);
  assert.equal(second.warnings.length, 0);
});

// --- LAYOUT A4 ---
test('A4: 5x5 cm entran 20 en modo preciso', () => {
  assert.equal(calcA4Layout(5, 5, 'preciso').qty, 20);
});

test('A4: 4x4 cm en modo económico reparte 5x7 y ajusta a 4,2 cm', () => {
  const layout = calcA4Layout(4, 4, 'economico');
  assert.equal(layout.qty, 35);
  assert.equal(layout.adjustedW, 4.2);
  assert.equal(layout.adjustedH, 4.2);
});

test('A4: 7x7 cm entra 6 en modo preciso y 12 en económico', () => {
  assert.equal(calcA4Layout(7, 7, 'preciso').qty, 6);
  assert.equal(calcA4Layout(7, 7, 'economico').qty, 12);
});

test('A4: 5x5 y 5x4,5 en económico entran 24 (achica hasta 5 mm si no puede agrandar)', () => {
  // 5x5: el alto no se puede agrandar (sobra 9,4 mm > 5 mm); se achica a 4,95 para
  // meter 6 filas -> 4 x 6 = 24 (antes daba 20).
  const l5 = calcA4Layout(5, 5, 'economico');
  assert.equal(l5.qty, 24);
  assert.equal(l5.adjustedW, 5.3);
  assert.equal(l5.adjustedH, 5);
  // 5x4,5: se agranda a 5,25 x 4,95 -> 4 x 6 = 24.
  assert.equal(calcA4Layout(5, 4.5, 'economico').qty, 24);
});

test('A4: el modo económico respeta el tope de 5 mm al ajustar (agranda o achica)', () => {
  for (const [w, h] of [[4, 4], [7, 7], [2, 2]]) {
    const layout = calcA4Layout(w, h, 'economico');
    assert.ok(Math.abs(layout.adjustedW - w) <= 0.5 + 1e-9, 'ancho ajustado ' + layout.adjustedW + ' vs ' + w);
    assert.ok(Math.abs(layout.adjustedH - h) <= 0.5 + 1e-9, 'alto ajustado ' + layout.adjustedH + ' vs ' + h);
  }
});

test('A4: medidas que no entran devuelven qty 0', () => {
  assert.equal(calcA4Layout(30, 2, 'preciso').qty, 0);
  assert.equal(calcA4Layout(0, 5, 'preciso').qty, 0);
});

// --- CODEC DE PEDIDOS ---
const sampleOrder = {
  shapeType: 'Rectangulares',
  sizeIndex: -1,
  customRectW: 5,
  customRectH: 5,
  sheetsQty: 5,
  materialId: data.materials[0].id,
  deliveryFormat: 'plancha',
  complexity: 7,
  designType: 'basic',
  customDesignTime: 45,
  rectCalcMode: 'preciso',
};

test('el código incluye material, medidas, cantidad, formato, diseño y complejidad', () => {
  const code = encodeOrderCode(sampleOrder, data.materials, data.shapesCatalog, data.deliveryOptions, data.designOptions);
  assert.ok(code && code.startsWith('v1.m'));
  assert.match(code, /\.q5\./);
  assert.match(code, /\.c7(\.|$)/);
  assert.match(code, /\.f1(\.|$)/);
  assert.match(code, /\.d1(\.|$)/);
});

test('round-trip del código (medidas, formato, diseño y complejidad)', () => {
  const code = encodeOrderCode(sampleOrder, data.materials, data.shapesCatalog, data.deliveryOptions, data.designOptions);
  const decoded = decodeAnyOrder(code, data.materials, data.shapesCatalog, data.deliveryOptions, data.designOptions);
  assert.equal(decoded.shapeType, 'Rectangulares');
  assert.equal(decoded.customRectW, '5');
  assert.equal(decoded.customRectH, '5');
  assert.equal(decoded.sheetsQty, 5);
  assert.equal(decoded.deliveryFormat, 'plancha');
  assert.equal(decoded.designType, 'basic');
  assert.equal(decoded.complexity, 7);
});

test('rechaza medidas absurdas y opciones inexistentes', () => {
  const opts = [data.materials, data.shapesCatalog, data.deliveryOptions, data.designOptions];
  assert.equal(decodeAnyOrder('v1.m10.r3000x20.q5.f1.d0', ...opts), null);
  assert.equal(decodeAnyOrder('v1.m10.s50.q5.f99.d0', ...opts), null);
  assert.equal(decodeAnyOrder('v1.m999.s50.q5.f1.d0', ...opts), null);
});

// --- MOTOR DE PRECIOS ---
const tinyConfig = {
  calcSalaryMode: false, monthlySalary: 0, weeklyHours: 38, hourlyRate: 6000,
  packagingCost: 100, wasteMargin: 10, profitMargin: 50,
  timeCustomerService: 0, timeDelivery: 0, timeDesignBasic: 0, timeDesignCustom: 0,
  galleryRefSheets: 10,
};
const tinyMaterial = {
  id: 'm1', name: 'M', code: 1, sheetCost: 100, printTime: 0, inkCost: 0,
  printWear: 0, minCutTime: 0, maxCutTime: 0, cutWear: 0, visible: true,
};
const tinyCatalog = { C: [{ size: '5cm', qty: 20, code: 10, visible: true }] };
const tinyDelivery = [{ id: 'plancha', code: 1, label: 'P', cutFactor: 1, cutWearFactor: 1, visible: true }];
const tinyDesign = [{ id: 'none', code: 0, label: 'N', designMinutes: 0, isCustomTime: false, visible: true }];
const tinyOrder = {
  shapeType: 'C', sizeIndex: 0, customRectW: '', customRectH: '', sheetsQty: 2,
  materialId: 'm1', deliveryFormat: 'plancha', complexity: 1, designType: 'none', customDesignTime: 0,
};

test('fórmula de precio exacta (material + merma + packaging + ganancia)', () => {
  const result = calcularPrecio(tinyOrder, tinyConfig, [tinyMaterial], tinyCatalog, tinyDelivery, tinyDesign);
  assert.ok(result);
  assert.equal(result.totalStickers, 40);
  assert.equal(result.costWithWaste, 220);
  assert.equal(result.totalCost, 320);
  assert.equal(result.finalPrice, 480);
  assert.equal(result.pricePerSheet, 240);
  assert.equal(result.pricePerSticker, 12);
});

test('rectangular: el modo económico cambia las unidades por plancha y el precio unitario', () => {
  const rect7 = {
    ...tinyOrder,
    shapeType: 'Rectangulares',
    sizeIndex: -1,
    customRectW: 7,
    customRectH: 7,
    sheetsQty: 2,
    rectCalcMode: 'preciso',
    complexity: 1,
  };
  const preciso = calcularPrecio(rect7, tinyConfig, [tinyMaterial], tinyCatalog, tinyDelivery, tinyDesign);
  const economico = calcularPrecio(
    { ...rect7, rectCalcMode: 'economico', complexity: 2 },
    tinyConfig,
    [tinyMaterial],
    tinyCatalog,
    tinyDelivery,
    tinyDesign,
  );

  assert.equal(preciso.qtyStickersPerSheet, 6);
  assert.equal(economico.qtyStickersPerSheet, 12);
  assert.equal(preciso.totalStickers, 12);
  assert.equal(economico.totalStickers, 24);
  // Con el material de prueba (sin tiempos de corte) el costo por plancha no cambia;
  // la diferencia de precio por unidad sale de la cantidad de stickers por hoja.
  assert.equal(preciso.finalPrice, 480);
  assert.equal(economico.finalPrice, 480);
  assert.equal(preciso.pricePerSticker, 40);
  assert.equal(economico.pricePerSticker, 20);
});

test('galleryPricing usa el modo del pedido (no siempre el layout preciso)', () => {
  const rect7 = {
    ...tinyOrder,
    shapeType: 'Rectangulares',
    sizeIndex: -1,
    customRectW: 7,
    customRectH: 7,
    rectCalcMode: 'economico',
  };
  const economico = galleryPricing(rect7, tinyConfig, [tinyMaterial], tinyCatalog, tinyDelivery, tinyDesign, 2);
  const preciso = galleryPricing(
    { ...rect7, rectCalcMode: 'preciso' },
    tinyConfig,
    [tinyMaterial],
    tinyCatalog,
    tinyDelivery,
    tinyDesign,
    2,
  );

  assert.ok(economico && preciso);
  // Económico: 12 por hoja × 2 planchas. Preciso: 6 × 2.
  assert.equal(economico.totalStickers, 24);
  assert.equal(preciso.totalStickers, 12);
  assert.equal(economico.perUnitBase, 26.25);
  assert.equal(economico.perUnit, 20);
  assert.equal(preciso.perUnitBase, 52.5);
  assert.equal(preciso.perUnit, 40);
});

test('missingSelections usa el modo económico para validar las medidas', () => {
  // 20,5 cm no entra en 203 mm, pero sí en 210 mm.
  const rect = {
    ...tinyOrder,
    shapeType: 'Rectangulares',
    sizeIndex: -1,
    customRectW: 20.5,
    customRectH: 20.5,
    rectCalcMode: 'preciso',
  };
  assert.ok(missingSelections(rect, [tinyMaterial], tinyCatalog).includes('medidas'));
  const economico = { ...rect, rectCalcMode: 'economico' };
  assert.ok(!missingSelections(economico, [tinyMaterial], tinyCatalog).includes('medidas'));
});

test('no cotiza con 0 unidades por hoja y lo informa en "falta"', () => {
  const zeroCatalog = { C: [{ size: '5cm', qty: 0, code: 10, visible: true }] };
  assert.equal(calcularPrecio(tinyOrder, tinyConfig, [tinyMaterial], zeroCatalog, tinyDelivery, tinyDesign), null);
  assert.ok(missingSelections(tinyOrder, [tinyMaterial], zeroCatalog).includes('tamaño'));

  const rectOrder = { ...tinyOrder, shapeType: 'Rectangulares', sizeIndex: -1, customRectW: 30, customRectH: 2 };
  assert.equal(calcularPrecio(rectOrder, tinyConfig, [tinyMaterial], tinyCatalog, tinyDelivery, tinyDesign), null);
  assert.ok(missingSelections(rectOrder, [tinyMaterial], tinyCatalog).includes('medidas'));
});

test('el tiempo de diseño sale de designMinutes (no del config deprecado)', () => {
  const design10 = [{ ...tinyDesign[0], designMinutes: 60 }];
  const result = calcularPrecio(tinyOrder, tinyConfig, [tinyMaterial], tinyCatalog, tinyDelivery, design10);
  assert.equal(result.designTime, 60);
  // 60 min a $6000/hora = $6000 extra sobre el costo, con markup 50%
  assert.equal(result.laborCost, 6000);
  assert.equal(result.finalPrice, 9480);
});

// --- PARIDAD TS <-> PHP (el carrito cobra con el motor PHP) ---
function tsPrice(code) {
  const order = decodeAnyOrder(code, data.materials, data.shapesCatalog, data.deliveryOptions, data.designOptions);
  if (!order) return null;
  if (!/(^|\.)c\d+/.test(code)) {
    const qty = order.shapeType === 'Rectangulares'
      ? calcA4Layout(order.customRectW, order.customRectH, order.rectCalcMode).qty
      : (data.shapesCatalog[order.shapeType]?.[order.sizeIndex]?.qty ?? 0);
    order.complexity = autoComplexity(qty);
  }
  return calcularPrecio(order, data.config, data.materials, data.shapesCatalog, data.deliveryOptions, data.designOptions);
}

let phpAvailable = true;
try {
  execFileSync('php', ['-v'], { stdio: 'ignore' });
} catch {
  phpAvailable = false;
  console.warn('  (php no está en el PATH: se omite la paridad TS/PHP)');
}

const parityCodes = [
  'v1.m10.s50.q5.f1.d0.c7',
  'v1.m10.s50.q5.f0.d1.c1',
  'v1.m10.s50.q2.f1.d0',
  'v1.m11.r53x50.q3.f1.d0.c4',
  // 7x7 cm en modo economico: es el caso donde preciso y economico NO coinciden
  // (6 vs 12 unidades por plancha). Sin el modo en el motor TS, este codigo falla.
  'v1.m11.r70x70.q10.f1.d0.c1',
  'v1.m10.s203x271.q2.f2.d0',
  'v1.m11.s140.q5.f2.d0.c10',
];

test('el precio TS y el precio PHP (carrito) coinciden', () => {
  if (!phpAvailable) return;
  for (const code of parityCodes) {
    const ts = tsPrice(code);
    assert.ok(ts, `TS debe poder cotizar ${code}`);
    const raw = execFileSync('php', [path.join(__dirname, 'precio-paridad.php'), code], {
      cwd: root,
      encoding: 'utf8',
    });
    const php = JSON.parse(raw);
    assert.ok(php, `PHP debe poder cotizar ${code}`);
    assert.equal(php.totalStickers, ts.totalStickers, `unidades de ${code}`);
    assert.ok(
      Math.abs(php.price - ts.finalPrice) <= 0.01,
      `precio de ${code}: TS ${ts.finalPrice} vs PHP ${php.price}`,
    );
  }
});

test('el PHP también rechaza códigos inválidos', () => {
  if (!phpAvailable) return;
  const invalid = ['v1.m999.s50.q5.f1.d0', 'v1.m10.r3000x20.q5.f1.d0', 'v1.m10.s50.q5.f99.d0', 'garbage'];
  for (const code of invalid) {
    const raw = execFileSync('php', [path.join(__dirname, 'precio-paridad.php'), code], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(JSON.parse(raw), null, `PHP debe rechazar ${code}`);
  }
});

test('el payload saneado pasa la validación del servidor y se escribe', () => {
  if (!phpAvailable) return;
  const sanitized = validateAppData(rawConfig);
  const raw = execFileSync('php', [path.join(__dirname, 'guardar-paridad.php')], {
    input: JSON.stringify(sanitized.data),
    encoding: 'utf8',
    cwd: root,
  });
  const result = JSON.parse(raw);
  assert.equal(result.code, 200, JSON.stringify(result.body));
  assert.equal(result.body.ok, true);
  assert.ok(result.written, 'debe haber escrito el archivo');
  assert.equal(result.written.materials.length, sanitized.data.materials.length);
});

test('el servidor rechaza un material sin nombre y códigos duplicados', () => {
  if (!phpAvailable) return;
  const run = (payload) => JSON.parse(execFileSync('php', [path.join(__dirname, 'guardar-paridad.php')], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    cwd: root,
  }));

  const base = JSON.parse(JSON.stringify(validateAppData(rawConfig).data));

  const sinNombre = JSON.parse(JSON.stringify(base));
  sinNombre.materials[0].name = '   ';
  const r1 = run(sinNombre);
  assert.equal(r1.code, 422);
  assert.equal(r1.body.ok, false);

  const duplicado = JSON.parse(JSON.stringify(base));
  duplicado.shapesCatalog.Circulares[1].code = duplicado.shapesCatalog.Circulares[0].code;
  const r2 = run(duplicado);
  assert.equal(r2.code, 422);
  assert.match(r2.body.error, /repetidos/);
});

// --- Spec 037: nucleo del mockup del cotizador (T011 + paridad I1) ---
const { sizeToPx, gidPara, tiraOrden, precioActualizado, descripcionAuto } =
  loadModule('src/core/mockups.ts');
const { resolvePlantillaFor, duplicarPlantilla, moverPlantilla } =
  loadModule('src/core/plantillas.ts');
  const paridadCotizador = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'cotizador-paridad.json'), 'utf8'),
);

test('paridad: sizeToPx y gidPara coinciden con el fixture del plugin', () => {
  paridadCotizador.casos.forEach((caso) => {
    assert.deepEqual(
      sizeToPx(caso.size),
      { w: caso.w, h: caso.h },
      `${caso.categoria} ${caso.size}`,
    );
    assert.equal(gidPara(caso.categoria, caso.size), caso.gid, `${caso.categoria} ${caso.size}`);
  });
});

test('sizeToPx acota el lienzo conservando el aspecto y rechaza basura', () => {
  assert.deepEqual(sizeToPx('10x200'), { w: 150, h: 3000 });
  assert.deepEqual(sizeToPx('6,0 cm'), { w: 709, h: 709 });
  assert.deepEqual(sizeToPx(''), { w: 0, h: 0 });
  assert.deepEqual(sizeToPx('sin medidas'), { w: 0, h: 0 });
});

test('plantillas: rango X/Y resuelve los tamaños intermedios', () => {
  const plantillas = [
    { id: 'p1', titulo: 'Chicos', categoria: 'Circulares', pdf: 'circ-chico', orden: 0, rango: { minX: 2, maxX: 4, minY: 2, maxY: 4 } },
    { id: 'p2', titulo: 'Grandes', categoria: 'Circulares', pdf: 'circ-grande', orden: 1, rango: { minX: 4.5, maxX: 10, minY: 4.5, maxY: 10 } },
    { id: 'p3', titulo: 'Todos', categoria: 'Formas', pdf: 'formas', orden: 0 },
  ];
  assert.equal(resolvePlantillaFor({ categoria: 'Circulares', size: '3,0 cm' }, plantillas).pdf, 'circ-chico');
  assert.equal(resolvePlantillaFor({ categoria: 'Circulares', size: '3,7 cm' }, plantillas).pdf, 'circ-chico');
  assert.equal(resolvePlantillaFor({ categoria: 'Circulares', size: '6,0 cm' }, plantillas).pdf, 'circ-grande');
  assert.equal(resolvePlantillaFor({ categoria: 'Formas', size: '5x2,5 cm' }, plantillas).pdf, 'formas');
  assert.equal(resolvePlantillaFor({ categoria: 'Circulares', size: '12 cm' }, plantillas), null);
});

test('plantillas: duplicar y reordenar (FR-041)', () => {
  const base = { titulo: 'Circulares 6', categoria: 'Circulares', pdf: 'c6', orden: 0 };
  const copia = duplicarPlantilla({ ...base, id: 'a' }, 'b');
  assert.equal(copia.id, 'b');
  assert.match(copia.titulo, /\(copia\)/);
  assert.equal(copia.pdf, 'c6');
  const lista = moverPlantilla([
    { ...base, id: 'a', orden: 0 },
    { ...base, id: 'c', orden: 1 },
  ], 'c', -1);
  assert.deepEqual(lista.map((p) => p.id), ['c', 'a']);
  assert.deepEqual(lista.map((p) => p.orden), [0, 1]);
});
test('tiraOrden: favorito, orden manual y fecha (5 asserts)', () => {
  const base = { origen: 'custom', titulo: 'x', favorito: false, orden: 0, creado: 0 };
  const items = [
    { ...base, key: 'custom:b', creado: 100 },
    { ...base, key: 'custom:a', creado: 200 },
    { ...base, key: 'custom:c', favorito: true, creado: 1 },
    { ...base, key: 'custom:d', orden: 1, creado: 999 },
  ];
  const ordenados = items.slice().sort(tiraOrden).map((i) => i.key);
  assert.equal(ordenados[0], 'custom:c');
  assert.equal(ordenados[ordenados.length - 1], 'custom:d');
  assert.ok(ordenados.indexOf('custom:a') < ordenados.indexOf('custom:b'));
  assert.equal(tiraOrden(items[0], items[0]), 0);
  assert.equal(items.slice().sort(tiraOrden).length, 4);
});

test('precioActualizado: avisa solo si el numero cambio (D7)', () => {
  const actual = {
    perUnit: 860, perUnitBase: 900, total: 193500,
    totalStickers: 225, sheets: 15, savingsPct: 12,
  };
  assert.equal(precioActualizado({ final: 193500 }, actual), false);
  assert.equal(precioActualizado({ final: 193500.4 }, actual), false);
  assert.equal(precioActualizado({ final: 180000 }, actual), true);
  assert.equal(precioActualizado(undefined, actual), false);
  assert.equal(precioActualizado({ final: 100 }, null), false);
});

test('descripcionAuto arma material | forma tamano | formato | planchas', () => {
  const texto = descripcionAuto({
    material: 'Vinilo',
    forma: 'Circulares',
    tamano: '6,0 cm',
    formato: 'Plancha Medio Corte',
    planchas: 15,
    unidades: 225,
  });
  assert.equal(texto, 'Vinilo | Circulares 6,0 cm | Plancha Medio Corte | 15 planchas (~225 u)');
});

test('spec 019 (D26): el visor delega en el motor del tema', () => {
  let pedido = null;
  let cerrado = 0;
  global.window = {
    MU: {
      visor: (o) => { pedido = o; return true; },
      cerrar: () => { cerrado += 1; },
    },
  };
  const mu = loadModule('src/core/muGaleria.ts');
  assert.ok(mu.motorGaleria(), 'con window.MU el motor esta disponible');
  const ok = mu.abrirVisor({ items: [{ url: 'a.png' }], indice: 0, titulo: 'Ideas', tono: 'oscuro' });
  assert.equal(ok, true, 'abre con el visor del tema');
  assert.equal(pedido.titulo, 'Ideas');
  assert.equal(pedido.tono, 'oscuro');
  mu.cerrarVisor();
  assert.equal(cerrado, 1, 'cerrar delega en el tema');
  const meta = mu.metaDeItem(
    { id: '1', image: 'a.png', order: 'v1', title: 'Sticker' },
    { perUnit: 10, perUnitBase: 20, total: 1000, totalStickers: 100, sheets: 4, savingsPct: 50 }
  );
  assert.equal(meta.titulo, 'Sticker');
  // Spec 020: la meta del visor es del LOTE (un solo precio: total con tachado), la nota
  // sin el total repetido y el badge con el formato de la tabla de ahorro.
  assert.equal(meta.precios.length, 1, 'un solo precio (el del lote)');
  assert.equal(meta.precios[0].valor, 1000, 'el precio es el total del lote');
  assert.equal(meta.precios[0].anterior, 2000, 'el tachado es el lote de a una plancha');
  assert.equal(meta.nota, 'Comprando 4 planchas · 100 u');
  assert.equal(meta.badge.texto, '-50%');
  delete global.window;
  assert.equal(mu.motorGaleria(), null, 'sin window.MU no hay motor (dependencia blanda)');
  assert.equal(mu.abrirVisor({ items: [{ url: 'a.png' }] }), false, 'sin motor no abre');
});

console.log(`\n${passed} tests OK`);
