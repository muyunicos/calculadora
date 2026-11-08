import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDebounce } from './hooks/useDebounce';
import {
  Calculator, Package, Printer, Clock, TrendingUp,
  Scissors, Trash2, Plus, ArrowUp, ArrowDown,
  ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, Users, Settings,
  Image as ImageIcon, LayoutDashboard, Palette, Info, Loader2, AlertTriangle, MessageCircle,
} from 'lucide-react';

import type { A4Layout, Config, DeliveryFormat, DesignType, GalleryItem, Order, DeliveryOption, DesignOption, Diseno, PlantillaCotizador, TiraItem } from './types';
import { ASSETS_URL, CAN_BE_ADMIN } from './core/wp';
import { decodeAnyOrder, encodeOrderCode } from './core/orderCodec';
import { calcA4Layout } from './core/a4Layout';
import { calcularPrecio, autoComplexity, missingSelections, galleryPricing } from './core/priceEngine';
import { buildShareUrl, buildWhatsappMessage, buildConsultWhatsappMessage, buildWhatsappLink } from './core/whatsapp';
import { useConfig } from './hooks/useConfig';
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
import TiraIdeas from './components/TiraIdeas';
import DesignStep from './components/DesignStep';
import { AdminPlantillasPanel } from './components/AdminPlantillasPanel';
import { usePmuAssets } from './hooks/usePmuAssets';
import { useClientIdeas } from './hooks/useClientIdeas';
import { resolvePlantillaFor } from './core/plantillas';
import { useMockupsPdf } from './hooks/useCotizadorPdf';
import { SaveIndicator } from './components/SaveIndicator';
import { infoBtnClass, resolveImage } from './utils/ui';

const App = () => {
  const [isAdmin, setIsAdmin] = useState(CAN_BE_ADMIN);
  const [activeTab, setActiveTab] = useState<'calculator' | 'settings'>('calculator');
  const [activeAdminTab, setActiveAdminTab] = useState<'gallery' | 'materials' | 'shapes' | 'delivery' | 'costs' | 'mockups'>('gallery');
  const [showMathDetail, setShowMathDetail] = useState(false);
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const [activeStep, setActiveStep] = useState<0 | 1 | 2 | 3>(1); // Paso 1 abierto por defecto
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);
  const [expandedShapesCategory, setExpandedShapesCategory] = useState<string | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  // Motor de info: opción con el panel "MÁS INFO" desplegado en cada paso (null =
  // ninguno; al colapsar se cae al hint de la opción seleccionada, si tiene info).
  const [infoOpenSizeIndex, setInfoOpenSizeIndex] = useState<number | null>(null);
  const [infoOpenDeliveryId, setInfoOpenDeliveryId] = useState<DeliveryFormat | null>(null);
  const [infoOpenDesignId, setInfoOpenDesignId] = useState<DesignType | null>(null);
  // Flag para controlar si debe hacer scroll en la primera carga
  const [shouldScrollOnMount, setShouldScrollOnMount] = useState(false);

  // --- PERSISTENCIA EN SERVIDOR (WordPress) ---
  // Sin defaults en código: config/materials/shapesCatalog se hidratan del archivo.
  const {
    config, materials, shapesCatalog, shapesShowMoreIndex, materialsShowMoreIndex, gallery, deliveryOptions, designOptions,
    plantillas, tiraNombre,
    setConfig, setMaterials, setShapesCatalog, setShapesShowMoreIndex, setMaterialsShowMoreIndex, setGallery, setDeliveryOptions, setDesignOptions,
    setPlantillas,
    isLoaded, loadError, isSaving, saveError, hasChanges, saveConfig,
  } = useConfig(isAdmin);

  // Spec 037: puente con el plugin (carga diferida) + ideas del comprador. Los
  // hooks se llaman SIEMPRE (reglas de hooks); por dentro respetan el flag.
  const pmuAssets = usePmuAssets();
  const ideas = useClientIdeas(activeTab === 'calculator');
  const [diseno, setDiseno] = useState<Diseno | null>(null);
  // Subida del arte en curso: el boton COMPRAR espera a que termine (FR-014).
  const [disenoSubiendo, setDisenoSubiendo] = useState(false);



  const ideasListas = useRef(false);
  useEffect(() => {
    if (ideasListas.current || activeTab !== 'calculator') return;
    ideasListas.current = true;
    void ideas.listar();
    void ideas.historial();
  }, [activeTab, ideas]);

  // El editor del admin usa el MISMO nucleo (`PMUMockup.componer`): se pide al
  // abrir la pestana Mockups (spec 037, T009).
  useEffect(() => {
    if (activeTab === 'settings' && activeAdminTab === 'mockups') {
      void pmuAssets.abrir();
    }
  }, [activeTab, activeAdminTab, pmuAssets]);

  const [order, setOrder] = useState<Order>(() => {
    // El código corto v1 necesita el catálogo y se aplica luego,
    // cuando termina de cargar la config (ver useEffect más abajo).
    // Sin defaults: todo arranca vacío; el precio aparece recién cuando el
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
      rectCalcMode: 'preciso',
    };
  });

  // --- Spec 037 (Enmienda v2): plantilla + mockups del Editor ---
  // Se calculan ANTES de los cortes por carga/error: el hook de mockups tiene que
  // llamarse siempre (reglas de hooks). Sin plantilla, `pdf` va vacio y el item
  // nace sin PDF (solo imagen procesada).
  const categoriaMockup = order.shapeType === 'A Medida' ? 'Formas' : order.shapeType;
  const sizeMockup = order.shapeType === 'Rectangulares'
    ? `${order.customRectW}x${order.customRectH} cm`
    : (shapesCatalog?.[order.shapeType]?.[order.sizeIndex]?.size || '');
  const plantillaActual = resolvePlantillaFor(
    { categoria: categoriaMockup, size: sizeMockup },
    plantillas,
  );
  const pdfSlug = plantillaActual?.pdf ?? '';
  const mockupsPdfApi = useMockupsPdf(pdfSlug);
  // Modo de cálculo para formas rectangulares: 'preciso' (203x271mm) o 'economico' (210x297mm)
  // Usamos directamente order.rectCalcMode como fuente de verdad para evitar loops
  const rectCalcMode = order.rectCalcMode || 'preciso';

  // Aplica un código de pedido corto (v1) desde la URL una vez cargado el catálogo
  // (necesario para resolver los `code` de material/tamaño a forma+índice).
  const urlOrderApplied = useRef(false);
  // El admin puede forzar la complejidad desde "Ajustes Manuales": ese valor se
  // respeta durante la sesión (antes el auto-cálculo lo pisaba en cada cambio).
  const complexityIsManual = useRef(false);

  // Reutilizable para popstate (Atrás/Adelante del navegador).
  const applyOrderCode = useCallback(
    (code: string): boolean => {
      if (!materials || !shapesCatalog) return false;
      const decoded = decodeAnyOrder(code, materials, shapesCatalog, deliveryOptions || [], designOptions || []);
      if (!decoded) return false;
      complexityIsManual.current = false;
      setOrder(decoded);
      return true;
    },
    [materials, shapesCatalog, deliveryOptions, designOptions],
  );

  useEffect(() => {
    if (urlOrderApplied.current || !materials || !shapesCatalog) return;
    urlOrderApplied.current = true;
    if (typeof window === 'undefined') return;
    const urlOrder = new URLSearchParams(window.location.search).get('o');
    if (!urlOrder) return;
    const decoded = decodeAnyOrder(urlOrder, materials, shapesCatalog, deliveryOptions || [], designOptions || []);
    if (!decoded) {
      console.warn('Código de pedido inválido en la URL:', urlOrder);
      return;
    }
    setOrder(decoded);
    complexityIsManual.current = false;

    // El paso inicial se decide con el pedido YA decodificado. Antes se evaluaba
    // con el `order` viejo (los efectos corren en orden), así que un link
    // completo abría el paso 1 en lugar del resumen.
    const stillMissing = missingSelections(decoded, materials, shapesCatalog);
    if (stillMissing.length === 0) {
      setActiveStep(0);
      setTimeout(() => scrollToOrderSummary(), 200);
    } else if (!decoded.materialId) {
      setActiveStep(1);
    } else if (
      !decoded.shapeType ||
      (decoded.shapeType === 'Rectangulares' && (!decoded.customRectW || !decoded.customRectH))
    ) {
      setActiveStep(2);
    } else {
      setActiveStep(3);
    }
    setShouldScrollOnMount(true);
  }, [materials, shapesCatalog, deliveryOptions, designOptions]);

  // Back/Forward del navegador: si la URL cambia, el pedido en pantalla debe
  // seguirla. Sin esto, Atrás dejaba la UI y la URL desincronizadas.
  useEffect(() => {
    if (typeof window === 'undefined' || !materials || !shapesCatalog) return;
    const onPopState = () => {
      const code = new URLSearchParams(window.location.search).get('o');
      if (code) applyOrderCode(code);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyOrderCode, materials, shapesCatalog]);

  // Sin código en la URL, el paso 1 queda abierto por defecto.
  const initialStepDetermined = useRef(false);
  useEffect(() => {
    if (initialStepDetermined.current || !materials || !shapesCatalog) return;
    initialStepDetermined.current = true;
    if (typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('o') === null) {
      setActiveStep(1);
      setShouldScrollOnMount(false);
    }
  }, [materials, shapesCatalog]);

  // --- ACTUALIZAR LA URL EN TIEMPO REAL (sin ensuciar el historial) ---
  // Debounce: la URL se actualiza 1s después del último cambio.
  // `replaceState`: antes se usaba pushState y cada cambio creaba una entrada de
  // historial (Atrás quedaba inservible). Se conservan los demás query params y se
  // incluyen las medidas ajustadas, igual que en el link compartido (antes la URL
  // y el link describían medidas distintas en modo económico).
  const debouncedOrder = useDebounce(order, 1000);

  useEffect(() => {
    if (typeof window === 'undefined' || !materials || !shapesCatalog) return;

    const isComplete = debouncedOrder.materialId && debouncedOrder.shapeType &&
      (debouncedOrder.shapeType !== 'Rectangulares' ? debouncedOrder.sizeIndex >= 0 : (debouncedOrder.customRectW && debouncedOrder.customRectH)) &&
      debouncedOrder.deliveryFormat && debouncedOrder.designType && debouncedOrder.sheetsQty > 0;

    if (!isComplete) return;

    try {
      const rectMath = debouncedOrder.shapeType === 'Rectangulares'
        ? calcA4Layout(debouncedOrder.customRectW, debouncedOrder.customRectH, debouncedOrder.rectCalcMode || 'preciso')
        : null;

      const shortCode = encodeOrderCode(
        debouncedOrder,
        materials,
        shapesCatalog,
        deliveryOptions || [],
        designOptions || [],
        rectMath?.adjustedW,
        rectMath?.adjustedH,
      );
      if (!shortCode) return;

      const params = new URLSearchParams(window.location.search);
      params.set('o', shortCode);
      const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (newUrl !== currentUrl) {
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }
    } catch (error) {
      console.debug('No se pudo generar el código de pedido para la URL:', error);
    }
  }, [debouncedOrder, materials, shapesCatalog, deliveryOptions, designOptions]);

  // --- CALCULADORA DE HOJA A4 PARA RECTANGULARES ---
  const customRectMath: A4Layout = useMemo(() => {
    if (order.shapeType !== 'Rectangulares') {
      return { qty: 0, fitType: 'none', renderW: 0, renderH: 0 };
    }
    return calcA4Layout(order.customRectW, order.customRectH, rectCalcMode);
  }, [order.customRectW, order.customRectH, order.shapeType, rectCalcMode]);

  // --- AUTO-AJUSTAR COMPLEJIDAD DEL CORTE AL CAMBIAR TAMAÑO/FORMA ---
  // Si el admin forzó la complejidad ("Ajustes Manuales"), se respeta su valor
  // durante la sesión. Antes el efecto la pisaba en cada cambio de forma/tamaño.
  useEffect(() => {
    if (!shapesCatalog || complexityIsManual.current) return;
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

  // Función reutilizable para hacer scroll al resumen del pedido
  const scrollToOrderSummary = () => {
    // Pequeño delay para asegurar que el DOM esté completamente renderizado
    setTimeout(() => {
      const summaryElement = document.getElementById('order-summary');
      if (summaryElement) {
        const offset = 80;
        const elementPosition = summaryElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  // Detectar el primer paso incompleto y navegar a él
  const handleNavigateToNext = () => {
    const step1Complete = !!order.materialId;
    const step2Complete = order.shapeType && (
      order.shapeType === 'Rectangulares'
        ? (order.customRectW && order.customRectH)
        : order.sizeIndex >= 0
    );
    const step3Complete = order.designType && order.deliveryFormat && order.sheetsQty > 0;

    if (!step1Complete) {
      setActiveStep(1);
    } else if (!step2Complete) {
      setActiveStep(2);
    } else if (!step3Complete) {
      setActiveStep(3);
    } else {
      // Todos los pasos completos, contraer el paso actual y scroll al resumen
      setActiveStep(0);
      scrollToOrderSummary();
    }
  };

  // Manejadores para abrir pasos específicos
  const handleStep1Open = () => setActiveStep(1);
  const handleStep2Open = () => setActiveStep(2);
  const handleStep3Open = () => setActiveStep(3);

  // Elegir material (sin auto-avance).
  const selectMaterial = (id: string) => {
    setOrder((prev) => ({ ...prev, materialId: id }));
    // Si el panel de info está abierto, actualizarlo para mostrar la nueva selección
    if (expandedMaterialId !== null) {
      setExpandedMaterialId(id);
    }
  };

  // --- HANDLERS (Admin) ---
  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev) => {
      if (!prev) return prev;
      const val = type === 'checkbox' ? checked : parseFloat(value) || 0;
      const next = { ...prev, [name]: val } as Config;
      // Recorte de rangos: nunca se guarda un valor que luego no pueda cargarse
      // (p. ej. profitMargin 5000 o weeklyHours > 168).
      next.wasteMargin = Math.min(100, Math.max(0, Number(next.wasteMargin) || 0));
      next.profitMargin = Math.min(1000, Math.max(0, Number(next.profitMargin) || 0));
      next.weeklyHours = Math.min(168, Math.max(0, Number(next.weeklyHours) || 0));
      next.galleryRefSheets = Math.min(1000, Math.max(1, Math.round(Number(next.galleryRefSheets) || 1)));
      if (next.calcSalaryMode && (name === 'monthlySalary' || name === 'weeklyHours' || name === 'calcSalaryMode')) {
        // Con weeklyHours = 0 esto daba Infinity -> JSON.stringify lo volvía null
        // y la próxima carga fallaba. Ahora queda en 0.
        next.hourlyRate = next.weeklyHours > 0
          ? Math.round(next.monthlySalary / (next.weeklyHours * 4.33))
          : 0;
      }
      return next;
    });
  };

  const updateMaterial = (id: string, field: string, value: string | boolean) =>
    setMaterials((prev) =>
      prev
        ? prev.map((material) => {
            if (material.id !== id) return material;
            if (field === 'name' || field === 'description' || field === 'image') {
              return { ...material, [field]: String(value) };
            }
            if (field === 'visible') return { ...material, visible: Boolean(value) };
            if (field === 'code') {
              // Vacío = sin código (no 0, que sería un código real y duplicable).
              const raw = String(value).trim();
              if (raw === '') return { ...material, code: undefined };
              const parsed = parseInt(raw, 10);
              return { ...material, code: Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined };
            }
            const parsed = parseFloat(String(value));
            return { ...material, [field]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0 };
          })
        : prev,
    );

  const addMaterial = () => {
    const newId = `m${Date.now()}`;
    setMaterials((prev) => {
      if (!prev) return prev;
      const nextCode = Math.max(9, ...prev.map((m) => m.code ?? 0)) + 1;
      return [...prev, { id: newId, code: nextCode, name: 'Nuevo Material', sheetCost: 0, printTime: 2, inkCost: 0, printWear: 0, minCutTime: 1, maxCutTime: 5, cutWear: 0 }];
    });
    // No se auto-selecciona: el material nuevo nace con todos los costos en 0 y
    // cotizar con él daría un precio irreal. El admin lo edita y después lo elige.
  };

  const removeMaterial = (id: string) => {
    if (!materials || materials.length <= 1) return;
    const filtered = materials.filter((m) => m.id !== id);
    setMaterials(filtered);
    setOrder((prev) => (prev.materialId === id ? { ...prev, materialId: filtered[0].id } : prev));
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

  const updateShapeCatalog = (category: string, index: number, field: 'size' | 'qty' | 'code' | 'description' | 'image' | 'visible', value: string | boolean) => {
    setShapesCatalog((prev) => {
      if (!prev || !prev[category]) return prev;
      return {
        ...prev,
        [category]: prev[category].map((item, i) => {
          if (i !== index) return item;
          if (field === 'size' || field === 'description' || field === 'image') {
            return { ...item, [field]: String(value) };
          }
          if (field === 'visible') return { ...item, visible: Boolean(value) };
          if (field === 'code') {
            const raw = String(value).trim();
            if (raw === '') return { ...item, code: undefined };
            const parsed = parseInt(raw, 10);
            return { ...item, code: Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined };
          }
          const parsed = parseInt(String(value), 10);
          return { ...item, [field]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0 };
        }),
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
    if (!shapesCatalog || !shapesCatalog[category]) return;
    const remaining = shapesCatalog[category].filter((_, i) => i !== index);
    setShapesCatalog((prev) =>
      prev && prev[category] ? { ...prev, [category]: prev[category].filter((_, i) => i !== index) } : prev,
    );
    // Reindexar la selección: si se borró el tamaño elegido, queda sin elegir
    // (no se cotiza un tamaño que el cliente nunca seleccionó).
    setOrder((prev) => {
      if (prev.shapeType !== category) return prev;
      if (prev.sizeIndex === index) return { ...prev, sizeIndex: -1 };
      if (prev.sizeIndex > index) return { ...prev, sizeIndex: prev.sizeIndex - 1 };
      return prev;
    });
  };

  const moveShapeItem = (category: string, index: number, direction: -1 | 1) => {
    if (!shapesCatalog || !shapesCatalog[category]) return;
    const items = shapesCatalog[category];
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setShapesCatalog((prev) => (prev ? { ...prev, [category]: next } : prev));

    // El tamaño seleccionado se mueve con la fila (antes el sizeIndex quedaba
    // apuntando a otro tamaño después de reordenar).
    setOrder((prev) => {
      if (prev.shapeType !== category) return prev;
      if (prev.sizeIndex === index) return { ...prev, sizeIndex: target };
      if (prev.sizeIndex === target) return { ...prev, sizeIndex: index };
      return prev;
    });
  };

  // --- OPCIONES DE ENTREGA / DISEÑO (presentación editable; el id es estable) ---
  const updateDeliveryOption = (
    id: DeliveryFormat,
    field: 'label' | 'subtitle' | 'description' | 'image' | 'visible' | 'cutFactor' | 'cutWearFactor',
    value: string | boolean,
  ) =>
    setDeliveryOptions((prev) =>
      prev
        ? prev.map((option) => {
            if (option.id !== id) return option;
            if (field === 'label' || field === 'subtitle' || field === 'description' || field === 'image') {
              return { ...option, [field]: String(value) };
            }
            if (field === 'visible') return { ...option, visible: Boolean(value) };
            const parsed = parseFloat(String(value));
            return { ...option, [field]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0 };
          })
        : prev,
    );

  const updateDesignOption = (
    id: DesignType,
    field: 'label' | 'subtitle' | 'description' | 'image' | 'visible' | 'designMinutes' | 'isCustomTime',
    value: string | boolean,
  ) =>
    setDesignOptions((prev) =>
      prev
        ? prev.map((option) => {
            if (option.id !== id) return option;
            if (field === 'label' || field === 'subtitle' || field === 'description' || field === 'image') {
              return { ...option, [field]: String(value) };
            }
            if (field === 'visible') {
              // `visible` es la fuente de verdad; `customerVisible` se mantiene en
              // sincronía para que el badge "solo admin" no quede desactualizado.
              return { ...option, visible: Boolean(value), customerVisible: Boolean(value) };
            }
            if (field === 'isCustomTime') return { ...option, isCustomTime: Boolean(value) };
            const parsed = parseFloat(String(value));
            return { ...option, designMinutes: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0 };
          })
        : prev,
    );

  const addDeliveryOption = () => {
    const newId = `formato_${Date.now()}`;
    setDeliveryOptions((prev) => {
      const current = prev || [];
      const nextCode = Math.max(0, ...current.map((o) => o.code ?? 0)) + 1;
      return [
        ...current,
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
      ];
    });
  };

  const addDesignOption = () => {
    const newId = `diseno_${Date.now()}`;
    setDesignOptions((prev) => {
      const current = prev || [];
      const nextCode = Math.max(0, ...current.map((o) => o.code ?? 0)) + 1;
      return [
        ...current,
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
      ];
    });
  };

  // Nunca se puede quedar sin opciones: el pedido no podría completarse.
  const removeDeliveryOption = (id: DeliveryFormat) => {
    if ((deliveryOptions || []).length <= 1) return;
    setDeliveryOptions((prev) => (prev && prev.length > 1 ? prev.filter((o) => o.id !== id) : prev));
    setOrder((prev) => (prev.deliveryFormat === id ? { ...prev, deliveryFormat: '' } : prev));
  };

  const removeDesignOption = (id: DesignType) => {
    if ((designOptions || []).length <= 1) return;
    setDesignOptions((prev) => (prev && prev.length > 1 ? prev.filter((o) => o.id !== id) : prev));
    setOrder((prev) => (prev.designType === id ? { ...prev, designType: '' } : prev));
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
    if (!applyOrderCode(code)) {
      console.warn('Código de pedido inválido en la galería:', code);
      return;
    }
    setActiveTab('calculator');
    // Cambiar al paso 3 y dejar que el scroll automático del componente funcione
    setActiveStep(3);
  };

  const updateGalleryItem = (id: string, field: keyof GalleryItem, value: string | boolean) =>
    setGallery((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));

  const addGalleryItem = () =>
    setGallery((prev) => [
      ...prev,
      // Sin código de pedido no puede cargar nada: nace oculta (el saneador
      // también la oculta si se guarda así) y el admin la activa al completarla.
      { id: `g${Date.now()}`, image: '', title: '', caption: '', order: '', visible: false },
    ]);

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
    const code = encodeOrderCode(order, materials, shapesCatalog, deliveryOptions || [], designOptions || [], customRectMath.adjustedW, customRectMath.adjustedH);
    if (!code) return false;
    updateGalleryItem(id, 'order', code);
    return true;
  };

  // --- VARIABLES DERIVADAS PARA WHATSAPP Y TICKET ---
  const sizeText = order.shapeType === 'Rectangulares'
    ? `${order.customRectW}x${order.customRectH}cm`
    : shapesCatalog?.[order.shapeType]?.[order.sizeIndex]?.size || '';

  const usarTira = (item: TiraItem) => {
    if (item.order) loadOrderFromCode(item.order);
    // Reusar un custom restaura tambien su encuadre (FR-022).
    if (item.origen === 'custom' && item.idea) setDiseno(item.idea.diseno);
  };

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
          No se pudo leer la configuración desde el endpoint (por defecto{' '}
          <code className="bg-slate-100 px-1 rounded">datos_config_etag.php</code>)
          {loadError ? ` Detalle: ${loadError}.` : '.'} Verificá que el endpoint esté subido al servidor y que
          <code className="bg-slate-100 px-1 rounded">datos_config.json</code> tenga la estructura mínima
          (config, materials y shapesCatalog con al menos un tamaño).
        </p>
      </div>
    );
  }

  const materialName = materials?.find((m) => m.id === order.materialId)?.name ?? '';
  const formatoLabel = deliveryOptions?.find((o) => o.id === order.deliveryFormat)?.label ?? '';
  const designLabel = designOptions?.find((o) => o.id === order.designType)?.label ?? '';
  const missing = missingSelections(order, materials, shapesCatalog);

  const shareUrl = materials && shapesCatalog && deliveryOptions && designOptions ? buildShareUrl(order, materials, shapesCatalog, deliveryOptions, designOptions, customRectMath.adjustedW, customRectMath.adjustedH) : '';
  const wpMessage = buildWhatsappMessage(order, results, sizeText, shareUrl, false, formatoLabel);
  const whatsappLink = buildWhatsappLink(wpMessage);
  const consultMessage = buildConsultWhatsappMessage(order, results, sizeText, shareUrl, formatoLabel);
  const consultLink = buildWhatsappLink(consultMessage);
  const orderCode = materials && shapesCatalog && deliveryOptions && designOptions ? encodeOrderCode(order, materials, shapesCatalog, deliveryOptions, designOptions, customRectMath.adjustedW, customRectMath.adjustedH) : null;

  return (
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
            hasChanges={hasChanges}
            onSave={saveConfig}
          />

        {/* CONTENIDO PRINCIPAL */}
        {activeTab === 'calculator' ? (
          <>
          {/* Tira unificada (spec 037): tienda + ideas del comprador + historial.
              Sin puente se degrada a la galeria de la tienda (D9). */}
          {ideas.disponible ? (
            <TiraIdeas
              titulo={tiraNombre.trim() || 'Ideas y favoritos'}
              tienda={gallery}
              ideas={ideas.ideas}
              favoritos={ideas.favoritos}
              pedidos={ideas.pedidos}
              resolveImage={resolveImage}
              getPricing={getGalleryPricing}
              onUsar={usarTira}
              onEstrella={(tipo, ref, valor) => { void ideas.favorito(tipo, ref, valor); }}
              onBorrar={(ideaId) => { void ideas.borrar(ideaId); }}
              className="mb-4"
            />
          ) : (
            <MiniGallery items={gallery} resolveImage={resolveImage} onUse={loadOrderFromCode} getPricing={getGalleryPricing} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* COLUMNA IZQUIERDA: CONFIGURADOR UI */}
            <div className="lg:col-span-7 space-y-6">

              {/* Paso 1: Material */}
              <MaterialSelector
                materials={materials}
                materialsShowMoreIndex={materialsShowMoreIndex ?? 2}
                materialId={order.materialId}
                selectMaterial={selectMaterial}
                showAllMaterials={showAllMaterials}
                setShowAllMaterials={setShowAllMaterials}
                expandedMaterialId={expandedMaterialId}
                setExpandedMaterialId={setExpandedMaterialId}
                infoBtnClass={infoBtnClass}
                resolveImage={resolveImage}
                activeStep={activeStep}
                onStepOpen={handleStep1Open}
                onNavigateToNext={handleNavigateToNext}
                shouldScrollOnMount={shouldScrollOnMount}
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
                activeStep={activeStep}
                onStepOpen={handleStep2Open}
                onNavigateToNext={handleNavigateToNext}
                rectCalcMode={rectCalcMode}
                shouldScrollOnMount={shouldScrollOnMount}
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
                onStepOpen={handleStep3Open}
                onNavigateToNext={handleNavigateToNext}
                onManualComplexity={() => { complexityIsManual.current = true; }}
                shouldScrollOnMount={shouldScrollOnMount}
              />

              {/* Paso 4 (spec 037): Tu diseno. Opcional: el arte no bloquea la
                  compra (constitution §I, Enmienda 4.1.0). */}
              {pmuAssets.disponible && (
                <section className="bg-white rounded-xl cl-shadow-sm border border-slate-200 p-4">
                  <div className="flex items-baseline justify-between gap-2 mb-3">
                    <h3 className="text-sm font-bold text-slate-800">Tu diseno</h3>
                    <span className="text-xs text-slate-500">Opcional</span>
                  </div>
                  <DesignStep
                    categoria={categoriaMockup}
                    size={sizeMockup}
                    forma="auto"
                    mockupsPdf={mockupsPdfApi.datos}
                    pdf={pdfSlug}
                    diseno={diseno}
                    onDiseno={setDiseno}
                    disponible={pmuAssets.disponible}
                    assets={pmuAssets}
                    onSubiendo={setDisenoSubiendo}
                    onAbrir={() => { void pmuAssets.abrir(); }}
                  />
                  {ideas.error !== '' && (
                    <p className="mt-2 text-xs text-amber-700" role="status">
                      No pudimos leer tus ideas guardadas ({ideas.error}).
                    </p>
                  )}
                </section>
              )}
            </div>

            {/* COLUMNA DERECHA: RESULTADOS (Ticket) */}
            <div className="lg:col-span-5">
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
              formatoLabel={formatoLabel}
              orderCode={orderCode}
              shareUrl={shareUrl}
              consultLink={consultLink}
              setOrder={setOrder}
              deliveryOptions={deliveryOptions}
              designOptions={designOptions}
              diseno={diseno}
              subiendo={disenoSubiendo}
            />
            </div>

          {/* Barra fija móvil (solo cliente, < lg) */}
          <MobileSummaryBar
            order={order}
            results={results}
            missing={missing}
            sizeText={sizeText}
            materialName={materialName}
            formatoLabel={formatoLabel}
            designLabel={designLabel}
            orderCode={orderCode}
            shareUrl={shareUrl}
            diseno={diseno}
            subiendo={disenoSubiendo}
          />
          </div>
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
                materialsShowMoreIndex={materialsShowMoreIndex ?? 2}
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

            {activeAdminTab === 'mockups' && (
              <AdminPlantillasPanel
                plantillas={plantillas}
                categorias={Array.from(new Set([...Object.keys(shapesCatalog), 'Rectangulares']))}
                onChange={(lista: PlantillaCotizador[]) => setPlantillas(lista)}
              />
            )}
          </div>
        )}
      </div>
  );
};

export default App;
