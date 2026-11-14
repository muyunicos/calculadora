// Puente con los PDFs del plugin para el cotizador (spec 037, Enmienda v2 / T041).
//
// - `useMockupsPdf(pdf)` trae los **mockups del Editor** de ese PDF (`op=mockups`,
//   contrato C5.2): capas + grupos + imagenes + envolturas. Se cachea por `pdf` y
//   `revision`, asi cambiar de tamano dentro de la misma plantilla no vuelve a pedir.
// - `listarPdfs()` trae el **catalogo de plantillas** (`op=pdfs`, C5.3, solo admin).

import { useCallback, useEffect, useState } from 'react';
import { PMU_DISPONIBLE, PMU_NONCE, PMU_POST } from '../core/wp';
import type { MockupsPdf } from '../types';

/** PDF importado con mockups (lo que alimenta el `select` del panel). */
export interface PdfPlantilla {
  slug: string;
  titulo: string;
  mockups: string[];
  tiene_mockups: boolean;
  /** Spec 038 (D1): grupos (6 hex) del PDF; el arte puede ir a todos. */
  grupos?: string[];
}

interface Respuesta {
  success?: boolean;
  data?: Record<string, unknown>;
}

async function post(op: string, campos: Record<string, string> = {}): Promise<Record<string, unknown>> {
  if (!PMU_DISPONIBLE || !PMU_POST) {
    throw new Error('cotizador:inactivo');
  }
  const cuerpo = new FormData();
  cuerpo.append('action', 'pmu_cotizador');
  cuerpo.append('op', op);
  cuerpo.append('_wpnonce', PMU_NONCE);
  Object.keys(campos).forEach((k) => cuerpo.append(k, campos[k]));
  const res = await fetch(PMU_POST, { method: 'POST', credentials: 'same-origin', body: cuerpo });
  let json: Respuesta = {};
  try {
    json = (await res.json()) as Respuesta;
  } catch {
    throw new Error('cotizador:respuesta:invalida');
  }
  if (!res.ok || json.success !== true || !json.data) {
    throw new Error(typeof json.data === 'string' ? json.data : 'cotizador:error');
  }
  return json.data;
}

/** Cache por PDF: `revision` viene del servidor (sha1 de los mockups). */
const cache = new Map<string, MockupsPdf>();

export interface MockupsPdfApi {
  datos: MockupsPdf | null;
  cargando: boolean;
  error: string;
  recargar: () => void;
}

export function useMockupsPdf(pdf: string): MockupsPdfApi {
  const [datos, setDatos] = useState<MockupsPdf | null>(() => (pdf ? cache.get(pdf) ?? null : null));
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!pdf || !PMU_DISPONIBLE) {
      setDatos(null);
      return;
    }
    const previo = cache.get(pdf);
    if (previo) {
      setDatos(previo);
      return;
    }
    let vivo = true;
    setCargando(true);
    setError('');
    post('mockups', { pdf })
      .then((respuesta) => {
        if (!vivo) return;
        const datosNuevos = respuesta as unknown as MockupsPdf;
        cache.set(pdf, datosNuevos);
        setDatos(datosNuevos);
      })
      .catch((e) => {
        if (!vivo) return;
        setError(e instanceof Error ? e.message : String(e));
        setDatos(null);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [pdf, tick]);

  const recargar = useCallback(() => {
    if (pdf) cache.delete(pdf);
    setTick((n) => n + 1);
  }, [pdf]);

  return { datos, cargando, error, recargar };
}

/** Catalogo de PDFs importados con mockups (admin). */
export async function listarPdfs(): Promise<PdfPlantilla[]> {
  const datos = await post('pdfs');
  const lista = Array.isArray(datos.pdfs) ? datos.pdfs : [];
  return lista as PdfPlantilla[];
}