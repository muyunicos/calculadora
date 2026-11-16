import { useCallback, useEffect, useState } from 'react';

/**
 * Estado del visor compartido por las dos tiras (spec 038, Fase N).
 *
 * `MiniGallery` y `TiraIdeas` tenian la MISMA logica (indice, flechas, teclado y
 * bloqueo del scroll): una sola implementacion. Cuando el visor lo pinta el
 * MOTOR del tema (`conMotor`), el teclado y el scroll los maneja el motor y este
 * hook no agrega listeners (evita el doble Escape).
 */
export interface VisorEstado {
  indice: number | null;
  abierto: boolean;
  abrir: (indice: number) => void;
  cerrar: () => void;
  prev: () => void;
  next: () => void;
}

export function useMotorVisor(total: number, conMotor = false): VisorEstado {
  const [indice, setIndice] = useState<number | null>(null);
  const tope = Math.max(1, total);

  const abrir = useCallback((i: number) => {
    if (i >= 0 && i < total) setIndice(i);
  }, [total]);
  const cerrar = useCallback(() => setIndice(null), []);
  const prev = useCallback(
    () => setIndice((i) => (i === null ? i : (i - 1 + tope) % tope)),
    [tope],
  );
  const next = useCallback(
    () => setIndice((i) => (i === null ? i : (i + 1) % tope)),
    [tope],
  );

  // Fallback (sin motor): teclado + bloqueo del scroll mientras el visor esta abierto.
  useEffect(() => {
    if (indice === null || conMotor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previo;
    };
  }, [indice, conMotor, cerrar, prev, next]);

  return { indice, abierto: indice !== null, abrir, cerrar, prev, next };
}