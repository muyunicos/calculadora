// Carga DIFERIDA de los modulos del plugin (spec 037, T009/D10/R9).
//
// El cotizador NO encola nada al abrir: los modulos de diseno se piden cuando el
// paso se abre y el resto cuando el comprador toca "Cargar imagen". Asi la pagina
// no paga los 51 KB gzip del subconjunto completo: 0 al cargar, ~32 al abrir el
// paso y ~23 mas al subir (`tienda.js` y `campo-montar.js` NUNCA se cargan).
//
// `PMU_TIENDA` se inyecta ANTES de pedir el primer modulo: es el objeto que ya
// leen todos los modulos del plugin (contrato C0). Sin `PMU_DISPONIBLE` (el tema
// no injecto el puente) el paso se degrada: el cotizador sigue cotizando.

import { useCallback, useEffect, useRef, useState } from 'react';
import { PMU_AJAX, PMU_BASE, PMU_DISPONIBLE, PMU_NONCE, PMU_POST } from '../core/wp';

export type PmuModulo = 'mockup-render' | 'selector' | 'visor' | 'biblioteca' | 'cargador' | 'fotos';

/** Nombre de archivo por modulo (los mismos handles del plugin). */
const ARCHIVOS: Record<PmuModulo, string> = {
  'mockup-render': 'mockup-render.js',
  selector: 'selector-pmu.js',
  visor: 'visor-pmu.js',
  biblioteca: 'biblioteca-pmu.js',
  cargador: 'cargador-pmu.js',
  fotos: 'fotos-pmu.js',
};

/** Lo que necesita el paso vacio (estado vacio por CSS + encuadre). */
const ORDEN_PASO: PmuModulo[] = ['mockup-render', 'selector'];
/** Lo que necesita el modal de subida (cargador + biblioteca + visor + cola). */
const ORDEN_IMAGEN: PmuModulo[] = ['visor', 'biblioteca', 'cargador', 'fotos'];

/** Promesas por URL: dos pasos abiertos no descargan el mismo archivo dos veces. */
const cache = new Map<string, Promise<void>>();

function cargar(src: string): Promise<void> {
  const previa = cache.get(src);
  if (previa) return previa;
  const promesa = new Promise<void>((resolver, rechazar) => {
    if (typeof document === 'undefined') {
      resolver();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolver();
    script.onerror = () => {
      cache.delete(src);
      rechazar(new Error(`pmu:asset:${src}`));
    };
    document.head.appendChild(script);
  });
  cache.set(src, promesa);
  return promesa;
}

/** Inyecta `PMU_TIENDA` una sola vez (contrato C0: contexto INFORMATIVO). */
function inyectarContexto(): void {
  if (typeof window === 'undefined' || window.PMU_TIENDA) return;
  window.PMU_TIENDA = {
    version: '1',
    ajaxUrl: PMU_AJAX,
    postUrl: PMU_POST,
    nonceVistaPrevia: PMU_NONCE,
    contexto: 'cotizador',
  };
}

export interface PmuAssetsApi {
  /** El puente esta configurado (URL del plugin + nonce). */
  disponible: boolean;
  /** Los modulos del paso estan cargados (se puede componer el mockup). */
  listo: boolean;
  /** Hay una descarga en curso. */
  cargando: boolean;
  /** Causa del ultimo fallo (`pmu:asset:...`), si hubo. */
  error: string;
  /** Pide los modulos del paso (idempotente). */
  abrir: () => Promise<void>;
  /** Pide los modulos del modal de subida (idempotente). */
  cargarImagen: () => Promise<void>;
}

export function usePmuAssets(): PmuAssetsApi {
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const pedido = useRef<Promise<void> | null>(null);

  useEffect(() => {
    inyectarContexto();
  }, []);

  const abrir = useCallback(async () => {
    if (!PMU_DISPONIBLE || listo) return;
    if (pedido.current) {
      await pedido.current;
      return;
    }
    setCargando(true);
    setError('');
    const trabajo = (async () => {
      // Secuencial: `selector` usa `PMUMockup` (mismo orden que la ficha).
      for (const modulo of ORDEN_PASO) {
        await cargar(`${PMU_BASE}assets/${ARCHIVOS[modulo]}`);
      }
    })();
    pedido.current = trabajo;
    try {
      await trabajo;
      setListo(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
      pedido.current = null;
    }
  }, [listo]);

  const cargarImagen = useCallback(async () => {
    if (!PMU_DISPONIBLE) return;
    await abrir();
    setCargando(true);
    setError('');
    try {
      for (const modulo of ORDEN_IMAGEN) {
        await cargar(`${PMU_BASE}assets/${ARCHIVOS[modulo]}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  }, [abrir]);

  return {
    disponible: PMU_DISPONIBLE,
    listo,
    cargando,
    error,
    abrir,
    cargarImagen,
  };
}