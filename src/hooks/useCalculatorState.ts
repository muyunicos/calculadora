import { useState, useEffect, useMemo, useRef } from 'react';
import type { Order, Material, ShapesCatalog, DeliveryOption, DesignOption } from '../types';
import { decodeOrder, decodeAnyOrder } from '../core/orderCodec';
import { calcA4Layout } from '../core/a4Layout';
import { autoComplexity } from '../core/priceEngine';

interface UseCalculatorStateProps {
  materials: Material[] | null;
  shapesCatalog: ShapesCatalog | null;
  deliveryOptions: DeliveryOption[] | null;
  designOptions: DesignOption[] | null;
}

export const useCalculatorState = ({
  materials,
  shapesCatalog,
  deliveryOptions,
  designOptions,
}: UseCalculatorStateProps) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);
  const [expandedShapesCategory, setExpandedShapesCategory] = useState<string | null>(null);
  const [infoOpenSizeIndex, setInfoOpenSizeIndex] = useState<number | null>(null);
  const [infoOpenDeliveryId, setInfoOpenDeliveryId] = useState<string | null>(null);
  const [infoOpenDesignId, setInfoOpenDesignId] = useState<string | null>(null);

  const [order, setOrder] = useState<Order>(() => {
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

  const urlOrderApplied = useRef(false);
  useEffect(() => {
    if (urlOrderApplied.current || !materials || !shapesCatalog) return;
    if (typeof window === 'undefined') return;
    const urlOrder = new URLSearchParams(window.location.search).get('o');
    if (!urlOrder) return;
    urlOrderApplied.current = true;
    const decoded = decodeAnyOrder(urlOrder, materials || [], shapesCatalog || {}, deliveryOptions || [], designOptions || []);
    if (decoded) setOrder(decoded);
  }, [materials, shapesCatalog, deliveryOptions, designOptions]);

  const customRectMath = useMemo(() => {
    if (order.shapeType !== 'Rectangulares') {
      return { qty: 0, fitType: 'none' as const, renderW: 0, renderH: 0 };
    }
    return calcA4Layout(order.customRectW, order.customRectH);
  }, [order.customRectW, order.customRectH, order.shapeType]);

  useEffect(() => {
    if (!shapesCatalog) return;
    const qtyStickersPerSheet = order.shapeType === 'Rectangulares'
      ? customRectMath.qty
      : (shapesCatalog[order.shapeType]?.[order.sizeIndex]?.qty || 0);
    const auto = autoComplexity(qtyStickersPerSheet);
    setOrder((prev) => (prev.complexity !== auto ? { ...prev, complexity: auto } : prev));
  }, [order.shapeType, order.sizeIndex, order.customRectW, order.customRectH, customRectMath.qty, shapesCatalog]);

  const selectMaterial = (id: string) => {
    setOrder((prev) => ({ ...prev, materialId: id }));
    setActiveStep(2);
  };

  const loadOrderFromCode = (code: string) => {
    if (!materials || !shapesCatalog) return;
    const decoded = decodeAnyOrder(code, materials, shapesCatalog, deliveryOptions || [], designOptions || []);
    if (!decoded) {
      console.warn('Código de pedido inválido en la galería:', code);
      return;
    }
    setOrder(decoded);
    setActiveStep(3);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return {
    order,
    setOrder,
    activeStep,
    setActiveStep,
    showAllMaterials,
    setShowAllMaterials,
    expandedMaterialId,
    setExpandedMaterialId,
    expandedShapesCategory,
    setExpandedShapesCategory,
    infoOpenSizeIndex,
    setInfoOpenSizeIndex,
    infoOpenDeliveryId,
    setInfoOpenDeliveryId,
    infoOpenDesignId,
    setInfoOpenDesignId,
    selectMaterial,
    loadOrderFromCode,
    customRectMath,
  };
};
