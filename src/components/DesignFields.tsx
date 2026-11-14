import React, { useCallback, useEffect, useRef, useState } from 'react';

import { PMU_AJAX, PMU_NONCE } from '../core/wp';
import { gidPara, sizeToPx } from '../core/mockups';
import type { Diseno } from '../types';
import type { PmuAssetsApi } from '../hooks/usePmuAssets';

/**
 * Subida del arte del cotizador (spec 037, T017).
 *
 * Envuelve el **`CargadorPMU` del plugin** (que a su vez abre el `SelectorPMU`
 * para recortar): el comprador encuadra contra la forma real del sticker, el
 * navegador compone el recorte y el servidor recibe el ORIGINAL + la receta v2
 * que armo el selector. No es un segundo editor: es el mismo par de modulos que
 * usa la ficha.
 *
 * - `subir(blob, meta)`: contrato del cargador (`config.subir` -> `{id}`). Hace el
 *   POST al endpoint vigente (`personalizador_pdf_subida`) con
 *   `contexto=cotizador`; el `item_key` lo crea el servidor (`cot-{8 hex}`).
 * - `urlDe(id)`: URL que devolvio el endpoint (endpoint protegido, no ruta).
 * - `onChange`: cuando la ranura tiene un id se publica el `diseno` completo
 *   (id, itemKey, sid, w, h, receta) que viaja con el pedido.
 *
 * Si los modulos no cargan, se degrada (D9) al input de archivo nativo: se sigue
 * pudiendo comprar con arte, sin recorte interactivo.
 */

interface CargadorApi {
  montar: () => boolean;
  desmontar?: () => void;
}

interface FilaSubida {
  id?: string;
  item_key?: string;
  receta?: string;
  url?: string;
  sid?: string;
  params?: Record<string, unknown>;
}

export interface DesignFieldsProps {
  categoria: string;
  size: string;
  forma: string;
  /** Plantilla importada (slug); vacio = item sin PDF (solo imagen procesada). */
  pdf: string;
  /** Spec 038 (D1): grupo(s) del PDF que reciben el arte ('todos' por defecto). */
  grupo?: string;
  itemKey: string;
  onItemKey: (itemKey: string) => void;
  onDiseno: (diseno: Diseno | null) => void;
  onSubiendo: (subiendo: boolean) => void;
  assets: PmuAssetsApi;
  hayDiseno: boolean;
  onQuitar: () => void;
}

export const DesignFields: React.FC<DesignFieldsProps> = ({
  categoria,
  size,
  forma,
  pdf,
  grupo,
  itemKey,
  onItemKey,
  onDiseno,
  onSubiendo,
  assets,
  hayDiseno,
  onQuitar,
}) => {
  const [montado, setMontado] = useState(false);
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const cajaRef = useRef<HTMLDivElement | null>(null);
  const urlsRef = useRef<Record<string, string>>({});
  const filasRef = useRef<Record<string, FilaSubida>>({});
  const claveRef = useRef<string>(itemKey);

  useEffect(() => { claveRef.current = itemKey; }, [itemKey]);

  const marcarSubiendo = useCallback((valor: boolean) => {
    setSubiendo(valor);
    onSubiendo(valor);
  }, [onSubiendo]);

  /** POST al endpoint vigente; guarda la fila y devuelve `{id}` al cargador. */
  const subirAlPlugin = useCallback(async (
    blob: Blob,
    params?: Record<string, unknown>,
  ): Promise<FilaSubida> => {
    const clave = claveRef.current || '';
    const cuerpo = new FormData();
    cuerpo.append('action', 'personalizador_pdf_subida');
    cuerpo.append('_wpnonce', PMU_NONCE);
    cuerpo.append('contexto', 'cotizador');
    // Enmienda v2: la plantilla importada de esta categoria+tamano (si hay).
    if (pdf) { cuerpo.append('pdf', pdf); }
    if (grupo) { cuerpo.append('grupo', grupo); }
    if (clave) cuerpo.append('item_key', clave);
    cuerpo.append('imagen', blob, 'arte.png');
    cuerpo.append('params', JSON.stringify(params ?? {}));
    const res = await fetch(PMU_AJAX, { method: 'POST', credentials: 'same-origin', body: cuerpo });
    const json = (await res.json()) as { success?: boolean; data?: FilaSubida | string };
    if (!json.success || !json.data || typeof json.data === 'string') {
      throw new Error(typeof json.data === 'string' ? json.data : 'cotizador:subida:falla');
    }
    const fila = json.data;
    const id = String(fila.id ?? '');
    if (id) {
      fila.params = params ?? {};
      filasRef.current[id] = fila;
      if (fila.url) urlsRef.current[id] = String(fila.url);
    }
    if (fila.item_key) onItemKey(String(fila.item_key));
    return fila;
  }, [onItemKey, pdf]);

  const publicarDiseno = useCallback((id: string) => {
    const fila = filasRef.current[id] ?? {};
    const params = fila.params ?? {};
    onDiseno({
      id,
      itemKey: String(fila.item_key ?? claveRef.current ?? ''),
      sid: String(fila.sid ?? ''),
      w: Number(params.w ?? 0) || 0,
      h: Number(params.h ?? 0) || 0,
      receta: String(fila.receta ?? ''),
      url: String(fila.url ?? urlsRef.current[id] ?? ''),
    });
  }, [onDiseno]);
// Monta el CargadorPMU cuando los modulos estan disponibles.
  useEffect(() => {
    type Ctor = new (el: HTMLElement, cfg: Record<string, unknown>) => CargadorApi;
    const Ctor = (window as unknown as { CargadorPMU?: Ctor }).CargadorPMU;
    const caja = cajaRef.current;
    if (!montado || !caja || typeof Ctor !== 'function') return;
    const px = sizeToPx(size);
    const w = px.w > 0 ? px.w : 300;
    const h = px.h > 0 ? px.h : 300;
    caja.innerHTML = '';
    const cargador = new Ctor(caja, {
      ranuras: [{
        w,
        h,
        forma: forma || 'rectangulo',
        modo: 'cubrir',
        transp: 'no',
        fondo: '#ffffff',
        phsize: 0,
        gid: gidPara(categoria, size),
        min: 0,
        max: 1,
      }],
      tecnico: false,
      subir: async (blob: Blob, meta?: { params?: Record<string, unknown> }) => {
        marcarSubiendo(true);
        try {
          const fila = await subirAlPlugin(blob, meta?.params);
          return { id: String(fila.id ?? '') };
        } finally {
          marcarSubiendo(false);
        }
      },
      urlDe: (id: string) => urlsRef.current[id] ?? '',
      onChange: (estado: { ranuras?: Array<{ ids?: string[] }> }) => {
        const ids = (estado?.ranuras ?? []).flatMap((r) => r.ids ?? []);
        if (ids.length > 0) publicarDiseno(String(ids[0]));
      },
    });
    cargador.montar();
    return () => {
      try {
        cargador.desmontar?.();
      } catch {
        // El modulo limpia su propio DOM al cerrar el modal.
      }
    };
  }, [montado, categoria, size, forma, publicarDiseno, subirAlPlugin, marcarSubiendo]);

  const abrir = useCallback(async () => {
    setError('');
    if (montado) return;
    await assets.cargarImagen();
    const Ctor = (window as unknown as { CargadorPMU?: unknown }).CargadorPMU;
    if (typeof Ctor !== 'function') {
      // Degradacion (D9): sin modulos cargados, input nativo.
      const input = document.getElementById('pmu-cotizador-archivo') as HTMLInputElement | null;
      input?.click();
      return;
    }
    setMontado(true);
  }, [assets, montado]);

  return (
    <div className="space-y-2">
      <div ref={cajaRef} data-pmu-panel data-pmu-contexto="cotizador" className="min-h-0" />
      {!montado && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">
            {hayDiseno ? 'Tu diseno' : 'Subi tu diseno (opcional)'}
          </p>
          <p className="text-xs text-slate-500">
            {hayDiseno
              ? 'Podes cambiarlo o quitarlo cuando quieras.'
              : 'PNG, JPG o WEBP. Lo encuadras contra la forma del sticker y ves el mockup.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="cl-button-primary-small"
              disabled={subiendo || assets.cargando}
              onClick={() => { void abrir(); }}
            >
              {subiendo || assets.cargando
                ? 'Cargando...'
                : (hayDiseno ? 'Cambiar' : 'Cargar imagen')}
            </button>
            {hayDiseno && (
              <button type="button" className="cl-button-secondary-small" onClick={onQuitar}>
                Quitar
              </button>
            )}
          </div>
        </div>
      )}
      <input
        id="pmu-cotizador-archivo"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          e.target.value = '';
          if (!archivo) return;
          marcarSubiendo(true);
          subirAlPlugin(archivo)
            .then((fila) => {
              if (fila.id) publicarDiseno(String(fila.id));
            })
            .catch((err) => setError(err instanceof Error ? err.message : String(err)))
            .finally(() => marcarSubiendo(false));
        }}
      />
      {(subiendo || assets.cargando) && (
        <p className="text-xs text-slate-500">Subiendo tu diseno...</p>
      )}
      {(error !== '' || assets.error !== '') && (
        <p className="text-xs text-red-600" role="alert">
          No pudimos cargar tu diseno ({error || assets.error}). Reintenta o segui sin diseno.
        </p>
      )}
    </div>
  );
};

export default DesignFields;