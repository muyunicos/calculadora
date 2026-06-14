import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calculator, Package, Printer, Clock, TrendingUp,
  Scissors, Trash2, Plus, ArrowUp, ArrowDown,
  ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, Users, Settings,
  Image as ImageIcon, LayoutDashboard, Palette, Info, Loader2, AlertTriangle, MessageCircle,
} from 'lucide-react';

import type { A4Layout, DeliveryFormat, DesignType, GalleryItem, Order, DeliveryOption, DesignOption } from './types';
import { ASSETS_URL, CAN_BE_ADMIN } from './core/wp';
import { decodeOrder, decodeAnyOrder, encodeOrderCode } from './core/orderCodec';
import { calcA4Layout } from './core/a4Layout';
import { calcularPrecio, autoComplexity, missingSelections, galleryPricing } from './core/priceEngine';
import { buildShareUrl, buildWhatsappMessage, buildConsultWhatsappMessage, buildWhatsappLink } from './core/whatsapp';
import { useConfig } from './hooks/useConfig';
import { useCalculatorState } from './hooks/useCalculatorState';
import { useAdminState } from './hooks/useAdminState';
import { useGalleryState } from './hooks/useGalleryState';
import { CalculatorHeader } from './components/CalculatorHeader';
import { MaterialSelector } from './components/MaterialSelector';
import { ShapeSizeSelector } from './components/ShapeSizeSelector';
import { FinalDetailsSelector } from './components/FinalDetailsSelector';
import { OrderSummary } from './components/OrderSummary';
import { AdminGalleryPanel } from './components/AdminGalleryPanel';
import { AdminShapesPanel } from './components/AdminShapesPanel';
import { AdminDeliveryDesignPanel } from './components/AdminDeliveryDesignPanel';
import { AdminSalaryPanel } from './components/AdminSalaryPanel';
import { AdminMaterialsPanel } from './components/AdminMaterialsPanel';
import { AdminConfigPanel } from './components/AdminConfigPanel';
import { AdminTabs } from './components/AdminTabs';
import { AdminCostsPanel } from './components/AdminCostsPanel';
import MobileSummaryBar from './components/MobileSummaryBar';
import MiniGallery from './components/MiniGallery';
import { SaveIndicator } from './components/SaveIndicator';
import { infoBtnClass, resolveImage } from './utils/ui';

const App = () => {
  const [isAdmin, setIsAdmin] = useState(CAN_BE_ADMIN);
  const [activeTab, setActiveTab] = useState<'calculator' | 'settings'>('calculator');
  const [activeAdminTab, setActiveAdminTab] = useState<'gallery' | 'materials' | 'shapes' | 'delivery' | 'costs'>('gallery');
  const [showMathDetail, setShowMathDetail] = useState(false);
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);
  const [expandedShapesCategory, setExpandedShapesCategory] = useState<string | null>(null);
  const [materialsShowMoreIndex, setMaterialsShowMoreIndex] = useState(2);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  // Motor de info: opción con el panel "MÁS INFO" desplegado en cada paso (null =
  // ninguno; al colapsar se cae al hint de la opción seleccionada, si tiene info).
  const [infoOpenSizeIndex, setInfoOpenSizeIndex] = useState<number | null>(null);
  const [infoOpenDeliveryId, setInfoOpenDeliveryId] = useState<DeliveryFormat | null>(null);
  const [infoOpenDesignId, setInfoOpenDesignId] = useState<DesignType | null>(null);

  // --- PERSISTENCIA EN SERVIDOR (WordPress) ---
  // Sin defaults en código: config/materials/shapesCatalog se hidratan del archivo.
  const {
    config, materials, shapesCatalog, shapesShowMoreIndex, gallery, deliveryOptions, designOptions,
    setConfig, setMaterials, setShapesCatalog, setShapesShowMoreIndex, setGallery, setDeliveryOptions, setDesignOptions,
    isLoaded, loadError, isSaving, saveError,
  } = useConfig(isAdmin);

  const [order, setOrder] = useState<Order>(() => {
    // El base64 viejo es autocontenido, así que se puede decodificar al instante
    // (sin catálogo). El código corto v1 necesita el catálogo y se aplica luego,
    // cuando termina de cargar la config (ver useEffect más abajo).
    if (typeof window !== 'undefined') {
      const urlOrder = new URLSearchParams(window.location.search).get('o');
      if (urlOrder) {
        try {
          return decodeOrder(urlOrder);
        } catch {
          /* No es base64: puede ser un código v1, se resuelve al cargar la config. */
        }
      }
    }
    // Sin defaults: todo arranca vacío. El precio aparece recién cuando el
    // cliente eligió todas las opciones.
    return {
      shapeType: '',
      sizeIndex: -1,
      customRectW: '',
      customRectH: '',
      sheetsQty: 0,
      materialId: '',
      deliveryFormat: '',
      complexity: 3,
      designType: '',
      customDesignTime: 45,
    };
  });

  // Aplica un código de pedido corto (v1) desde la URL una vez cargado el catálogo
  // (necesario para resolver los `code` de material/tamaño a forma+índice).
  const urlOrderApplied = useRef(false);
  useEffect(() => {
    if (urlOrderApplied.current || !materials || !shapesCatalog) return;
    if (typeof window === 'undefined') return;
    const urlOrder = new URLSearchParams(window.location.search).get('o');
    if (!urlOrder) return;
    urlOrderApplied.current = true;
    const decoded = decodeAnyOrder(urlOrder, materials, shapesCatalog, deliveryOptions || [], designOptions || []);
    if (decoded) setOrder(decoded);
  }, [materials, shapesCatalog, deliveryOptions, designOptions]);

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
    return calcularPrecio(order, config, materials, shapesCatalog, deliveryOptions || [], designOptions || []);
  }, [order, config, materials, shapesCatalog, deliveryOptions, designOptions]);

  // Elegir material y avanzar al paso siguiente (flujo guiado).
  const selectMaterial = (id: string) => {
    setOrder((prev) => ({ ...prev, materialId: id }));
    setActiveStep(2);
  };

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
        ? prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  [field]:
                    field === 'name' || field === 'description' || field === 'image'
                      ? value
                      : field === 'code'
                        ? parseInt(value, 10) || 0
                        : parseFloat(value) || 0,
                }
              : m,
          )
        : prev,
    );

  const addMaterial = () => {
    const newId = `m${Date.now()}`;
    setMaterials((prev) => {
      if (!prev) return prev;
      const nextCode = Math.max(9, ...prev.map((m) => m.code ?? 0)) + 1;
      return [...prev, { id: newId, code: nextCode, name: 'Nuevo Material', sheetCost: 0, printTime: 2, inkCost: 0, printWear: 0, minCutTime: 1, maxCutTime: 5, cutWear: 0 }];
    });
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

  const updateShapeCatalog = (category: string, index: number, field: 'size' | 'qty' | 'code' | 'description' | 'image', value: string) => {
    setShapesCatalog((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [category]: prev[category].map((it, i) =>
          i === index ? { ...it, [field]: field === 'size' ? value : field === 'description' || field === 'image' ? value : parseInt(value, 10) || 0 } : it,
        ),
      };
    });
  };

  const addShapeItem = (category: string) => {
    setShapesCatalog((prev) => {
      if (!prev) return prev;
      const allCodes = Object.values(prev).flatMap((items) => items.map((it) => it.code ?? 0));
      const nextCode = Math.max(199, ...allCodes) + 1;
      return { ...prev, [category]: [...prev[category], { size: 'Nuevo', qty: 10, code: nextCode }] };
    });
  };

  const removeShapeItem = (category: string, index: number) => {
    if (!shapesCatalog) return;
    const nc = { ...shapesCatalog, [category]: shapesCatalog[category].filter((_, i) => i !== index) };
    setShapesCatalog(nc);
    if (order.shapeType === category && order.sizeIndex >= nc[category].length) {
      setOrder({ ...order, sizeIndex: Math.max(0, nc[category].length - 1) });
    }
  };

  const moveShapeItem = (category: string, index: number, direction: -1 | 1) => {
    if (!shapesCatalog) return;
    const items = shapesCatalog[category];
    if (direction === -1 && index > 0) {
      const nc = [...items];
      [nc[index - 1], nc[index]] = [nc[index], nc[index - 1]];
      setShapesCatalog({ ...shapesCatalog, [category]: nc });
    } else if (direction === 1 && index < items.length - 1) {
      const nc = [...items];
      [nc[index + 1], nc[index]] = [nc[index], nc[index + 1]];
      setShapesCatalog({ ...shapesCatalog, [category]: nc });
    }
  };

  // --- OPCIONES DE ENTREGA / DISEÑO (presentación editable; el id es estable) ---
  const updateDeliveryOption = (id: DeliveryFormat, field: 'label' | 'subtitle' | 'description' | 'image' | 'visible', value: string | boolean) =>
    setDeliveryOptions((prev) => (prev ? prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)) : prev));

  const updateDesignOption = (id: DesignType, field: 'label' | 'subtitle' | 'description' | 'image' | 'visible', value: string | boolean) =>
    setDesignOptions((prev) => (prev ? prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)) : prev));

  const addDeliveryOption = () => {
    const newId = `custom_${Date.now()}` as DeliveryFormat;
    const nextCode = Math.max(0, ...(deliveryOptions || []).map((o) => o.code ?? 0)) + 1;
    setDeliveryOptions((prev) => [
      ...(prev || []),
      {
        id: newId,
        code: nextCode,
        label: 'Nuevo Formato',
        subtitle: '',
        description: '',
        image: '',
        cutFactor: 1,
        cutWearFactor: 1,
        visible: true,
      },
    ]);
  };

  const addDesignOption = () => {
    const newId = `custom_${Date.now()}` as DesignType;
    const nextCode = Math.max(0, ...(designOptions || []).map((o) => o.code ?? 0)) + 1;
    setDesignOptions((prev) => [
      ...(prev || []),
      {
        id: newId,
        code: nextCode,
        label: 'Nueva Opción',
        subtitle: '',
        description: '',
        image: '',
        designMinutes: 0,
        isCustomTime: false,
        customerVisible: true,
        visible: true,
      },
    ]);
  };

  const removeDeliveryOption = (id: DeliveryFormat) => {
    setDeliveryOptions((prev) => (prev ? prev.filter((o) => o.id !== id) : prev));
  };

  const removeDesignOption = (id: DesignType) => {
    setDesignOptions((prev) => (prev ? prev.filter((o) => o.id !== id) : prev));
  };

  const setShowMoreIndex = (category: string, index: number) => {
    if (!shapesCatalog || !shapesCatalog[category]) return;
    const itemCount = shapesCatalog[category].length;
    const validIndex = Math.max(0, Math.min(Math.floor(index), itemCount));
    setShapesShowMoreIndex((prev) => ({
      ...(prev || {}),
      [category]: validIndex,
    }));
  };

  // --- GALERÍA ---
  // Carga el pedido de una foto en la calculadora (requiere catálogo cargado).
  const loadOrderFromCode = (code: string) => {
    if (!materials || !shapesCatalog) return;
    const decoded = decodeAnyOrder(code, materials, shapesCatalog, deliveryOptions || [], designOptions || []);
    if (!decoded) {
      console.warn('Código de pedido inválido en la galería:', code);
      return;
    }
    setOrder(decoded);
    setActiveTab('calculator');
    setActiveStep(3);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateGalleryItem = (id: string, field: keyof GalleryItem, value: string) =>
    setGallery((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));

  const addGalleryItem = () =>
    setGallery((prev) => [...prev, { id: `g${Date.now()}`, image: '', title: '', caption: '', order: '' }]);

  // Precio marketinero de una foto (1 plancha vs. máximo). Requiere catálogo cargado.
  const getGalleryPricing = (code: string, displaySheets?: number) => {
    if (!config || !materials || !shapesCatalog) return null;
    const decoded = decodeAnyOrder(code, materials, shapesCatalog, deliveryOptions || [], designOptions || []);
    if (!decoded) return null;
    return galleryPricing(decoded, config, materials, shapesCatalog, deliveryOptions || [], designOptions || [], displaySheets);
  };

  const removeGalleryItem = (id: string) =>
    setGallery((prev) => prev.filter((g) => g.id !== id));

  // Vuelca el pedido actualmente configurado en el cotizador como código v1 de la
  // foto (atajo para el admin: configura el pedido y lo "captura"). Requiere que el
  // pedido esté completo.
  const captureCurrentOrder = (id: string): boolean => {
    if (!materials || !shapesCatalog) return false;
    const code = encodeOrderCode(order, materials, shapesCatalog, deliveryOptions || [], designOptions || []);
    if (!code) return false;
    updateGalleryItem(id, 'order', code);
    return true;
  };

  // --- VARIABLES DERIVADAS PARA WHATSAPP Y TICKET ---
  const sizeText = order.shapeType === 'Rectangulares'
    ? `${order.customRectW}x${order.customRectH}cm`
    : shapesCatalog?.[order.shapeType]?.[order.sizeIndex]?.size || '';

  // --- ESTADOS DE CARGA / ERROR ---
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-500 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Cargando configuración…</p>
      </div>
    );
  }

  if (loadError || !config || !materials || !shapesCatalog || !deliveryOptions || !designOptions) {
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

  const materialName = materials?.find((m) => m.id === order.materialId)?.name ?? '';
  const formatoLabel = deliveryOptions?.find((o) => o.id === order.deliveryFormat)?.label ?? '';
  const designLabel = designOptions?.find((o) => o.id === order.designType)?.label ?? '';
  const missing = missingSelections(order, materials, shapesCatalog);

  const shareUrl = materials && shapesCatalog && deliveryOptions && designOptions ? buildShareUrl(order, materials, shapesCatalog, deliveryOptions, designOptions) : '';
  const wpMessage = buildWhatsappMessage(order, results, sizeText, shareUrl);
  const whatsappLink = buildWhatsappLink(wpMessage);
  const consultMessage = buildConsultWhatsappMessage(order, results, sizeText, shareUrl);
  const consultLink = buildWhatsappLink(consultMessage);
  const orderCode = materials && shapesCatalog && deliveryOptions && designOptions ? encodeOrderCode(order, materials, shapesCatalog, deliveryOptions, designOptions) : null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
        <div className="max-w-6xl mx-auto space-y-6 pb-28 lg:pb-0">

          {/* Header Superior Dinámico */}
          <CalculatorHeader
            isAdmin={isAdmin}
            setIsAdmin={setIsAdmin}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isDeleteMode={isDeleteMode}
            setIsDeleteMode={setIsDeleteMode}
            isSaving={isSaving}
            saveError={saveError}
          />

        {/* CONTENIDO PRINCIPAL */}
        {activeTab === 'calculator' ? (
          <>
          {/* Mini-galería de ejemplos (arriba): cargar un pedido al tocar una foto. */}
          <MiniGallery items={gallery} resolveImage={resolveImage} onUse={loadOrderFromCode} getPricing={getGalleryPricing} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* COLUMNA IZQUIERDA: CONFIGURADOR UI */}
            <div className="lg:col-span-7 space-y-6">

              {/* Paso 1: Material */}
              <MaterialSelector
                materials={materials}
                materialId={order.materialId}
                selectMaterial={selectMaterial}
                showAllMaterials={showAllMaterials}
                setShowAllMaterials={setShowAllMaterials}
                expandedMaterialId={expandedMaterialId}
                setExpandedMaterialId={setExpandedMaterialId}
                infoBtnClass={infoBtnClass}
                resolveImage={resolveImage}
              />

              {/* Paso 2: Forma y Tamaño */}
              <ShapeSizeSelector
                order={order}
                setOrder={setOrder}
                shapesCatalog={shapesCatalog}
                shapesShowMoreIndex={shapesShowMoreIndex}
                customRectMath={customRectMath}
                expandedShapesCategory={expandedShapesCategory}
                setExpandedShapesCategory={setExpandedShapesCategory}
                infoOpenSizeIndex={infoOpenSizeIndex}
                setInfoOpenSizeIndex={setInfoOpenSizeIndex}
                infoBtnClass={infoBtnClass}
                resolveImage={resolveImage}
                setActiveStep={setActiveStep}
              />

              {/* Paso 3: Diseño y Entrega */}
              <FinalDetailsSelector
                order={order}
                setOrder={setOrder}
                deliveryOptions={deliveryOptions}
                designOptions={designOptions}
                config={config}
                results={results}
                isAdmin={isAdmin}
                infoOpenDeliveryId={infoOpenDeliveryId}
                infoOpenDesignId={infoOpenDesignId}
                infoBtnClass={infoBtnClass}
                setInfoOpenDeliveryId={setInfoOpenDeliveryId}
                setInfoOpenDesignId={setInfoOpenDesignId}
                resolveImage={resolveImage}
                activeStep={activeStep}
                setActiveStep={setActiveStep}
              />
            </div>

            {/* COLUMNA DERECHA: RESULTADOS (Ticket) */}
            <OrderSummary
              order={order}
              config={config}
              materials={materials}
              shapesCatalog={shapesCatalog}
              results={results}
              isAdmin={isAdmin}
              showMathDetail={showMathDetail}
              setShowMathDetail={setShowMathDetail}
              missing={missing}
              sizeText={sizeText}
              orderCode={orderCode}
              consultLink={consultLink}
              setOrder={setOrder}
            />
          </div>

          {/* Barra fija móvil + bottom sheet (solo cliente, < lg) */}
          <MobileSummaryBar
            order={order}
            results={results}
            missing={missing}
            whatsappLink={whatsappLink}
            config={config}
            materials={materials}
            shapesCatalog={shapesCatalog}
            sizeText={sizeText}
            materialName={materialName}
            formatoLabel={formatoLabel}
            designLabel={designLabel}
          />
          </>
        ) : (

          /* PESTAÑA SETTINGS (ADMIN PANEL) */
          <div className="animate-in fade-in duration-300">
            <AdminTabs activeTab={activeAdminTab} setActiveTab={setActiveAdminTab} />

            {activeAdminTab === 'gallery' && (
              <AdminGalleryPanel
                gallery={gallery}
                resolveImage={resolveImage}
                updateGalleryItem={updateGalleryItem}
                addGalleryItem={addGalleryItem}
                removeGalleryItem={removeGalleryItem}
                captureCurrentOrder={captureCurrentOrder}
                order={order}
                isDeleteMode={isDeleteMode}
              />
            )}

            {activeAdminTab === 'materials' && (
              <AdminMaterialsPanel
                materials={materials}
                updateMaterial={updateMaterial}
                addMaterial={addMaterial}
                removeMaterial={removeMaterial}
                moveMaterial={moveMaterial}
                resolveImage={resolveImage}
                order={order}
                setOrder={setOrder}
                isDeleteMode={isDeleteMode}
                materialsShowMoreIndex={materialsShowMoreIndex}
                setMaterialsShowMoreIndex={setMaterialsShowMoreIndex}
              />
            )}

            {activeAdminTab === 'shapes' && (
              <AdminShapesPanel
                shapesCatalog={shapesCatalog}
                shapesShowMoreIndex={shapesShowMoreIndex}
                updateShapeCatalog={updateShapeCatalog}
                addShapeItem={addShapeItem}
                removeShapeItem={removeShapeItem}
                moveShapeItem={moveShapeItem}
                setShowMoreIndex={setShowMoreIndex}
                resolveImage={resolveImage}
                order={order}
                setOrder={setOrder}
                isDeleteMode={isDeleteMode}
              />
            )}

            {activeAdminTab === 'delivery' && (
              <AdminDeliveryDesignPanel
                deliveryOptions={deliveryOptions}
                designOptions={designOptions}
                updateDeliveryOption={updateDeliveryOption}
                updateDesignOption={updateDesignOption}
                resolveImage={resolveImage}
                addDeliveryOption={addDeliveryOption}
                addDesignOption={addDesignOption}
                removeDeliveryOption={removeDeliveryOption}
                removeDesignOption={removeDesignOption}
              />
            )}

            {activeAdminTab === 'costs' && (
              <AdminCostsPanel
                config={config}
                handleConfigChange={handleConfigChange}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
