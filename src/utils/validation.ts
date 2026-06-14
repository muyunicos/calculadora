/**
 * Utilidades de validación para la interfaz de admin
 */

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
