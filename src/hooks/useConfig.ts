import { useCallback, useEffect, useRef, useState } from 'react';
import type { Config, DeliveryOption, DesignOption, GalleryItem, Material, ShapesCatalog, ShapesShowMoreIndex } from '../types';
import { CONFIG_URL, SAVE_URL } from '../core/wp';
import { resolveDeliveryOptions, resolveDesignOptions } from '../core/options';
import { validateAppData, normalizeAppData } from '../core/validation';
import { useToast } from '../components/ToastProvider';

export interface UseConfigResult {
  config: Config | null;
  materials: Material[] | null;
  shapesCatalog: ShapesCatalog | null;
  shapesShowMoreIndex: ShapesShowMoreIndex | null;
  gallery: GalleryItem[];
  deliveryOptions: DeliveryOption[] | null;
  designOptions: DesignOption[] | null;
  setConfig: React.Dispatch<React.SetStateAction<Config | null>>;
  setMaterials: React.Dispatch<React.SetStateAction<Material[] | null>>;
  setShapesCatalog: React.Dispatch<React.SetStateAction<ShapesCatalog | null>>;
  setShapesShowMoreIndex: React.Dispatch<React.SetStateAction<ShapesShowMoreIndex | null>>;
  setGallery: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
  setDeliveryOptions: React.Dispatch<React.SetStateAction<DeliveryOption[] | null>>;
  setDesignOptions: React.Dispatch<React.SetStateAction<DesignOption[] | null>>;
  isLoaded: boolean;
  loadError: string | null;
  saveError: string | null;
  isSaving: boolean;
  hasChanges: boolean;
  saveConfig: () => Promise<void>;
}

// Comparación profunda simple para detectar cambios reales.
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== (b as unknown[]).length) return false;
    return a.every((item, i) => deepEqual(item, (b as unknown[])[i]));
  }
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
}

// Maneja la carga (pública) y el guardado (admin, explícito con botón) de datos_config.json.
// IMPORTANTE: no hay valores por defecto en código. El estado arranca en null y
// SIEMPRE se hidrata desde el archivo. Si la carga falla, se expone loadError.
export function useConfig(isAdmin: boolean): UseConfigResult {
  const [config, setConfig] = useState<Config | null>(null);
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [shapesCatalog, setShapesCatalog] = useState<ShapesCatalog | null>(null);
  const [shapesShowMoreIndex, setShapesShowMoreIndex] = useState<ShapesShowMoreIndex | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[] | null>(null);
  const [designOptions, setDesignOptions] = useState<DesignOption[] | null>(null);
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
    gallery: GalleryItem[];
    deliveryOptions: DeliveryOption[] | null;
    designOptions: DesignOption[] | null;
  } | null>(null);

  // --- FUNCIÓN DE CARGA REUTILIZABLE ---
  // Se extrae para poder re-cargar la config cuando la página vuelve a ser
  // visible después de un periodo de inactividad (evita errores de JSON por
  // respuestas stale del servidor/CDN).
  const loadConfig = useCallback(async (isReload = false) => {
    setLoadError(null);
    if (isReload) setIsLoaded(false);
    try {
      const res = await fetch(CONFIG_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Verificar que la respuesta sea JSON antes de parsear.
      // Después de inactividad, el servidor/CDN puede devolver HTML (error,
      // maintenance, login page) con status 200, lo que rompe res.json().
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('El servidor no devolvió JSON (posible página de error o sesión expirada).');
      }
      const data = await res.json();
      // Validar datos con Zod
      const validation = validateAppData(data);
      if (!validation.success) {
        throw new Error(validation.error);
      }
      const validated = validation.data;
      // Normalizar datos: asignar valores por defecto para campos vacíos
      const normalized = normalizeAppData(validated);
      const resolvedDelivery = resolveDeliveryOptions(normalized.deliveryOptions);
      const resolvedDesign = resolveDesignOptions(normalized.designOptions);
      const resolvedGallery = Array.isArray(normalized.gallery) ? normalized.gallery as GalleryItem[] : [];

      setConfig(normalized.config);
      setMaterials(normalized.materials);
      setShapesCatalog(normalized.shapesCatalog);
      setShapesShowMoreIndex(normalized.shapesShowMoreIndex || {});
      setGallery(resolvedGallery);
      setDeliveryOptions(resolvedDelivery);
      setDesignOptions(resolvedDesign);

      // Guardar snapshot de los datos cargados (ya normalizados) para
      // detectar cambios reales del admin.
      originalDataRef.current = {
        config: normalized.config,
        materials: normalized.materials,
        shapesCatalog: normalized.shapesCatalog,
        shapesShowMoreIndex: normalized.shapesShowMoreIndex || {},
        gallery: resolvedGallery,
        deliveryOptions: resolvedDelivery,
        designOptions: resolvedDesign,
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

  // --- RE-CARGAR AL VOLVER A LA PESTAÑA DESPUÉS DE INACTIVIDAD ---
  // Cuando la página estuvo inactiva (background tab) mucho tiempo, el
  // servidor puede devolver respuestas stale o errores. Re-cargamos la
  // config para asegurar datos frescos.
  useEffect(() => {
    let lastHiddenTime: number | null = null;
    const THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos de inactividad

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        lastHiddenTime = Date.now();
      } else {
        // La página volvió a ser visible
        if (lastHiddenTime !== null) {
          const hiddenDuration = Date.now() - lastHiddenTime;
          lastHiddenTime = null;
          // Solo re-cargar si estuvo oculta más del threshold Y no hay
          // cambios sin guardar (para no pisar ediciones del admin).
          if (hiddenDuration >= THRESHOLD_MS && !hasChanges && !isSaving) {
            loadConfig(true);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadConfig, hasChanges, isSaving]);

  // --- DETECCIÓN DE CAMBIOS REALES (dirty flag) ---
  // Compara el estado actual con la snapshot original. Solo se marca como
  // "con cambios" si el admin editó algo de verdad.
  useEffect(() => {
    if (!isLoaded || !originalDataRef.current) return;
    const original = originalDataRef.current;
    const changed =
      !deepEqual(config, original.config) ||
      !deepEqual(materials, original.materials) ||
      !deepEqual(shapesCatalog, original.shapesCatalog) ||
      !deepEqual(shapesShowMoreIndex, original.shapesShowMoreIndex) ||
      !deepEqual(gallery, original.gallery) ||
      !deepEqual(deliveryOptions, original.deliveryOptions) ||
      !deepEqual(designOptions, original.designOptions);
    setHasChanges(changed);
  }, [config, materials, shapesCatalog, shapesShowMoreIndex, gallery, deliveryOptions, designOptions, isLoaded]);

  // --- GUARDADO EXPLÍCITO (botón "Guardar") ---
  // Solo se ejecuta cuando el admin toca el botón. No hay autoguardado.
  const saveConfig = useCallback(async () => {
    if (!isAdmin) return;
    if (!config || !materials || !shapesCatalog) return;
    if (isSaving) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(SAVE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, materials, shapesCatalog, shapesShowMoreIndex, gallery, deliveryOptions, designOptions }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('success', 'Cambios guardados correctamente');
      // Actualizar la snapshot para que hasChanges vuelva a false.
      originalDataRef.current = {
        config,
        materials,
        shapesCatalog,
        shapesShowMoreIndex,
        gallery,
        deliveryOptions,
        designOptions,
      };
      setHasChanges(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('No se pudo guardar la config en el servidor', err);
      setSaveError(msg);
      showToast('error', `Error al guardar: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  }, [isAdmin, config, materials, shapesCatalog, shapesShowMoreIndex, gallery, deliveryOptions, designOptions, isSaving, showToast]);

  return {
    config,
    materials,
    shapesCatalog,
    shapesShowMoreIndex,
    gallery,
    deliveryOptions,
    designOptions,
    setConfig,
    setMaterials,
    setShapesCatalog,
    setShapesShowMoreIndex,
    setGallery,
    setDeliveryOptions,
    setDesignOptions,
    isLoaded,
    loadError,
    saveError,
    isSaving,
    hasChanges,
    saveConfig,
  };
}