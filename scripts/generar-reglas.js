#!/usr/bin/env node
/**
 * Generador de REGLAS_COTIZADOR_META_AI.md
 *
 * Lee assets/datos_config.json y genera un documento con todas las reglas
 * de cotización, variables actuales y ejemplos calculados, listo para pegar
 * en un asistente de Meta AI (Meta AI Studio, WhatsApp Business AI, etc.).
 *
 * El documento incluye:
 *  - Rol y flujo de conversación
 *  - Catálogo completo (materiales, formas, formatos, diseños)
 *  - Variables de configuración actuales
 *  - Fórmula de cálculo paso a paso
 *  - Ejemplos resueltos (calculados con un mini motor que espeja priceEngine.ts)
 *
 * Uso: node scripts/generar-reglas.js
 */

const fs = require('fs');
const path = require('path');

// ─── Leer datos_config.json ───────────────────────────────────────────
const configPath = path.join(__dirname, '..', 'assets', 'datos_config.json');
const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const { config, materials, shapesCatalog, deliveryOptions, designOptions } = data;

// ─── Mini motor de precios (espejo de src/core/priceEngine.ts) ─────────
function calcA4Layout(rawW, rawH) {
  const w = parseFloat(String(rawW));
  const h = parseFloat(String(rawH));
  if (!w || !h || w <= 0 || h <= 0) return { qty: 0 };

  const finalW = Math.max(2, w);
  const finalH = Math.max(2, h);
  const rectWmm = finalW * 10;
  const rectHmm = finalH * 10;

  // Modo preciso: 203×271mm
  const baseSheetWmm = 203;
  const baseSheetHmm = 271;

  const orientations = [
    { sheetW: baseSheetWmm, sheetH: baseSheetHmm },
    { sheetW: baseSheetHmm, sheetH: baseSheetWmm },
  ];

  let bestQty = 0;
  for (const ori of orientations) {
    const cols = Math.floor(ori.sheetW / rectWmm);
    const rows = Math.floor(ori.sheetH / rectHmm);
    if (cols < 1 || rows < 1) continue;
    const qty = cols * rows;
    if (qty > bestQty) bestQty = qty;
  }
  return { qty: bestQty };
}

function autoComplexity(qty) {
  return Math.max(1, Math.min(10, Math.ceil(qty / 10)));
}

function round(n, d = 2) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

function calcularPrecio(order) {
  const mat = materials.find((m) => m.id === order.materialId);
  if (!mat) return null;
  const del = deliveryOptions.find((o) => o.id === order.deliveryFormat);
  const des = designOptions.find((o) => o.id === order.designType);
  if (!del || !des) return null;

  // 1. Cantidades
  let qtyPerSheet;
  if (order.shapeType === 'Rectangulares') {
    qtyPerSheet = calcA4Layout(order.customRectW, order.customRectH).qty;
  } else {
    qtyPerSheet = shapesCatalog[order.shapeType]?.[order.sizeIndex]?.qty || 0;
  }
  const totalStickers = qtyPerSheet * order.sheetsQty;

  // 2. Costos impresión
  const printCostPerSheet = mat.sheetCost + mat.inkCost + mat.printWear;

  // 3. Costos corte
  const complexity = autoComplexity(qtyPerSheet);
  const timeRange = mat.maxCutTime - mat.minCutTime;
  const complexityFactor = (complexity - 1) / 9;
  const preCutTime = mat.minCutTime + timeRange * complexityFactor;
  let baseCutTime = preCutTime;
  let cutWearCostPerSheet = mat.cutWear;
  baseCutTime *= del.cutFactor;
  cutWearCostPerSheet *= del.cutWearFactor;

  // 4. Material + merma
  const totalRawMaterial = (printCostPerSheet + cutWearCostPerSheet) * order.sheetsQty;
  const wasteAmount = totalRawMaterial * (config.wasteMargin / 100);
  const costWithWaste = totalRawMaterial + wasteAmount;

  // 5. Tiempos y mano de obra
  const designTime = des.isCustomTime
    ? order.customDesignTime
    : (des.designMinutes ?? 0);
  const variableTimeMins = (mat.printTime + baseCutTime) * order.sheetsQty;
  const totalLogisticsTime = config.timeDelivery;
  const fixedTimeMins = config.timeCustomerService + designTime;
  const totalTimeMins = fixedTimeMins + variableTimeMins + totalLogisticsTime;
  const laborCost = (totalTimeMins / 60) * config.hourlyRate;

  // 6. Precio final
  const totalCost = costWithWaste + laborCost + config.packagingCost;
  const profitAmount = totalCost * (config.profitMargin / 100);
  const finalPrice = totalCost + profitAmount;

  return {
    mat, del, des, qtyPerSheet, totalStickers, printCostPerSheet, complexity,
    complexityFactor, preCutTime, baseCutTime, cutWearCostPerSheet, totalRawMaterial,
    wasteAmount, costWithWaste, designTime, variableTimeMins, totalLogisticsTime,
    fixedTimeMins, totalTimeMins, laborCost, totalCost, profitAmount, finalPrice,
  };
}

// ─── Formateadores ─────────────────────────────────────────────────────
const pesos = (n) => '$' + Math.round(n).toLocaleString('es-AR');
const dec = (n) => round(n, 2).toString().replace('.', ',');

// ─── Generar ejemplo con pasos detallados ──────────────────────────────
function ejemplo(titulo, order) {
  const r = calcularPrecio(order);
  if (!r) return `### ${titulo}\n*Error: no se pudo calcular*`;

  const mat = r.mat;
  const del = r.del;
  const des = r.des;

  let shapeDesc;
  if (order.shapeType === 'Rectangulares') {
    shapeDesc = `Rectangular ${order.customRectW}×${order.customRectH} cm`;
  } else {
    const item = shapesCatalog[order.shapeType][order.sizeIndex];
    shapeDesc = `${order.shapeType} ${item.size}`;
  }

  return `### ${titulo}
**Datos:** ${mat.name} | ${shapeDesc} | ${del.label} | ${des.label} | ${order.sheetsQty} plancha(s)

1. Stickers por hoja: **${r.qtyPerSheet}**
2. Total stickers: ${r.qtyPerSheet} × ${order.sheetsQty} = **${r.totalStickers}**
3. Costo impresión/hoja: ${mat.sheetCost} + ${mat.inkCost} + ${mat.printWear} = **${dec(r.printCostPerSheet)}**
4. Complejidad: ⌈${r.qtyPerSheet}/10⌉ = **${r.complexity}**
5. Factor complejidad: (${r.complexity}-1)/9 = **${dec(r.complexityFactor)}**
6. Tiempo corte base: ${mat.minCutTime} + (${mat.maxCutTime}-${mat.minCutTime}) × ${dec(r.complexityFactor)} = **${dec(r.preCutTime)}**
7. Desgaste corte/hoja: ${mat.cutWear}
8. Aplicar formato (${del.label}: ×${del.cutFactor} corte, ×${del.cutWearFactor} desgaste):
   - Tiempo corte: ${dec(r.preCutTime)} × ${del.cutFactor} = **${dec(r.baseCutTime)}**
   - Desgaste corte: ${mat.cutWear} × ${del.cutWearFactor} = **${dec(r.cutWearCostPerSheet)}**
9. Material bruto: (${dec(r.printCostPerSheet)} + ${dec(r.cutWearCostPerSheet)}) × ${order.sheetsQty} = **${dec(r.totalRawMaterial)}**
10. Merma (${config.wasteMargin}%): ${dec(r.totalRawMaterial)} × ${dec(config.wasteMargin / 100)} = **${dec(r.wasteAmount)}**
11. Costo con merma: **${dec(r.costWithWaste)}**
12. Tiempo diseño: **${r.designTime} min**
13. Tiempo variable: (${mat.printTime} + ${dec(r.baseCutTime)}) × ${order.sheetsQty} = **${dec(r.variableTimeMins)} min**
14. Tiempo logística: **${r.totalLogisticsTime} min**
15. Tiempo fijo: ${config.timeCustomerService} + ${r.designTime} = **${r.fixedTimeMins} min**
16. Tiempo total: ${r.fixedTimeMins} + ${dec(r.variableTimeMins)} + ${r.totalLogisticsTime} = **${dec(r.totalTimeMins)} min**
17. Mano de obra: (${dec(r.totalTimeMins)} / 60) × ${config.hourlyRate.toLocaleString('es-AR')} = **${dec(r.laborCost)}**
18. Costo total: ${dec(r.costWithWaste)} + ${dec(r.laborCost)} + ${config.packagingCost} = **${dec(r.totalCost)}**
19. Ganancia (${config.profitMargin}%): ${dec(r.totalCost)} × ${dec(config.profitMargin / 100)} = **${dec(r.profitAmount)}**
20. **Precio final: ${pesos(r.finalPrice)}**`;
}

// ─── Generar tablas del catálogo ───────────────────────────────────────
function materialesTable() {
  let lines = [
    '| Material | Costo hoja | Tiempo impresión | Costo tinta | Desgaste impresión | Corte mín | Corte máx | Desgaste corte |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const m of materials.filter((m) => m.visible !== false)) {
    lines.push(
      `| ${m.name} | ${m.sheetCost} | ${m.printTime} | ${m.inkCost} | ${m.printWear} | ${m.minCutTime} | ${m.maxCutTime} | ${m.cutWear} |`,
    );
  }
  return lines.join('\n');
}

function formasTable() {
  let lines = [];
  for (const [category, items] of Object.entries(shapesCatalog)) {
    const visible = items.filter((it) => it.visible !== false);
    if (visible.length === 0) continue;
    lines.push(`\n**${category}:**`);
    lines.push('| Tamaño | Stickers por hoja |');
    lines.push('|---|---|');
    for (const it of visible) {
      lines.push(`| ${it.size} | ${it.qty} |`);
    }
  }
  return lines.join('\n');
}

function formatosTable() {
  let lines = ['| Formato | Factor corte | Factor desgaste |', '|---|---|---|'];
  for (const o of deliveryOptions.filter((o) => o.visible !== false)) {
    lines.push(`| ${o.label} | ${o.cutFactor} | ${o.cutWearFactor} |`);
  }
  return lines.join('\n');
}

function disenosTable() {
  let lines = ['| Tipo | Minutos de diseño | Tiempo personalizado |', '|---|---|---|'];
  for (const o of designOptions.filter((o) => o.visible !== false)) {
    const mins = o.isCustomTime ? 'Variable' : (o.designMinutes ?? 0);
    const custom = o.isCustomTime ? 'Sí' : 'No';
    lines.push(`| ${o.label} | ${mins} | ${custom} |`);
  }
  return lines.join('\n');
}

// ─── Documento completo ─────────────────────────────────────────────────
const doc = `# REGLAS DE COTIZACIÓN — STICKERS MUY ÚNICOS

## TU ROL
Sos el asistente de Muy Únicos, empresa de stickers personalizados. Tu trabajo es atender clientes por WhatsApp, ayudarlos a elegir opciones y calcular el precio exacto usando la fórmula de este documento. Sé amable, claro y ágil. Si el cliente pregunta algo que no sabés, derivá al cotizador web: https://muyunicos.com/cotizador

## FLUJO DE CONVERSACIÓN
Preguntá al cliente en este orden (no avances al siguiente paso hasta tener la respuesta):
1. **Material** → ¿Papel Adhesivo o Vinilo?
2. **Forma y tamaño** → ¿Circular, Forma especial, o Rectangular (con medidas en cm)?
3. **Formato de entrega** → ¿Sin cortar, Plancha (medio corte), o Cortados sueltos?
4. **Diseño** → ¿Ya tenés diseño, necesitás armado básico, o diseño a medida?
5. **Cantidad de planchas** → ¿Cuántas planchas A4?

Cuando tengas los 5 datos, calculá el precio con la fórmula y presentalo.

## CATÁLOGO DE OPCIONES

### Materiales
${materialesTable()}

### Formas y tamaños (stickers por hoja A4)
${formasTable()}

### Rectangulares (medidas libres)
El cliente da ancho y alto en cm (mínimo 2×2). Se calcula cuántos entran en una hoja A4 útil de 203×271 mm:
1. Convertir a mm (×10)
2. Probar orientación normal: columnas = ⌊203 / ancho_mm⌋, filas = ⌊271 / alto_mm⌋
3. Probar orientación rotada: columnas = ⌊271 / ancho_mm⌋, filas = ⌊203 / alto_mm⌋
4. Elegir la orientación con más stickers. Stickers por hoja = columnas × filas

### Formatos de entrega
${formatosTable()}

### Tipos de diseño
${disenosTable()}

> **Nota:** "Diseño a medida" no se ofrece directamente, pero existe para casos especiales. Tiempo por defecto: 45 min (o el que indique el cliente).

## VARIABLES DE CONFIGURACIÓN
- Costo por hora: **$${config.hourlyRate.toLocaleString('es-AR')}**
- Costo de empaquetado: **$${config.packagingCost}**
- Margen de merma: **${config.wasteMargin}%**
- Margen de ganancia: **${config.profitMargin}%**
- Tiempo de atención al cliente: **${config.timeCustomerService} min**
- Tiempo de entrega/logística: **${config.timeDelivery} min**

## FÓRMULA DE CÁLCULO — PASO A PASO

### Paso 1: Stickers por hoja
- Circular/Forma: buscar en la tabla de arriba
- Rectangular: calcular con A4 (ver sección anterior)
- **Total stickers** = stickers por hoja × cantidad de planchas

### Paso 2: Costo de impresión por hoja
\`costoImpresion = costoHoja + costoTinta + desgasteImpresion\`
(usa los valores del material elegido)

### Paso 3: Complejidad (1 a 10)
\`complejidad = máximo(1, mínimo(10, redondearArriba(stickersPorHoja / 10)))\`
Ej: 36 → 4 | 60 → 6 | 90 → 9 | 8 → 1

### Paso 4: Costo de corte por hoja
\`rangoTiempo = tiempoCorteMáx - tiempoCorteMín\`
\`factorComplejidad = (complejidad - 1) / 9\`
\`tiempoCorteBase = tiempoCorteMín + rangoTiempo × factorComplejidad\`
\`desgasteCorte = desgasteCorteMaterial\`

Aplicar formato de entrega:
\`tiempoCorteBase = tiempoCorteBase × factorCorte\`
\`desgasteCorte = desgasteCorte × factorDesgaste\`

### Paso 5: Total de material + merma
\`materialBruto = (costoImpresion + desgasteCorte) × cantidadPlanchas\`
\`merma = materialBruto × (margenMerma / 100)\`
\`costoConMerma = materialBruto + merma\`

### Paso 6: Tiempos y mano de obra
\`tiempoDiseño = minutos del tipo elegido (o tiempo personalizado si es a medida)\`
\`tiempoVariable = (tiempoImpresion + tiempoCorteBase) × cantidadPlanchas\`
\`tiempoLogistica = ${config.timeDelivery} min (fijo)\`
\`tiempoFijo = ${config.timeCustomerService} + tiempoDiseño\`
\`tiempoTotal = tiempoFijo + tiempoVariable + tiempoLogistica\`
\`manoObra = (tiempoTotal / 60) × ${config.hourlyRate.toLocaleString('es-AR')}\`

### Paso 7: Precio final
\`costoTotal = costoConMerma + manoObra + ${config.packagingCost}\`
\`ganancia = costoTotal × (${config.profitMargin} / 100)\`
\`precioFinal = costoTotal + ganancia\`

## EJEMPLOS RESUELTOS

${ejemplo('Ejemplo 1: Vinilo circular en plancha', { materialId: 'm1', shapeType: 'Circulares', sizeIndex: 2, customRectW: '', customRectH: '', sheetsQty: 5, deliveryFormat: 'plancha', designType: 'none', complexity: 4, customDesignTime: 45 })}

${ejemplo('Ejemplo 2: Papel circular cortado suelto con armado', { materialId: 'm2', shapeType: 'Circulares', sizeIndex: 1, customRectW: '', customRectH: '', sheetsQty: 3, deliveryFormat: 'individual', designType: 'basic', complexity: 6, customDesignTime: 45 })}

${ejemplo('Ejemplo 3: Vinilo rectangular sin cortar', { materialId: 'm1', shapeType: 'Rectangulares', sizeIndex: -1, customRectW: 5, customRectH: 3, sheetsQty: 10, deliveryFormat: 'sincorte', designType: 'none', complexity: 4, customDesignTime: 45 })}

## CIERRE DE COTIZACIÓN
Al presentar el precio al cliente:
- Redondeá el precio final a número entero
- Mostrá: material, formato, medida, total de stickers, planchas y precio
- Compartí el link del cotizador: **https://muyunicos.com/cotizador**
- Aclará que el precio es estimativo y puede variar según el diseño final
- Si el cliente quiere confirmar, derivá al cotizador web para que arme el pedido

---
*Documento generado automáticamente desde datos_config.json por \`scripts/generar-reglas.js\`*
*Última actualización: ${new Date().toLocaleDateString('es-AR')}*
`;

// ─── Escribir archivo ──────────────────────────────────────────────────
const outPath = path.join(__dirname, '..', 'REGLAS_COTIZADOR_META_AI.md');
fs.writeFileSync(outPath, doc, 'utf-8');
console.log('✅ Documento generado: REGLAS_COTIZADOR_META_AI.md');
console.log(`📊 Tamaño: ${(doc.length / 1024).toFixed(1)} KB (${doc.length} caracteres)`);