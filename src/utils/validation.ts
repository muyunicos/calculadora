/**
 * Utilidades de validación para la interfaz de admin
 */

import type { Material, ShapesCatalog } from '../types';

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Valida si un código es único dentro de un array de elementos
 */
export const validateUniqueCode = (
  code: number,
  items: Array<{ code?: number; id: string }>,
  currentId?: string
): ValidationResult => {
  if (isNaN(code) || code < 0) {
    return {
      isValid: false,
      message: 'El código debe ser un número positivo',
    };
  }

  const duplicate = items.find(
    (item) => item.code === code && item.id !== currentId
  );

  if (duplicate) {
    return {
      isValid: false,
      message: 'Este código ya está en uso. Usa un código único.',
    };
  }

  return { isValid: true };
};

/**
 * Valida si un campo requerido tiene contenido
 */
export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  if (!value || value.trim() === '') {
    return {
      isValid: false,
      message: `${fieldName} es requerido`,
    };
  }

  return { isValid: true };
};

/**
 * Valida si un valor numérico está dentro de un rango
 */
export const validateRange = (
  value: number,
  min: number,
  max: number,
  fieldName: string
): ValidationResult => {
  if (isNaN(value)) {
    return {
      isValid: false,
      message: `${fieldName} debe ser un número válido`,
    };
  }

  if (value < min || value > max) {
    return {
      isValid: false,
      message: `${fieldName} debe estar entre ${min} y ${max}`,
    };
  }

  return { isValid: true };
};

/**
 * Valida si un URL es válido
 */
export const validateUrl = (url: string): ValidationResult => {
  if (!url) return { isValid: true }; // URLs son opcionales

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return {
      isValid: false,
      message: 'URL inválida. Debe comenzar con http:// o https://',
    };
  }
};

// --- UNICIDAD DE CÓDIGOS ---
// El código de pedido (v1.m11.s60...) identifica material y tamaño por `code`.
// Si dos opciones comparten código, `decodeOrderCode` resuelve la primera y los
// links/galería cargan la opción equivocada. El Admin no lo detectaba.
export interface DuplicateCodeGroup {
  code: number;
  items: string[];
}

const groupByCode = (entries: Array<{ code?: number; label: string }>): DuplicateCodeGroup[] => {
  const byCode = new Map<number, string[]>();
  for (const entry of entries) {
    if (entry.code === undefined || entry.code === null) continue;
    const list = byCode.get(entry.code) ?? [];
    list.push(entry.label);
    byCode.set(entry.code, list);
  }
  return Array.from(byCode.entries())
    .filter(([, labels]) => labels.length > 1)
    .map(([code, labels]) => ({ code, items: labels }));
};

export const findMaterialCodeDuplicates = (materials: Material[]): DuplicateCodeGroup[] =>
  groupByCode(materials.map((m) => ({ code: m.code, label: m.name })));

export const findShapeCodeDuplicates = (shapesCatalog: ShapesCatalog): DuplicateCodeGroup[] =>
  groupByCode(
    Object.entries(shapesCatalog).flatMap(([category, items]) =>
      items.map((item) => ({ code: item.code, label: `${category} ${item.size}` })),
    ),
  );

/** Mensajes listos para mostrar/registrar (uno por grupo duplicado). */
export const describeDuplicateCodes = (
  groups: DuplicateCodeGroup[],
  kind: 'material' | 'tamaño',
): string[] => groups.map((g) => `${kind} ${g.code}: ${g.items.join(' / ')}`);
