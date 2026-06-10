import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator, Package, Printer, Clock, TrendingUp,
  Scissors, Trash2, Plus, ArrowUp, ArrowDown,
  ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, Users, Settings,
  Image as ImageIcon, LayoutDashboard, Palette, Info, Loader2, AlertTriangle,
} from 'lucide-react';

import type { A4Layout, Order } from './types';
import { ASSETS_URL, CAN_BE_ADMIN } from './core/wp';
import { decodeOrder } from './core/orderCodec';
import { calcA4Layout } from './core/a4Layout';
import { calcularPrecio, autoComplexity } from './core/priceEngine';
import { buildShareUrl, buildWhatsappMessage, buildWhatsappLink } from './core/whatsapp';
import { useConfig } from './hooks/useConfig';
import PriceTable from './components/PriceTable';

const ASSETS_PATH = ASSETS_URL;

const App = () => {
  const [isAdmin, setIsAdmin] = useState(CAN_BE_ADMIN);
  const [activeTab, setActiveTab] = useState<'calculator' | 'settings'>('calculator');
  const [showMathDetail, setShowMathDetail] = useState(false);
  const [showAllMaterials, setShowAllMaterials] = useState(false);

  // --- PERSISTENCIA EN SERVIDOR (WordPress) ---
  // Sin defaults en código: config/materials/shapesCatalog se hidratan del archivo.
  const {
    config, materials, shapesCatalog,
    setConfig, setMaterials, setShapesCatalog,
    isLoaded, loadError,
  } = useConfig(isAdmin);

  const [order, setOrder] = useState<Order>(() => {
    // Si viene una orden por URL, la cargamos automáticamente
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlOrder = params.get('o');
      if (urlOrder) {
        try {
          return decodeOrder(urlOrder);
        } catch (e) {
          console.error('Error al cargar la orden desde la URL', e);
        }
      }
    }
    return {
      shapeType: 'Circulares',
      sizeIndex: 0,
      customRectW: 5,
      customRectH: 5,
      sheetsQty: 1,
      materialId: 'm1',
      deliveryFormat: 'sincorte',
      complexity: 3,
      designType: 'none',
      customDesignTime: 45,
    };
  });

  // Asegurar que el material seleccionado existe al cargar
  useEffect(() => {
    if (materials && materials.length > 0 && !materials.find((m) => m.id === order.materialId)) {
      setOrder((prev) => ({ ...prev, materialId: materials[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materials]);

  // --- CALCULADORA DE HOJA A4 PARA RECTANGULARES ---
  const customRectMath: A4Layout = useMemo(() => {
    if (order.shapeType !== 'Rectangulares') {
      return { qty: 0, fitType: 'none', renderW: 0, renderH: 0 };
    }
    return calcA4Layout(order.customRectW, order.customRectH);
  }, [order.customRectW, order.customRectH, order.shapeType]);

  // --- AUTO-AJUSTAR COMPLEJIDAD DEL CORTE AL CAMBIAR TAMAÑO/FORMA ---
  useEffect(() => {
    if (!shapesCatalog) return;
    const qtyStickersPerSheet = order.shapeType === 'Rectangulares'
      ? customRectMath.qty
      : (shapesCatalog[order.shapeType]?.[order.sizeIndex]?.qty || 0);
    const auto = autoComplexity(qtyStickersPerSheet);
    setOrder((prev) => (prev.complexity !== auto ? { ...prev, complexity: auto } : prev));
  }, [order.shapeType, order.sizeIndex, order.customRectW, order.customRectH, customRectMath.qty, shapesCatalog]);

  // --- MOTOR DE PRECIOS (función pura) ---
  const results = useMemo(() => {
    if (!config || !materials || !shapesCatalog) return null;
    return calcularPrecio(order, config, materials, shapesCatalog);
  }, [order, config, materials, shapesCatalog]);

  // --- HANDLERS (Admin) ---
  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev) => {
      if (!prev) return prev;
      const val = type === 'checkbox' ? checked : parseFloat(value) || 0;
      const next = { ...prev, [name]: val };
      if (next.calcSalaryMode && (name === 'monthlySalary' || name === 'weeklyHours' || name === 'calcSalaryMode')) {
        next.hourlyRate = Math.round(next.monthlySalary / (next.weeklyHours * 4.33));
      }
      return next;
    });
  };

  const updateMaterial = (id: string, field: string, value: string) =>
    setMaterials((prev) =>
      prev
        ? prev.map((m) => (m.id === id ? { ...m, [field]: field === 'name' ? value : parseFloat(value) || 0 } : m))
        : prev,
    );

  const addMaterial = () => {
    const newId = `m${Date.now()}`;
    setMaterials((prev) =>
      prev
        ? [...prev, { id: newId, name: 'Nuevo Material', sheetCost: 0, printTime: 2, inkCost: 0, printWear: 0, minCutTime: 1, maxCutTime: 5, cutWear: 0 }]
        : prev,
    );
    setOrder((o) => ({ ...o, materialId: newId }));
  };

  const removeMaterial = (id: string) => {
    if (!materials || materials.length <= 1) return;
    const filtered = materials.filter((m) => m.id !== id);
    setMaterials(filtered);
    if (order.materialId === id) setOrder({ ...order, materialId: filtered[0].id });
  };

  const moveMaterial = (index: number, direction: -1 | 1) => {
    if (!materials) return;
    const nm = [...materials];
    if (direction === -1 && index > 0) {
      [nm[index - 1], nm[index]] = [nm[index], nm[index - 1]];
      setMaterials(nm);
    } else if (direction === 1 && index < nm.length - 1) {
      [nm[index + 1], nm[index]] = [nm[index], nm[index + 1]];
      setMaterials(nm);
    }
  };

  const updateShapeCatalog = (category: string, index: number, field: 'size' | 'qty', value: string) => {
    setShapesCatalog((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [category]: prev[category].map((it, i) =>
          i === index ? { ...it, [field]: field === 'qty' ? parseInt(value) || 0 : value } : it,
        ),
      };
    });
  };

  const addShapeItem = (category: string) => {
    setShapesCatalog((prev) =>
      prev ? { ...prev, [category]: [...prev[category], { size: 'Nuevo', qty: 10 }] } : prev,
    );
  };

  const removeShapeItem = (category: string, index: number) => {
    if (!shapesCatalog) return;
    const nc = { ...shapesCatalog, [category]: shapesCatalog[category].filter((_, i) => i !== index) };
    setShapesCatalog(nc);
    if (order.shapeType === category && order.sizeIndex >= nc[category].length) {
      setOrder({ ...order, sizeIndex: Math.max(0, nc[category].length - 1) });
    }
  };

  // --- VARIABLES DERIVADAS PARA WHATSAPP Y TICKET ---
  const sizeText = order.shapeType === 'Rectangulares'
    ? `${order.customRectW}x${order.customRectH}cm`
    : shapesCatalog?.[order.shapeType]?.[order.sizeIndex]?.size || '';

  const shareUrl = buildShareUrl(order);
  const wpMessage = buildWhatsappMessage(order, results, sizeText, shareUrl);
  const whatsappLink = buildWhatsappLink(wpMessage);

  // --- ESTADOS DE CARGA / ERROR ---
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-500 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Cargando configuración…</p>
      </div>
    );
  }

  if (loadError || !config || !materials || !shapesCatalog) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 p-6 text-center font-sans">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <h2 className="text-lg font-bold text-slate-800">No se pudo cargar la configuración</h2>
        <p className="text-sm text-slate-500 max-w-md">
          No se pudo leer <code className="bg-slate-100 px-1 rounded">datos_config.json</code>.
          {loadError ? ` Detalle: ${loadError}.` : ''} Verificá que el archivo exista y tenga la
          estructura esperada (config, materials, shapesCatalog).
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header Superior Dinámico */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex-1 w-full flex justify-between md:justify-start items-center">
            <div>
              <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                <Package className="w-7 h-7 text-blue-600" />
                Armá tus Stickers
              </h1>
              {isAdmin && <p className="text-emerald-600 text-sm mt-1 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Modo Administrador Activo</p>}
            </div>

            {/* Toggle móvil para vista cliente/admin (solo admin real de WP) */}
            {CAN_BE_ADMIN && (
              <div className="md:hidden">
                <button onClick={() => setIsAdmin(!isAdmin)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-blue-600" title="Alternar Vista">
                  {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 mt-4 md:mt-0">
            {/* Toggle Desktop (solo admin real de WP) */}
            {CAN_BE_ADMIN && (
              <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 font-medium">
                <span className={!isAdmin ? 'text-slate-800 font-bold' : ''}>Cliente</span>
                <button
                  onClick={() => setIsAdmin(!isAdmin)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors relative ${isAdmin ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isAdmin ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
                <span className={isAdmin ? 'text-emerald-600 font-bold' : ''}>Admin</span>
              </div>
            )}

            {isAdmin && (
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setActiveTab('calculator')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'calculator' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Calculator className="w-4 h-4" /> Cotizador
                </button>
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Settings className="w-4 h-4" /> Admin
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        {activeTab === 'calculator' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* COLUMNA IZQUIERDA: CONFIGURADOR UI */}
            <div className="lg:col-span-7 space-y-6">

              {/* Paso 1: Material */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 w-6 h-6 flex items-center justify-center rounded-full text-sm">1</span>
                    Elegí el material
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(showAllMaterials ? materials : materials.slice(0, 2)).map((m) => (
                    <button key={m.id} onClick={() => setOrder({ ...order, materialId: m.id })}
                      className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group ${order.materialId === m.id ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
                      {order.materialId === m.id && <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>}
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors pr-6">{m.name}</span>
                        {order.materialId === m.id && <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 absolute top-4 right-4" />}
                      </div>
                    </button>
                  ))}
                </div>

                {materials.length > 2 && (
                  <button
                    onClick={() => setShowAllMaterials(!showAllMaterials)}
                    className="mt-4 w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {showAllMaterials ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showAllMaterials ? 'Ocultar materiales extra' : `Ver más opciones (${materials.length - 2})`}
                  </button>
                )}
              </div>

              {/* Paso 2: Forma y Tamaño */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 w-6 h-6 flex items-center justify-center rounded-full text-sm">2</span>
                  Forma y Tamaño
                </h2>

                {/* Selector de tipo de forma */}
                <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-xl overflow-x-auto">
                  {['Circulares', 'Rectangulares', 'Formas'].map((shape) => (
                    <button key={shape} onClick={() => setOrder({ ...order, shapeType: shape, sizeIndex: 0 })}
                      className={`flex-1 min-w-[110px] py-2.5 px-3 text-sm font-semibold rounded-lg transition-all ${order.shapeType === shape ? 'bg-white shadow-sm border border-slate-200 text-blue-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}>
                      {shape}
                    </button>
                  ))}
                </div>

                {/* Contenido condicional según la forma */}
                {order.shapeType === 'Rectangulares' ? (

                  // VISTA PARA RECTANGULARES (Personalizado y Canvas A4)
                  <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <div className="flex-1 space-y-4 w-full">
                      <p className="text-sm text-slate-600 font-medium">Ingresá la medida exacta de tu diseño:</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Ancho (cm)</label>
                          <input type="number" min="2" step="0.5" value={order.customRectW} onChange={(e) => setOrder({ ...order, customRectW: e.target.value })} className="w-full p-3 border-2 border-slate-300 rounded-xl focus:border-blue-500 outline-none font-bold text-lg text-center bg-white shadow-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Alto (cm)</label>
                          <input type="number" min="2" step="0.5" value={order.customRectH} onChange={(e) => setOrder({ ...order, customRectH: e.target.value })} className="w-full p-3 border-2 border-slate-300 rounded-xl focus:border-blue-500 outline-none font-bold text-lg text-center bg-white shadow-sm" />
                        </div>
                      </div>

                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-start gap-3 mt-4">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-bold text-blue-900">Calculador A4 Inteligente</div>
                          <div className="text-xs text-blue-700 mt-0.5">Entran <strong>{customRectMath.qty}</strong> unidades por cada plancha impresa.</div>
                        </div>
                      </div>
                    </div>

                    {/* Representación Visual de la Hoja */}
                    <div className="w-32 h-[180px] bg-white border-2 border-slate-300 rounded-md shadow-sm relative flex flex-col items-center justify-center p-2 flex-shrink-0">
                      <div className="absolute top-1 left-2 text-[8px] text-slate-400 font-bold uppercase">Hoja A4</div>

                      {customRectMath.qty > 0 && (
                        <div className="relative w-full h-full border border-dashed border-slate-200 mt-2 flex items-center justify-center overflow-hidden">
                          <div className="bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center shadow-sm"
                            style={{
                              width: `${(customRectMath.renderW / 19) * 100}%`,
                              height: `${(customRectMath.renderH / 27.7) * 100}%`,
                              maxWidth: '95%', maxHeight: '95%',
                            }}>
                            <ImageIcon className="w-4 h-4 text-blue-600/50" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                ) : (

                  // VISTA PARA CIRCULARES Y FORMAS (Catálogo con imágenes)
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {shapesCatalog[order.shapeType]?.map((s, idx) => {
                      const shapeIndex = Object.keys(shapesCatalog).indexOf(order.shapeType) + 1;
                      const imageFileName = `2_${shapeIndex}_${idx + 1}.png`; // Ej: 2_1_1.png
                      const imagePath = `${ASSETS_PATH}/${imageFileName}`;

                      return (
                        <button key={idx} onClick={() => setOrder({ ...order, sizeIndex: idx })}
                          className={`p-3 rounded-xl border transition-all text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[100px] ${order.sizeIndex === idx ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-inner' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>

                          {/* Contenedor de Imagen de Preview (Se oculta suavemente si no existe) */}
                          <div className="w-12 h-12 mb-2 flex items-center justify-center opacity-80">
                            <img
                              src={imagePath}
                              alt={s.size}
                              className="w-full h-full object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            {/* Placeholder sutil para diseño si la imagen no carga */}
                            <div className="absolute -z-10 w-8 h-8 rounded-full border-2 border-slate-200 border-dashed"></div>
                          </div>

                          {order.sizeIndex === idx && <div className="absolute inset-0 border-2 border-blue-600 rounded-xl pointer-events-none"></div>}
                          <div className="font-bold">{s.size}</div>
                          <div className="text-xs mt-0.5 font-medium text-slate-500">{s.qty} uni/plancha</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Paso 3: Diseño y Entrega */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 w-6 h-6 flex items-center justify-center rounded-full text-sm">3</span>
                  Detalles Finales
                </h2>

                {/* 3.1 Diseño */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Tu Diseño</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button onClick={() => setOrder({ ...order, designType: 'none' })} className={`p-4 rounded-xl border-2 text-left relative transition-all flex items-center gap-3 ${order.designType === 'none' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                      <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${order.designType === 'none' ? 'text-blue-600' : 'text-slate-300'}`} />
                      <div>
                        <div className="font-bold text-sm text-slate-800">Ya lo tengo listo</div>
                        <div className="text-xs text-slate-500 mt-0.5">Archivo preparado para impresión.</div>
                      </div>
                    </button>
                    <button onClick={() => setOrder({ ...order, designType: 'basic' })} className={`p-4 rounded-xl border-2 text-left relative transition-all flex items-center gap-3 ${order.designType === 'basic' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                      <Palette className={`w-5 h-5 flex-shrink-0 ${order.designType === 'basic' ? 'text-blue-600' : 'text-slate-300'}`} />
                      <div>
                        <div className="font-bold text-sm text-slate-800">Incluir armado básico</div>
                        <div className="text-xs text-slate-500 mt-0.5">Acomodamos tu logo/imagen.</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 3.2 Corte/Formato */}
                <div className="mb-8">
                  <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Formato de Entrega</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                    {/* 1. Sin corte */}
                    <button onClick={() => setOrder({ ...order, deliveryFormat: 'sincorte' })} className={`p-4 rounded-xl border-2 text-left relative transition-all ${order.deliveryFormat === 'sincorte' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                      <div className="font-bold text-sm text-slate-800">Sin Cortar (Solo Impresión)</div>
                      <div className="text-xs text-slate-500 mt-1">Impresión con tintas UV, vos lo cortas a mano.</div>
                      {order.deliveryFormat === 'sincorte' && <CheckCircle2 className="w-5 h-5 text-blue-600 absolute top-4 right-4" />}
                    </button>

                    {/* 2. Troquelados Individuales */}
                    <button onClick={() => setOrder({ ...order, deliveryFormat: 'individual' })} className={`p-4 rounded-xl border-2 text-left relative transition-all shadow-sm ${order.deliveryFormat === 'individual' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                      <div className="font-bold text-sm text-slate-800">Troquelados Sueltos (Corte Individual)</div>
                      <div className="text-xs text-slate-500 mt-1">Stickers cortados uno por uno, listos para repartir.</div>
                      {order.deliveryFormat === 'individual' && <CheckCircle2 className="w-5 h-5 text-blue-600 absolute top-4 right-4" />}
                    </button>

                    {/* 3. Planchas Medio Corte */}
                    <button onClick={() => setOrder({ ...order, deliveryFormat: 'plancha' })} className={`p-4 rounded-xl border-2 text-left relative transition-all ${order.deliveryFormat === 'plancha' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                      <div className="font-bold text-sm text-slate-800">Planchas A4 (Medio Corte)</div>
                      <div className="text-xs text-slate-500 mt-1">Ideales para despegar vos mismo rápidamente.</div>
                      {order.deliveryFormat === 'plancha' && <CheckCircle2 className="w-5 h-5 text-blue-600 absolute top-4 right-4" />}
                    </button>

                  </div>
                </div>

                {/* 3.3 Cantidad */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <label className="block text-sm font-bold text-slate-800 mb-4">¿Cuántas planchas necesitas?</label>
                  <div className="flex items-center gap-6">
                    <input type="range" min="1" max="100" value={order.sheetsQty} onChange={(e) => setOrder({ ...order, sheetsQty: parseInt(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    <div className="relative flex-shrink-0">
                      <input type="number" min="1" value={order.sheetsQty} onChange={(e) => setOrder({ ...order, sheetsQty: parseInt(e.target.value) || 1 })} className="w-24 text-center font-black text-xl bg-white border-2 border-blue-200 text-blue-800 py-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all shadow-sm" />
                      <span className="absolute -bottom-5 left-0 w-full text-center text-[10px] text-slate-400 font-medium uppercase tracking-wider">Planchas</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ajustes Manuales ADMIN */}
              {isAdmin && (
                <div className="bg-amber-50 p-6 rounded-2xl border-2 border-amber-200 shadow-sm">
                  <h3 className="text-sm font-black text-amber-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <ShieldCheck className="w-5 h-5" /> Ajustes Manuales (Solo Admin)
                  </h3>

                  <div className="space-y-5">
                    <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-sm">
                      <div className="flex justify-between mb-2 items-center">
                        <label className="text-sm font-bold text-slate-700">Complejidad Forzada del Corte</label>
                        <span className="text-xs font-black text-white bg-amber-500 px-2 py-1 rounded-md">
                          Nivel {order.complexity} / 10
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">Afecta el tiempo de corte estimado: ~{results?.baseCutTime?.toFixed(1)} min/plancha.</p>
                      <input type="range" min="1" max="10" value={order.complexity} onChange={(e) => setOrder({ ...order, complexity: parseInt(e.target.value) })} className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-sm">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Forzar Tiempo de Diseño Personalizado</label>
                      <select value={order.designType} onChange={(e) => setOrder({ ...order, designType: e.target.value as Order['designType'], ...(e.target.value === 'custom' ? { customDesignTime: config.timeDesignCustom } : {}) })} className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 font-medium focus:ring-2 focus:ring-amber-500 outline-none">
                        <option value="none">Sin costo (+0 min)</option>
                        <option value="basic">Armado en plancha (+{config.timeDesignBasic} min)</option>
                        <option value="custom">A medida (+{order.customDesignTime} min)</option>
                      </select>

                      {order.designType === 'custom' && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <div className="flex justify-between mb-2">
                            <label className="text-sm font-semibold text-slate-600">Minutos estimados de diseño</label>
                            <span className="text-sm font-bold text-amber-700">{order.customDesignTime} min</span>
                          </div>
                          <input type="range" min="5" max="120" step="5" value={order.customDesignTime} onChange={(e) => setOrder({ ...order, customDesignTime: parseInt(e.target.value) })} className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* COLUMNA DERECHA: RESULTADOS (Ticket) */}
            <div className="lg:col-span-5 relative">
              <div className="sticky top-6 space-y-6">

                {/* Tarjeta Cliente Resumen (Hero Card) */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-8 rounded-3xl shadow-xl border border-slate-700 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
                  <div className="absolute left-10 -bottom-10 w-32 h-32 bg-blue-400/10 rounded-full blur-xl"></div>

                  <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                    <Calculator className="w-4 h-4" /> Resumen de tu pedido
                  </h3>

                  <div className="space-y-4 mb-8 relative z-10">
                    <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
                      <span className="text-slate-300 font-medium">Material:</span>
                      <span className="text-white text-sm font-semibold text-right max-w-[60%]">{results?.activeMaterial?.name}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
                      <span className="text-slate-300 font-medium">Formato:</span>
                      <span className="text-white text-sm font-semibold">{order.deliveryFormat === 'sincorte' ? 'Sin Cortar' : (order.deliveryFormat === 'individual' ? 'Troquel Individual' : 'Planchas (Medio corte)')}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-700/50 pb-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 font-medium">Total Stickers:</span>
                        <span className="text-xl font-bold text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-600">~{results?.totalStickers ?? 0} unid.</span>
                      </div>
                      {(results?.totalStickers ?? 0) > 0 && (
                        <div className="text-xs text-slate-400 mt-1.5 text-right font-medium">
                          ({order.sheetsQty} planchas de {order.shapeType} {sizeText})
                        </div>
                      )}
                    </div>
                    {(results?.totalStickers ?? 0) > 0 && (
                      <div className="flex justify-between items-center pb-2">
                        <span className="text-slate-300 font-medium">Valor por unidad:</span>
                        <span className="font-medium text-slate-300">${results?.pricePerSticker?.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>

                  <div className="relative z-10 bg-slate-800/50 p-5 rounded-2xl border border-slate-700 backdrop-blur-sm">
                    <span className="text-slate-400 text-sm font-medium block mb-1">Inversión Total Estimada</span>
                    <div className="text-5xl md:text-6xl font-black text-emerald-400 tracking-tight drop-shadow-md">
                      ${results?.finalPrice?.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </div>
                  </div>

                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="relative z-10 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl mt-6 transition-colors text-lg shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2">
                    <Package className="w-5 h-5" /> Añadir al Pedido
                  </a>
                </div>

                {/* Tabla de precio por cantidad (economía de escala) */}
                <PriceTable order={order} config={config} materials={materials} shapesCatalog={shapesCatalog} />

                {/* Resumen Interno Admin */}
                {isAdmin && (
                  <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
                    <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex justify-between items-center">
                      <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" /> Rentabilidad (Interno)
                      </h4>
                    </div>
                    <div className="p-5 space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 flex items-center gap-1.5"><Printer className="w-4 h-4" /> Costo Materiales:</span>
                        <span className="font-bold text-slate-800">${results?.costWithWaste?.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Costo Tiempo ({results?.totalTimeMins?.toFixed(0)}m):</span>
                        <span className="font-bold text-slate-800">${results?.laborCost?.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 flex items-center gap-1.5"><Package className="w-4 h-4" /> Packaging Fijo:</span>
                        <span className="font-bold text-slate-800">${config.packagingCost?.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between font-black mt-3 pt-3 border-t-2 border-dashed border-emerald-100 text-emerald-600 text-base">
                        <span>Ganancia Neta ({config.profitMargin}%):</span>
                        <span>${results?.profitAmount?.toFixed(0)}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100">
                      <button
                        onClick={() => setShowMathDetail(!showMathDetail)}
                        className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600 font-semibold text-xs uppercase tracking-wider"
                      >
                        <span className="flex items-center gap-2"><Calculator className="w-4 h-4" /> Ver fórmulas exactas</span>
                        {showMathDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {showMathDetail && results && (
                        <div className="p-5 bg-slate-900 space-y-4 text-xs font-mono text-slate-300">
                          <div>
                            <h4 className="font-bold text-emerald-400 mb-1 border-b border-slate-700 pb-1">1. Costos de Material</h4>
                            <p>Impr. x Plancha: ${results.activeMaterial?.sheetCost} (H) + ${results.activeMaterial?.inkCost} (T) + ${results.activeMaterial?.printWear} (D) = ${results.printCostPerSheet}</p>
                            <p>Corte x Plancha: ${results.cutWearCostPerSheet?.toFixed(2)}</p>
                            <p>Total {order.sheetsQty} planchas = ${(results.printCostPerSheet + results.cutWearCostPerSheet) * order.sheetsQty}</p>
                            <p className="text-rose-400">+ Merma ({config.wasteMargin}%): ${results.wasteAmount?.toFixed(2)}</p>
                            <p className="text-white mt-1">= Total Materiales: ${results.costWithWaste?.toFixed(2)}</p>
                          </div>

                          <div>
                            <h4 className="font-bold text-blue-400 mb-1 border-b border-slate-700 pb-1 mt-3">2. Costos de Tiempo</h4>
                            <p>Valor Hora Base: ${config.hourlyRate}</p>
                            <p>Atención + Diseño: {config.timeCustomerService} + {results.designTime} min.</p>
                            <p>Impresión: {results.activeMaterial?.printTime * order.sheetsQty} min.</p>
                            <p>Corte: {(results.baseCutTime * order.sheetsQty).toFixed(1)} min.</p>
                            <p>Logística: {results.totalLogisticsTime} min.</p>
                            <p>Total Mins: {results.totalTimeMins?.toFixed(1)} min.</p>
                            <p className="text-white mt-1">= Costo (Mins/60 * ValorHora): ${results.laborCost?.toFixed(2)}</p>
                          </div>

                          <div>
                            <h4 className="font-bold text-purple-400 mb-1 border-b border-slate-700 pb-1 mt-3">3. Suma Final</h4>
                            <p>Subtotal (Mat + Tiem + Pack): ${results.totalCost?.toFixed(2)}</p>
                            <p>Ganancia ({config.profitMargin}%): ${results.profitAmount?.toFixed(2)}</p>
                            <p className="font-bold text-white mt-1 text-sm">= PRECIO FINAL: ${results.finalPrice?.toFixed(2)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (

          /* PESTAÑA SETTINGS (ADMIN PANEL) */
          <div className="space-y-8 animate-in fade-in duration-300">

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
                <LayoutDashboard className="w-6 h-6 text-blue-600" /> Configuración de Formas y Tamaños
              </h2>
              <p className="text-sm text-slate-500 mb-6">Administra las opciones predefinidas y la cantidad de stickers que entran por hoja A4. Rectangulares se calcula automáticamente.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {Object.keys(shapesCatalog).map((category) => (
                  <div key={category} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="font-bold text-slate-700">{category}</h3>
                      <button onClick={() => addShapeItem(category)} className="text-xs bg-white border border-slate-300 text-slate-600 px-2 py-1 rounded hover:text-blue-600 hover:border-blue-400 transition-colors">+ Añadir Tamaño</button>
                    </div>
                    <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
                      {shapesCatalog[category].map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input type="text" value={item.size} onChange={(e) => updateShapeCatalog(category, idx, 'size', e.target.value)} className="flex-1 p-2 text-sm border border-slate-300 rounded focus:border-blue-500 outline-none" placeholder="Ej: 4,0 cm" />
                          <input type="number" value={item.qty} onChange={(e) => updateShapeCatalog(category, idx, 'qty', e.target.value)} className="w-20 p-2 text-sm border border-slate-300 rounded focus:border-blue-500 outline-none text-center" title="Stickers por hoja" />
                          <button onClick={() => removeShapeItem(category, idx)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel de Sueldo */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-blue-600" /> ¿Cuánto vale tu tiempo?
                  </h2>
                </div>
                <label className="flex items-center gap-2 text-sm bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors shadow-sm">
                  <input type="checkbox" name="calcSalaryMode" checked={config.calcSalaryMode} onChange={handleConfigChange} className="accent-blue-600 w-4 h-4" />
                  <span className="font-bold text-blue-800">Calcular según Sueldo Mensual</span>
                </label>
              </div>

              {config.calcSalaryMode ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Sueldo pretendido ($/mes)</label>
                    <input type="number" name="monthlySalary" value={config.monthlySalary} onChange={handleConfigChange} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold bg-white text-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Horas de trabajo a la semana</label>
                    <input type="number" name="weeklyHours" value={config.weeklyHours} onChange={handleConfigChange} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold bg-white text-lg" />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl flex justify-between items-center shadow-md">
                      <span className="text-sm font-medium text-blue-100 uppercase tracking-wider">Tu Valor Hora:</span>
                      <span className="text-2xl font-black">${config.hourlyRate}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-sm bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tu Valor Hora Manual ($)</label>
                  <input type="number" name="hourlyRate" value={config.hourlyRate} onChange={handleConfigChange} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold bg-white text-lg shadow-inner" />
                </div>
              )}
            </div>

            {/* Base de Materiales */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Printer className="w-6 h-6 text-blue-600" /> Base de Materiales
                  </h2>
                </div>
                <button onClick={addMaterial} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-md shadow-blue-600/20">
                  <Plus className="w-4 h-4" /> Añadir Material
                </button>
              </div>

              <div className="space-y-6">
                {materials.map((m, index) => (
                  <div key={m.id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex flex-col gap-1">
                          <button onClick={() => moveMaterial(index, -1)} disabled={index === 0} className={`p-1 rounded-md bg-white border shadow-sm ${index === 0 ? 'text-slate-300 border-slate-200' : 'text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-blue-600'}`} title="Subir"><ArrowUp className="w-3 h-3" /></button>
                          <button onClick={() => moveMaterial(index, 1)} disabled={index === materials.length - 1} className={`p-1 rounded-md bg-white border shadow-sm ${index === materials.length - 1 ? 'text-slate-300 border-slate-200' : 'text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-blue-600'}`} title="Bajar"><ArrowDown className="w-3 h-3" /></button>
                        </div>
                        <input type="text" value={m.name} onChange={(e) => updateMaterial(m.id, 'name', e.target.value)} className="font-black text-slate-800 bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none px-2 py-1 w-full max-w-sm transition-all text-lg" placeholder="Nombre del Material" />
                      </div>
                      <button onClick={() => removeMaterial(m.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors flex-shrink-0" title="Borrar Material"><Trash2 className="w-5 h-5" /></button>
                    </div>

                    <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white">
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Costo Base</h4>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Costo de 1 Hoja Blanca ($)</label>
                          <input type="number" value={m.sheetCost} onChange={(e) => updateMaterial(m.id, 'sheetCost', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                        </div>
                      </div>

                      <div className="space-y-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                        <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-2 flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Impresión x Hoja</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Costo Tinta ($)</label>
                            <input type="number" value={m.inkCost} onChange={(e) => updateMaterial(m.id, 'inkCost', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Desgaste Imp. ($)</label>
                            <input type="number" value={m.printWear} onChange={(e) => updateMaterial(m.id, 'printWear', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Tiempo de Impresión (Minutos)</label>
                            <input type="number" step="0.5" value={m.printTime} onChange={(e) => updateMaterial(m.id, 'printTime', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                        <h4 className="text-xs font-bold text-purple-600 uppercase tracking-widest border-b border-purple-100 pb-2 flex items-center gap-1.5"><Scissors className="w-3.5 h-3.5" /> Corte x Hoja</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Desgaste Cuchilla/Plotter ($)</label>
                            <input type="number" value={m.cutWear} onChange={(e) => updateMaterial(m.id, 'cutWear', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">T. Mínimo (Min)</label>
                            <input type="number" step="0.5" value={m.minCutTime} onChange={(e) => updateMaterial(m.id, 'minCutTime', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">T. Máximo (Min)</label>
                            <input type="number" step="0.5" value={m.maxCutTime} onChange={(e) => updateMaterial(m.id, 'maxCutTime', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" /> Fijos y Ganancias</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1.5">Margen de Error (%)</label>
                      <input type="number" name="wasteMargin" value={config.wasteMargin} onChange={handleConfigChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-emerald-700 mb-1.5">Ganancia Negocio (%)</label>
                      <input type="number" name="profitMargin" value={config.profitMargin} onChange={handleConfigChange} className="w-full p-2.5 border-2 border-emerald-300 bg-emerald-50 text-emerald-900 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">Costo Packaging Fijo x Pedido ($)</label>
                    <input type="number" name="packagingCost" value={config.packagingCost} onChange={handleConfigChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2"><Clock className="w-5 h-5 text-orange-500" /> Tiempos Fijos (Minutos)</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Atención al Cliente</label>
                    <input type="number" name="timeCustomerService" value={config.timeCustomerService} onChange={handleConfigChange} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Logística / Empaque</label>
                    <input type="number" name="timeDelivery" value={config.timeDelivery} onChange={handleConfigChange} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Armado en plancha</label>
                    <input type="number" name="timeDesignBasic" value={config.timeDesignBasic} onChange={handleConfigChange} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Diseño a Medida</label>
                    <input type="number" name="timeDesignCustom" value={config.timeDesignCustom} onChange={handleConfigChange} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
