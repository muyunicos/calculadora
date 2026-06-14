import { useState } from 'react';
import type { Config, Material, ShapesCatalog, DeliveryOption, DesignOption } from '../types';
import { CAN_BE_ADMIN } from '../core/wp';

interface UseAdminStateProps {
  config: Config | null;
  setConfig: (config: Config | ((prev: Config | null) => Config | null)) => void;
  setMaterials: (materials: Material[] | ((prev: Material[] | null) => Material[] | null)) => void;
  setShapesCatalog: (catalog: ShapesCatalog | ((prev: ShapesCatalog | null) => ShapesCatalog | null)) => void;
  setDeliveryOptions: (options: DeliveryOption[] | ((prev: DeliveryOption[] | null) => DeliveryOption[] | null)) => void;
  setDesignOptions: (options: DesignOption[] | ((prev: DesignOption[] | null) => DesignOption[] | null)) => void;
}

export const useAdminState = ({
  config,
  setConfig,
  setMaterials,
  setShapesCatalog,
  setDeliveryOptions,
  setDesignOptions,
}: UseAdminStateProps) => {
  const [isAdmin, setIsAdmin] = useState(CAN_BE_ADMIN);
  const [activeTab, setActiveTab] = useState<'calculator' | 'settings'>('calculator');
  const [showMathDetail, setShowMathDetail] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);

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

  const addMaterial = (orderSetter: (order: any) => void) => {
    const newId = `m${Date.now()}`;
    setMaterials((prev) => {
      if (!prev) return prev;
      const nextCode = Math.max(9, ...prev.map((m) => m.code ?? 0)) + 1;
      return [...prev, { id: newId, code: nextCode, name: 'Nuevo Material', sheetCost: 0, printTime: 2, inkCost: 0, printWear: 0, minCutTime: 1, maxCutTime: 5, cutWear: 0 }];
    });
    orderSetter((prev: any) => ({ ...prev, materialId: newId }));
  };

  const removeMaterial = (id: string, order: any, orderSetter: (order: any) => void) => {
    setMaterials((prev) => {
      if (!prev || prev.length <= 1) return prev;
      const filtered = prev.filter((m) => m.id !== id);
      if (order.materialId === id) orderSetter({ ...order, materialId: filtered[0].id });
      return filtered;
    });
  };

  const moveMaterial = (index: number, direction: -1 | 1) => {
    setMaterials((prev) => {
      if (!prev) return prev;
      const nm = [...prev];
      if (direction === -1 && index > 0) {
        [nm[index - 1], nm[index]] = [nm[index], nm[index - 1]];
      } else if (direction === 1 && index < nm.length - 1) {
        [nm[index + 1], nm[index]] = [nm[index], nm[index + 1]];
      }
      return nm;
    });
  };

  const updateShapeCatalog = (category: string, index: number, field: 'size' | 'qty' | 'code' | 'description' | 'image', value: string) => {
    setShapesCatalog((prev: ShapesCatalog | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        [category]: prev[category].map((it: any, i: number) =>
          i === index ? { ...it, [field]: field === 'size' ? value : field === 'description' || field === 'image' ? value : parseInt(value, 10) || 0 } : it,
        ),
      };
    });
  };

  const addShapeItem = (category: string) => {
    setShapesCatalog((prev: ShapesCatalog | null) => {
      if (!prev) return prev;
      const allCodes = Object.values(prev).flatMap((items: any[]) => items.map((it: any) => it.code ?? 0));
      const nextCode = Math.max(199, ...allCodes) + 1;
      return { ...prev, [category]: [...prev[category], { size: 'Nuevo', qty: 10, code: nextCode }] };
    });
  };

  const removeShapeItem = (category: string, index: number, order: any, orderSetter: (order: any) => void) => {
    setShapesCatalog((prev: ShapesCatalog | null) => {
      if (!prev) return prev;
      const nc = { ...prev, [category]: prev[category].filter((_: any, i: number) => i !== index) };
      if (order.shapeType === category && order.sizeIndex >= nc[category].length) {
        orderSetter({ ...order, sizeIndex: Math.max(0, nc[category].length - 1) });
      }
      return nc;
    });
  };

  const moveShapeItem = (category: string, index: number, direction: -1 | 1) => {
    setShapesCatalog((prev: ShapesCatalog | null) => {
      if (!prev) return prev;
      const items: any[] = prev[category];
      if (direction === -1 && index > 0) {
        const nc = [...items];
        [nc[index - 1], nc[index]] = [nc[index], nc[index - 1]];
        return { ...prev, [category]: nc };
      } else if (direction === 1 && index < items.length - 1) {
        const nc = [...items];
        [nc[index + 1], nc[index]] = [nc[index], nc[index + 1]];
        return { ...prev, [category]: nc };
      }
      return prev;
    });
  };

  const updateDeliveryOption = (id: string, field: 'label' | 'subtitle' | 'description' | 'image', value: string) =>
    setDeliveryOptions((prev) => (prev ? prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)) : prev));

  const updateDesignOption = (id: string, field: 'label' | 'subtitle' | 'description' | 'image', value: string) =>
    setDesignOptions((prev) => (prev ? prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)) : prev));

  const setShowMoreIndex = (category: string, index: number, shapesShowMoreIndex: Record<string, number> | null, setShapesShowMoreIndex: (index: Record<string, number> | null) => void) => {
    const itemCount = shapesShowMoreIndex?.[category] ?? 0;
    const validIndex = Math.max(0, Math.min(Math.floor(index), itemCount));
    setShapesShowMoreIndex({
      ...(shapesShowMoreIndex || {}),
      [category]: validIndex,
    });
  };

  return {
    isAdmin,
    setIsAdmin,
    activeTab,
    setActiveTab,
    showMathDetail,
    setShowMathDetail,
    isDeleteMode,
    setIsDeleteMode,
    handleConfigChange,
    updateMaterial,
    addMaterial,
    removeMaterial,
    moveMaterial,
    updateShapeCatalog,
    addShapeItem,
    removeShapeItem,
    moveShapeItem,
    updateDeliveryOption,
    updateDesignOption,
    setShowMoreIndex,
  };
};
