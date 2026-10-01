import { useState, useEffect } from 'react';

/**
 * Hook personalizado para debounce de valores
 * @param value - Valor a debounce
 * @param delay - Tiempo de delay en milisegundos (default: 500ms)
 * @returns Valor debounced
 */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
