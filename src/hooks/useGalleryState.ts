import type { GalleryItem, Material, ShapesCatalog, Config, Order, DeliveryOption, DesignOption } from '../types';
import { decodeAnyOrder, encodeOrderCode } from '../core/orderCodec';
import { galleryPricing } from '../core/priceEngine';
import { ASSETS_URL } from '../core/wp';

interface UseGalleryStateProps {
  gallery: GalleryItem[];
  setGallery: (gallery: GalleryItem[] | ((prev: GalleryItem[]) => GalleryItem[])) => void;
  materials: Material[] | null;
  shapesCatalog: ShapesCatalog | null;
  deliveryOptions: DeliveryOption[] | null;
  designOptions: DesignOption[] | null;
  config: Config | null;
}

export const useGalleryState = ({
  gallery,
  setGallery,
  materials,
  shapesCatalog,
  deliveryOptions,
  designOptions,
  config,
}: UseGalleryStateProps) => {
  const ASSETS_PATH = ASSETS_URL;

  const resolveImage = (src: string): string =>
    /^(https?:)?\/\//.test(src) || src.startsWith('/') ? src : `${ASSETS_PATH}/${src}`;

  const updateGalleryItem = (id: string, field: keyof GalleryItem, value: string) =>
    setGallery((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));

  const addGalleryItem = () =>
    setGallery((prev) => [...prev, { id: `g${Date.now()}`, image: '', title: '', caption: '', order: '' }]);

  const removeGalleryItem = (id: string) =>
    setGallery((prev) => prev.filter((g) => g.id !== id));

  const getGalleryPricing = (code: string, displaySheets?: number) => {
    if (!config || !materials || !shapesCatalog) return null;
    const decoded = decodeAnyOrder(code, materials || [], shapesCatalog || {}, deliveryOptions || [], designOptions || []);
    if (!decoded) return null;
    return galleryPricing(decoded, config, materials, shapesCatalog, deliveryOptions || [], designOptions || [], displaySheets);
  };

  const captureCurrentOrder = (id: string, order: Order): boolean => {
    if (!materials || !shapesCatalog || !deliveryOptions || !designOptions) return false;
    const code = encodeOrderCode(order, materials, shapesCatalog, deliveryOptions, designOptions);
    if (!code) return false;
    updateGalleryItem(id, 'order', code);
    return true;
  };

  return {
    gallery,
    resolveImage,
    updateGalleryItem,
    addGalleryItem,
    removeGalleryItem,
    getGalleryPricing,
    captureCurrentOrder,
  };
};
