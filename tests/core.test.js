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
const { calcularPrecio, autoComplexity, missingSelections } = loadModule('src/core/priceEngine.ts');
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
const { sizeToPx, gidPara, resolveMockupFor, tiraOrden, precioActualizado, descripcionAuto } =
  loadModule('src/core/mockups.ts');
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

test('resolveMockupFor: override por tamaño > categoría > null', () => {
  const base = { fondo: 'fondo.webp', hueco: { x: 0, y: 0, w: 10, h: 10, rot: 0 }, forma: 'auto' };
  const mockups = [
    { ...base, id: 'a', categoria: 'Circulares' },
    { ...base, id: 'b', categoria: 'Circulares', size: '6,0 cm' },
    { ...base, id: 'c', categoria: 'Formas', forma: 'rectangulo', visible: false },
  ];
  assert.equal(resolveMockupFor({ categoria: 'Circulares', size: '6 cm' }, mockups).id, 'b');
  assert.equal(resolveMockupFor({ categoria: 'Circulares', size: '2,5 cm' }, mockups).id, 'a');
  assert.equal(resolveMockupFor({ categoria: 'Formas' }, mockups), null);
  assert.equal(resolveMockupFor({ categoria: 'Otra' }, mockups), null);
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

console.log(`\n${passed} tests OK`);