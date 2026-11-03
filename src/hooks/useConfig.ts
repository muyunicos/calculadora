import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import equal from 'fast-deep-equal';
import type { Config, DeliveryOption, DesignOption, GalleryItem, Material, MockupDef, ShapesCatalog, ShapesShowMoreIndex } from '../types';
import { CONFIG_URL, SAVE_URL, SAVE_NONCE } from '../core/wp';
import { resolveDeliveryOptions, resolveDesignOptions } from '../core/options';
import { validateAppData, normalizeAppData, sanitizeAppData } from '../core/validation';
import { useToast } from '../components/ToastProvider';
import { useDebounce } from './useDebounce';
import { findMaterialCodeDuplicates, findShapeCodeDuplicates, describeDuplicateCodes } from '../utils/validation';

export interface UseConfigResult {
  config: Config | null;
  materials: Material[] | null;
  shapesCatalog: ShapesCatalog | null;
  shapesShowMoreIndex: ShapesShowMoreIndex | null;
  materialsShowMoreIndex: number | null;
  gallery: GalleryItem[];
  deliveryOptions: DeliveryOption[] | null;
  designOptions: DesignOption[] | null;
  // Spec 037: mockups del cotizador + nombre de la tira unificada.
  mockups: MockupDef[];
  tiraNombre: string;
  setConfig: React.Dispatch<React.SetStateAction<Config | null>>;
  setMaterials: React.Dispatch<React.SetStateAction<Material[] | null>>;
  setShapesCatalog: React.Dispatch<React.SetStateAction<ShapesCatalog | null>>;
  setShapesShowMoreIndex: React.Dispatch<React.SetStateAction<ShapesShowMoreIndex | null>>;
  setMaterialsShowMoreIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setGallery: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
  setDeliveryOptions: React.Dispatch<React.SetStateAction<DeliveryOption[] | null>>;
  setDesignOptions: React.Dispatch<React.SetStateAction<DesignOption[] | null>>;
  setMockups: React.Dispatch<React.SetStateAction<MockupDef[]>>;
  setTiraNombre: React.Dispatch<React.SetStateAction<string>>;
  isLoaded: boolean;
  loadError: string | null;
  saveError: string | null;
  isSaving: boolean;
  hasChanges: boolean;
  saveConfig: () => Promise<void>;
}

// Maneja la carga (pública) y el guardado (admin, explícito con botón) de datos_config.json.
// El archivo se pide a CONFIG_URL: en producción, el endpoint datos_config_etag.php
// (ETag + max-age=60), que a su vez sirve el .json. Si no hay endpoint, se pide el .json.
// IMPORTANTE: no hay valores por defecto en código. El estado arranca en null y
// SIEMPRE se hidrata desde el archivo. Si la carga falla, se expone loadError.
export function useConfig(isAdmin: boolean): UseConfigResult {
  const [config, setConfig] = useState<Config | null>(null);
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [shapesCatalog, setShapesCatalog] = useState<ShapesCatalog | null>(null);
  const [shapesShowMoreIndex, setShapesShowMoreIndex] = useState<ShapesShowMoreIndex | null>(null);
  const [materialsShowMoreIndex, setMaterialsShowMoreIndex] = useState<number | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[] | null>(null);
  const [designOptions, setDesignOptions] = useState<DesignOption[] | null>(null);
  // Spec 037: los mockups del cotizador son DATO del admin (se guardan en
  // datos_config.json). `tiraNombre` es el rotulo de la tira (Anexo C).
  const [mockups, setMockups] = useState<MockupDef[]>([]);
  const [tiraNombre, setTiraNombre] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { showToast } = useToast();

  // Snapshot de los datos tal como se cargaron (después de normalizar).
  // Se usa para detectar cambios reales del admin.
  const originalDataRef = useRef<{
    config: Config | null;
    materials: Material[] | null;
    shapesCatalog: ShapesCatalog | null;
    shapesShowMoreIndex: ShapesShowMoreIndex | null;
    materialsShowMoreIndex: number | null;
    gallery: GalleryItem[];
    deliveryOptions: DeliveryOption[] | null;
    designOptions: DesignOption[] | null;
    mockups: MockupDef[];
    tiraNombre: string;
  } | null>(null);

  // --- FUNCIÓN DE CARGA REUTILIZABLE ---
  const loadConfig = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(CONFIG_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Verificar que la respuesta sea JSON antes de parsear.
      // Después de inactividad, el servidor/CDN puede devolver HTML (error,
      // maintenance, login page) con status 200, lo que rompe res.json().
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('El servidor no devolvió JSON (posible página de error o sesión expirada).');
      }
      const data = await res.json();
      // Validar + REPARAR. Solo falla si falta la estructura mínima.
      const validation = validateAppData(data);
      if (!validation.success) {
        throw new Error(validation.error);
      }
      if (validation.warnings.length > 0) {
        console.warn('Config reparada automáticamente:\n- ' + validation.warnings.join('\n- '));
      }
      const normalized = normalizeAppData(validation.data);
      const resolvedDelivery = resolveDeliveryOptions(normalized.deliveryOptions);
      const resolvedDesign = resolveDesignOptions(normalized.designOptions);
      const resolvedGallery = Array.isArray(normalized.gallery) ? normalized.gallery as GalleryItem[] : [];
      // Spec 037: mockups ya saneados por `validateAppData` (ids unicos, sin
      // huecos vacios, sin `visible:false`).
      const resolvedMockups = Array.isArray(normalized.mockups) ? normalized.mockups : [];
      const resolvedTira = String(normalized.tiraNombre ?? '').trim();
      const resolvedMaterialsShowMore =
        normalized.materialsShowMoreIndex ?? Math.min(2, normalized.materials.length);

      setConfig(normalized.config);
      setMaterials(normalized.materials);
      setShapesCatalog(normalized.shapesCatalog);
      setShapesShowMoreIndex(normalized.shapesShowMoreIndex || {});
      setMaterialsShowMoreIndex(resolvedMaterialsShowMore);
      setGallery(resolvedGallery);
      setDeliveryOptions(resolvedDelivery);
      setDesignOptions(resolvedDesign);
      setMockups(resolvedMockups);
      setTiraNombre(resolvedTira);

      // Guardar snapshot de los datos cargados (ya normalizados) para
      // detectar cambios reales del admin.
      originalDataRef.current = {
        config: normalized.config,
        materials: normalized.materials,
        shapesCatalog: normalized.shapesCatalog,
        shapesShowMoreIndex: normalized.shapesShowMoreIndex || {},
        materialsShowMoreIndex: resolvedMaterialsShowMore,
        gallery: resolvedGallery,
        deliveryOptions: resolvedDelivery,
        designOptions: resolvedDesign,
        mockups: resolvedMockups,
        tiraNombre: resolvedTira,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('No se pudo cargar la config del servidor', err);
      setLoadError(msg);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // --- CARGA INICIAL DESDE EL SERVIDOR ---
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // --- DETECCIÓN DE CAMBIOS REALES (dirty flag) ---
  // Compara el estado actual con la snapshot original. Solo se marca como
  // "con cambios" si el admin editó algo de verdad.
  // OPTIMIZACIÓN: Usamos un solo debounce para todos los datos en lugar de 7 debounces separados.
  // Esto reduce de 7 timers a 1 solo timer, ahorrando recursos significativamente.
  const allData = useMemo(() => ({
    config, materials, shapesCatalog, shapesShowMoreIndex, materialsShowMoreIndex, gallery, deliveryOptions, designOptions,
    mockups, tiraNombre,
  }), [config, materials, shapesCatalog, shapesShowMoreIndex, materialsShowMoreIndex, gallery, deliveryOptions, designOptions, mockups, tiraNombre]);
  
  const debouncedAllData = useDebounce(allData, 800);

  useEffect(() => {
    if (!isLoaded || !originalDataRef.current) return;
    const original = originalDataRef.current;
    const changed =
      !equal(debouncedAllData.config, original.config) ||
      !equal(debouncedAllData.materials, original.materials) ||
      !equal(debouncedAllData.shapesCatalog, original.shapesCatalog) ||
      !equal(debouncedAllData.shapesShowMoreIndex, original.shapesShowMoreIndex) ||
      !equal(debouncedAllData.materialsShowMoreIndex, original.materialsShowMoreIndex) ||
      !equal(debouncedAllData.gallery, original.gallery) ||
      !equal(debouncedAllData.deliveryOptions, original.deliveryOptions) ||
      !equal(debouncedAllData.designOptions, original.designOptions) ||
      !equal(debouncedAllData.mockups, original.mockups) ||
      !equal(debouncedAllData.tiraNombre, original.tiraNombre);
    setHasChanges(changed);
  }, [debouncedAllData, isLoaded]);

  // --- GUARDADO EXPLÍCITO (botón "Guardar") ---
  // Solo se ejecuta cuando el admin toca el botón. No hay autoguardado.
  const saveConfig = useCallback(async () => {
    if (!isAdmin) return;
    if (!config || !materials || !shapesCatalog) {
      showToast('error', 'La configuración todavía no terminó de cargar.');
      return;
    }
    if (isSaving) return;

    // Se sanea ANTES de enviar: lo que se escribe en el servidor tiene que poder
    // volver a leerse. Así el Admin no puede dejar la calculadora caída.
    const duplicateCodes = [
      ...describeDuplicateCodes(findMaterialCodeDuplicates(materials), 'material'),
      ...describeDuplicateCodes(findShapeCodeDuplicates(shapesCatalog), 'tamaño'),
    ];
    if (duplicateCodes.length > 0) {
      const message = `No se guardó: hay códigos repetidos (${duplicateCodes.join('; ')}). Los links y la galería cargarían la opción equivocada.`;
      setSaveError(message);
      showToast('error', message, 8000);
      return;
    }

    const sanitized = sanitizeAppData({
      config,
      materials,
      shapesCatalog,
      shapesShowMoreIndex,
      materialsShowMoreIndex: materialsShowMoreIndex ?? undefined,
      gallery,
      deliveryOptions,
      designOptions,
      mockups,
      tiraNombre,
    });
    if (!sanitized.success) {
      setSaveError(sanitized.error);
      showToast('error', `No se guardó: ${sanitized.error}`);
      return;
    }
    if (sanitized.warnings.length > 0) {
      console.warn('Datos corregidos al guardar:\n- ' + sanitized.warnings.join('\n- '));
    }

    const payload = normalizeAppData(sanitized.data);
    setIsSaving(true);
    setSaveError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (SAVE_NONCE) headers['X-WP-Nonce'] = SAVE_NONCE;

      const res = await fetch(SAVE_URL, {
        method: 'POST',
        credentials: 'same-origin', // la cookie de sesión de WP viaja siempre
        headers,
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !body || body.ok !== true) {
        throw new Error(body?.error || `HTTP ${res.status}`);
      }

      const savedDelivery = resolveDeliveryOptions(payload.deliveryOptions);
      const savedDesign = resolveDesignOptions(payload.designOptions);
      const savedGallery = payload.gallery || [];
      const savedMockups = payload.mockups || [];
      const savedTira = String(payload.tiraNombre ?? '').trim();
      const savedMaterialsShowMore =
        payload.materialsShowMoreIndex ?? Math.min(2, payload.materials.length);

      // Reflejar en la UI exactamente lo que quedó guardado (si el saneador
      // corrigió algo, el estado y el archivo no pueden divergir).
      setConfig(payload.config);
      setMaterials(payload.materials);
      setShapesCatalog(payload.shapesCatalog);
      setShapesShowMoreIndex(payload.shapesShowMoreIndex || {});
      setMaterialsShowMoreIndex(savedMaterialsShowMore);
      setGallery(savedGallery);
      setMockups(savedMockups);
      setTiraNombre(savedTira);
      setDeliveryOptions(savedDelivery);
      setDesignOptions(savedDesign);

      // Actualizar la snapshot para que hasChanges vuelva a false.
      originalDataRef.current = {
        config: payload.config,
        materials: payload.materials,
        shapesCatalog: payload.shapesCatalog,
        shapesShowMoreIndex: payload.shapesShowMoreIndex || {},
        materialsShowMoreIndex: savedMaterialsShowMore,
        gallery: savedGallery,
        deliveryOptions: savedDelivery,
        designOptions: savedDesign,
        mockups: savedMockups,
        tiraNombre: savedTira,
      };
      setHasChanges(false);
      showToast(
        'success',
        sanitized.warnings.length > 0
          ? 'Cambios guardados (se corrigieron datos inválidos)'
          : 'Cambios guardados correctamente',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('No se pudo guardar la config en el servidor', err);
      setSaveError(msg);
      showToast('error', `Error al guardar: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  }, [
    isAdmin, config, materials, shapesCatalog, shapesShowMoreIndex, materialsShowMoreIndex,
    gallery, deliveryOptions, designOptions, mockups, tiraNombre, isSaving, showToast,
  ]);

  return {
    config,
    materials,
    shapesCatalog,
    shapesShowMoreIndex,
    materialsShowMoreIndex,
    gallery,
    deliveryOptions,
    designOptions,
    mockups,
    tiraNombre,
    setConfig,
    setMaterials,
    setShapesCatalog,
    setShapesShowMoreIndex,
    setMaterialsShowMoreIndex,
    setGallery,
    setDeliveryOptions,
    setDesignOptions,
    setMockups,
    setTiraNombre,
    isLoaded,
    loadError,
    saveError,
    isSaving,
    hasChanges,
    saveConfig,
  };
}