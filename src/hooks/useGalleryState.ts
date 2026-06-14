import { useState } from 'react';
import type { GalleryItem, Order } from '../types';

interface UseGalleryStateProps {
  gallery: GalleryItem[];
  order: Order;
  setOrder: (order: Order | ((prev: Order) => Order)) => void;
}

export const useGalleryState = ({
  gallery,
  order,
  setOrder,
}: UseGalleryStateProps) => {
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<string | null>(null);

  const captureCurrentOrder = (itemId: string, currentOrder: Order): boolean => {
    // En una implementación real, esto codificaría el order y lo asignaría al item de galería
    // Por ahora, solo devuelve true para indicar éxito
    setSelectedGalleryItem(itemId);
    return true;
  };

  const loadOrderFromGallery = (orderCode: string) => {
    // En una implementación real, esto decodificaría el código de la galería
    // y cargaría el order correspondiente
    console.log('Cargando order desde galería:', orderCode);
  };

  return {
    selectedGalleryItem,
    setSelectedGalleryItem,
    captureCurrentOrder,
    loadOrderFromGallery,
  };
};