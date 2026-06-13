import { useEffect, useRef, useState } from 'react';
import type { Config, DeliveryOption, DesignOption, GalleryItem, Material, ShapesCatalog, ShapesShowMoreIndex } from '../types';
import { CONFIG_URL, SAVE_URL } from '../core/wp';
import { resolveDeliveryOptions, resolveDesignOptions } from '../core/options';

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
}

// Maneja la carga (pública) y el guardado (admin, debounced) de datos_config.json.
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

  // --- CARGA INICIAL DESDE EL SERVIDOR ---
  useEffect(() => {
    let cancelled = false;
    fetch(CONFIG_URL, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!data || !data.config || !Array.isArray(data.materials) || !data.shapesCatalog) {
          throw new Error('El archivo de configuración no tiene la estructura esperada.');
        }
        setConfig(data.config);
        setMaterials(data.materials);
        setShapesCatalog(data.shapesCatalog);
        setShapesShowMoreIndex(data.shapesShowMoreIndex || {});
        if (Array.isArray(data.gallery)) setGallery(data.gallery);
        // Presentación de entrega/diseño: si el archivo no la trae (deploys
        // viejos), se completa con los defaults para no romper la vista cliente.
        setDeliveryOptions(resolveDeliveryOptions(data.deliveryOptions));
        setDesignOptions(resolveDesignOptions(data.designOptions));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        console.error('No se pudo cargar la config del servidor', err);
        setLoadError(msg);
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // --- GUARDADO EN SERVIDOR (debounced, solo admin) ---
  // El guard isLoaded evita que se pisen datos del servidor antes de cargar.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isLoaded || !isAdmin) return;
    if (!config || !materials || !shapesCatalog) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(SAVE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, materials, shapesCatalog, shapesShowMoreIndex, gallery, deliveryOptions, designOptions }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        })
        .catch((err) => console.error('No se pudo guardar la config en el servidor', err));
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [config, materials, shapesCatalog, shapesShowMoreIndex, gallery, deliveryOptions, designOptions, isAdmin, isLoaded]);

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
  };
}
