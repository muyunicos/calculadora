// Ideas, favoritos e historial del comprador (spec 037, T031).
//
// Habla SOLO con el endpoint unico del plugin (`admin_post_pmu_cotizador`,
// contrato C2) y cachea los METADATOS en `localStorage` (patron de
// `PMUBiblioteca`): al reabrir la pagina la tira pinta al instante y despues
// revalida con la `revision` (si no cambio, el servidor responde `sin_cambios` y
// no viaja la lista). Toda mutacion invalida la copia: nunca se muestra una
// estrella o un borrado que el servidor no acepto.

import { useCallback, useEffect, useRef, useState } from 'react';
import { PMU_DISPONIBLE, PMU_NONCE, PMU_POST } from '../core/wp';
import type { FavoritoRef, IdeaCustom } from '../types';

/** Pedido del historial: se DERIVA de Woo, no se guarda (FR-023). */
export interface HistorialPedido {
  order_id: number;
  order_code: string;
  fecha: string;
  diseno: { id: string; itemKey: string; w: number; h: number; receta: string; order?: string };
}

const CLAVE_CACHE = 'pmu_cotizador_cache_v1';

interface CacheIdeas {
  revision: string;
  ideas: IdeaCustom[];
  favoritos: FavoritoRef[];
  ts: number;
}

function leerCache(): CacheIdeas | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const crudo = localStorage.getItem(CLAVE_CACHE);
    if (!crudo) return null;
    const datos = JSON.parse(crudo) as CacheIdeas;
    return Array.isArray(datos.ideas) ? datos : null;
  } catch {
    return null;
  }
}

function guardarCache(datos: CacheIdeas): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CLAVE_CACHE, JSON.stringify(datos));
  } catch {
    // Sin espacio o en modo privado: la cache es una comodidad, no un requisito.
  }
}

interface Respuesta {
  success?: boolean;
  data?: Record<string, unknown>;
}

/** POST al endpoint unico. Devuelve `data` o lanza con la causa del servidor. */
async function post(
  op: string,
  campos: Record<string, string>,
  archivo?: { nombre: string; blob: Blob },
): Promise<Record<string, unknown>> {
  if (!PMU_DISPONIBLE || !PMU_POST) {
    throw new Error('cotizador:inactivo');
  }
  const cuerpo = new FormData();
  cuerpo.append('action', 'pmu_cotizador');
  cuerpo.append('op', op);
  cuerpo.append('_wpnonce', PMU_NONCE);
  Object.keys(campos).forEach((k) => cuerpo.append(k, campos[k]));
  if (archivo) cuerpo.append('mockup', archivo.blob, archivo.nombre);
  const res = await fetch(PMU_POST, { method: 'POST', credentials: 'same-origin', body: cuerpo });
  let json: Respuesta = {};
  try {
    json = (await res.json()) as Respuesta;
  } catch {
    throw new Error('cotizador:respuesta:invalida');
  }
  if (!res.ok || json.success !== true || !json.data) {
    const causa = typeof json.data === 'string' ? json.data : 'cotizador:error';
    throw new Error(causa);
  }
  return json.data;
}
export interface IdeasApi {
  disponible: boolean;
  ideas: IdeaCustom[];
  favoritos: FavoritoRef[];
  pedidos: HistorialPedido[];
  revision: string;
  cargando: boolean;
  error: string;
  listar: (forzar?: boolean) => Promise<void>;
  historial: () => Promise<void>;
  guardar: (idea: IdeaCustom, snapshot?: Blob) => Promise<IdeaCustom | null>;
  favorito: (tipo: 'custom' | 'tienda' | 'historial', ref: string, valor: boolean) => Promise<boolean>;
  borrar: (ideaId: string) => Promise<boolean>;
  invalidar: () => void;
}

export function useClientIdeas(activo = true): IdeasApi {
  const [ideas, setIdeas] = useState<IdeaCustom[]>([]);
  const [favoritos, setFavoritos] = useState<FavoritoRef[]>([]);
  const [pedidos, setPedidos] = useState<HistorialPedido[]>([]);
  const [revision, setRevision] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const hidratado = useRef(false);

  // Pintado instantaneo con la copia local (si hay) antes de revalidar.
  useEffect(() => {
    if (!activo || hidratado.current) return;
    hidratado.current = true;
    const cache = leerCache();
    if (!cache) return;
    setIdeas(cache.ideas);
    setFavoritos(cache.favoritos);
    setRevision(cache.revision);
  }, [activo]);

  const listar = useCallback(async (forzar = false) => {
    if (!activo || !PMU_DISPONIBLE) return;
    setCargando(true);
    setError('');
    try {
      const datos = await post('listar', forzar ? {} : { desde: revision });
      if (datos.sin_cambios) {
        guardarCache({ revision: String(datos.revision ?? revision), ideas, favoritos, ts: Date.now() });
        return;
      }
      const nuevas = (Array.isArray(datos.ideas) ? datos.ideas : []) as IdeaCustom[];
      const nuevosFav = (Array.isArray(datos.favoritos) ? datos.favoritos : []) as FavoritoRef[];
      const rev = String(datos.revision ?? '');
      setIdeas(nuevas);
      setFavoritos(nuevosFav);
      setRevision(rev);
      guardarCache({ revision: rev, ideas: nuevas, favoritos: nuevosFav, ts: Date.now() });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  }, [activo, favoritos, ideas, revision]);

  const historial = useCallback(async () => {
    if (!activo || !PMU_DISPONIBLE) return;
    try {
      const datos = await post('historial', {});
      setPedidos((Array.isArray(datos.pedidos) ? datos.pedidos : []) as HistorialPedido[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [activo]);

  const invalidar = useCallback(() => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(CLAVE_CACHE);
    } catch {
      // Sin storage: no hay copia que invalidar.
    }
  }, []);

  const guardar = useCallback(async (idea: IdeaCustom, snapshot?: Blob) => {
    try {
      const datos = await post(
        'guardar',
        { idea: JSON.stringify(idea) },
        snapshot ? { nombre: 'mockup.webp', blob: snapshot } : undefined,
      );
      invalidar();
      await listar(true);
      return (datos.idea ?? null) as IdeaCustom | null;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [invalidar, listar]);

  const favorito = useCallback(async (
    tipo: 'custom' | 'tienda' | 'historial',
    ref: string,
    valor: boolean,
  ) => {
    try {
      await post('favorito', { tipo, ref, valor: valor ? '1' : '0' });
      invalidar();
      await listar(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [invalidar, listar]);

  const borrar = useCallback(async (ideaId: string) => {
    try {
      await post('borrar', { idea_id: ideaId });
      invalidar();
      await listar(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [invalidar, listar]);

  return {
    disponible: PMU_DISPONIBLE,
    ideas,
    favoritos,
    pedidos,
    revision,
    cargando,
    error,
    listar,
    historial,
    guardar,
    favorito,
    borrar,
    invalidar,
  };
}