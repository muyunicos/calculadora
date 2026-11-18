import React, { useCallback, useEffect, useRef, useState } from 'react';

import { PMU_AJAX, PMU_NONCE, PMU_POST } from '../core/wp';
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
  /** Id ya subido (si hay): repoblala ranura tras un re-render del padre. */
  idInicial?: string;
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
  idInicial,
  onQuitar,
}) => {
  const [montado, setMontado] = useState(false);
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const cajaRef = useRef<HTMLDivElement | null>(null);
  const urlsRef = useRef<Record<string, string>>({});
  const filasRef = useRef<Record<string, FilaSubida>>({});
  const claveRef = useRef<string>(itemKey);
  // Spec 038 (T116): el sid del item (para el mockup cuando la fila no paso por
        // `subir`: la re-subida de una foto ya conocida entra por el camino `usado`).
  const sidRef = useRef('');
  // Spec 038 (F5h): URL del mockup 300x300 guardado en el item (preview aprobado).
  const previaRef = useRef('');
  // Spec 038 (T116-bis): nombre del archivo guardado (mockup-*.webp).
  const mockupNombreRef = useRef('');

    // Spec 038 (T116): el camino `usado` (foto ya subida a la biblioteca) no llena
    // `filasRef` porque no pasa por `subir`. El cargador avisa aca.
    // `refPublicar` evita el ciclo (filaReusada se declara antes que publicarDiseno).
    const refPublicar = useRef<(id: string) => void>(() => {});
    const filaReusada = useCallback((dato: { fila?: Record<string, unknown> }) => {
      const f = dato && dato.fila ? dato.fila : {};
      const id = String(f.id ?? '');
      if (!id) return;
      filasRef.current[id] = f as unknown as FilaSubida;
      if (f.sid) sidRef.current = String(f.sid);
      if (f.item_key) onItemKey(String(f.item_key));
      if (f.url) urlsRef.current[id] = String(f.url);
      // La foto cambio: hay que recomponer y re-publicar (y el mockup se guarda).
      refPublicar.current(id);
    }, [onItemKey]);

  // Guarda el mockup del preview en el item: el carrito lo reutiliza sin volver a
  // componer (ni bajar la imagen de 3000 px, ni montar el motor y la plantilla).
  const guardarMockup = useCallback(async (itemKey: string) => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      'canvas[aria-label="Vista previa de tu diseno en el producto"]',
    );
    if (!canvas || !itemKey) return;
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', 0.82));
    if (!blob) return;
    const fd = new FormData();
    const filaMock = filasRef.current[itemKey] || {};
    fd.append('action', 'pmu_cotizador');
    fd.append('op', 'mockup_guardar');
    fd.append('_wpnonce', PMU_NONCE);
    fd.append('sid', String(filaMock.sid || sidRef.current || ''));
    fd.append('item_key', itemKey);
    fd.append('mockup', blob, 'mockup.webp');
    try {
      const res = await fetch(PMU_POST, { method: 'POST', credentials: 'same-origin', body: fd });
      const j = (await res.json()) as { success?: boolean; data?: { url?: string; nombre?: string } };
      if (j && j.success && j.data && j.data.url) { previaRef.current = String(j.data.url); }
      const nom = (j && j.data && j.data.nombre) ? String(j.data.nombre) : '';
      if (nom) { mockupNombreRef.current = nom; }
    } catch {
      // Sin mockup guardado el carrito cae al respaldo del servidor.
    }
  }, []);

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
    if (fila.sid) { sidRef.current = String(fila.sid); }
    if (id) {
      fila.params = params ?? {};
      filasRef.current[id] = fila;
      if (fila.url) urlsRef.current[id] = String(fila.url);
    }
    if (fila.item_key) onItemKey(String(fila.item_key));
    return fila;
  }, [onItemKey, pdf]);

  const publicarDiseno = useCallback(async (id: string) => {
    const fila = filasRef.current[id] ?? {};
    const params = fila.params ?? {};
    // Spec 038 (F5h): guarda el mockup 300x300 antes de publicar (viaja con el carrito).
    await guardarMockup(String(fila.item_key ?? claveRef.current ?? ''));
    onDiseno({
      id,
      itemKey: String(fila.item_key ?? claveRef.current ?? ''),
      sid: String(fila.sid ?? sidRef.current ?? ''),
      w: Number(params.w ?? 0) || 0,
      h: Number(params.h ?? 0) || 0,
      receta: String(fila.receta ?? ''),
      url: String(fila.url ?? urlsRef.current[id] ?? ''),
      previa: previaRef.current || undefined,
      // Spec 038 (T116-bis): nombre del archivo del mockup (para que el carrito arme
      // la URL exacta sin adivinar; si falta, el plugin busca `mockup-*.webp`).
      mockupId: mockupNombreRef.current || undefined,
    });
  }, [onDiseno, guardarMockup]);
  // Spec 038 (T116): `filaReusada` llama a `publicarDiseno` a traves del ref
  // (se declara antes y el ciclo de declaraciones romperia el typecheck).
  useEffect(() => { refPublicar.current = (id: string) => { publicarDiseno(id); }; }, [publicarDiseno]);
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
      // Tras un re-render el padre publica el `diseno` y React puede REMONTAR el
      // cargador (sus deps cambian): sin esto la ranura arrancaba vacia y el
      // preview decia "Faltan 1 imagen(es)" aunque la subida ya existia.
      idsIniciales: idInicial ? [[idInicial]] : [],
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
      // Spec 038 (T116): el camino `usado` (foto de la biblioteca, 0 bytes) avisa
      // aca en vez de pasar por `subir` — sin esto `filasRef` quedaba vacio y el
      // mockup no se guardaba (el carrito se quedaba sin miniatura).
      onFila: (dato: { fila?: Record<string, unknown> }) => filaReusada(dato),
      // Spec 038 (A/FR-009): reutilizar la familia ya subida (0 bytes). Sin esto el
      // cotizador mandaba los bytes otra vez y nunca aparecia "Elegir ya subida".
      usar: async (madre: string, params?: Record<string, unknown>) => {
        const bib = (window as unknown as {
          PMUBiblioteca?: { usar?: (m: string, d: Record<string, unknown>) => Promise<unknown> };
        }).PMUBiblioteca;
        if (!bib || typeof bib.usar !== 'function') return { coincide: false };
        try {
          return await bib.usar(String(madre || ''), {
            item_key: claveRef.current,
            pdf: pdf || '',
            grupo: gidPara(categoria, size),
            indice: 0,
            params: params || {},
          });
        } catch {
          // Si la familia no coincide, el selector cae al camino normal (subir).
          return { coincide: false };
        }
      },
      // `CargadorPMU.prototype.estadoActual()` devuelve `{ids, listo, faltan, ...}`
      // (no `{ranuras}`: ese campo es la CANTIDAD de ranuras). El contrato de la
      // ficha es `PMU_API.montarCargador`, que si expone `ranuras[]`.
      onChange: (estado: { ids?: string[] }) => {
        const ids = estado?.ids ?? [];
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