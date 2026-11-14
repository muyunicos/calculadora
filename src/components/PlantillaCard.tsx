import React from 'react';
import { Trash2, ArrowUp, ArrowDown, Copy, Eye, EyeOff } from 'lucide-react';

import type { PlantillaCotizador } from '../types';
import type { PdfPlantilla } from '../hooks/useCotizadorPdf';

/**
 * Tarjeta del catalogo de plantillas (spec 037, Enmienda v2 / T043).
 *
 * Cabecera con titulo/categoria/rango/PDF y acciones (ojo, orden, duplicar, borrar);
 * al abrir, los campos editables. El mockup NO se edita aca: eso vive en el Editor
 * de mockups del plugin.
 */

interface PlantillaCardProps {
  plantilla: PlantillaCotizador;
  indice: number;
  total: number;
  categorias: string[];
  pdfs: PdfPlantilla[];
  abierta: boolean;
  onAbrir: () => void;
  onCambio: (cambios: Partial<PlantillaCotizador>) => void;
  onBorrar: () => void;
  onDuplicar: () => void;
  onMover: (delta: number) => void;
}

const num = (v: string, def = 0): number => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : def;
};

export const PlantillaCard: React.FC<PlantillaCardProps> = ({
  plantilla,
  indice,
  total,
  categorias,
  pdfs,
  abierta,
  onAbrir,
  onCambio,
  onBorrar,
  onDuplicar,
  onMover,
}) => {
  const rango = plantilla.rango;

  return (
    <div className="border border-slate-200 rounded-xl bg-white">
      <div className="flex flex-wrap items-center gap-2 p-3">
        <span className="text-sm font-semibold text-slate-700">
          {plantilla.titulo || plantilla.id}
        </span>
        <span className="text-xs text-slate-500">{plantilla.categoria}</span>
        {rango ? (
          <span className="text-xs text-slate-500">
            {rango.minX}–{rango.maxX} x {rango.minY}–{rango.maxY} cm
          </span>
        ) : (
          <span className="text-xs text-emerald-700">todos los tamanos</span>
        )}
        <span className="text-xs text-slate-400">
          {plantilla.pdf ? `PDF: ${plantilla.pdf}` : 'sin PDF (solo imagen)'}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="cl-button-secondary-small"
            aria-label={plantilla.visible === false ? 'Mostrar' : 'Ocultar'}
            onClick={() => onCambio({ visible: plantilla.visible === false })}
          >
            {plantilla.visible === false
              ? <EyeOff className="w-4 h-4" />
              : <Eye className="w-4 h-4" />}
          </button>
          <button
            type="button"
            className="cl-button-secondary-small"
            aria-label="Subir"
            disabled={indice === 0}
            onClick={() => onMover(-1)}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="cl-button-secondary-small"
            aria-label="Bajar"
            disabled={indice === total - 1}
            onClick={() => onMover(1)}
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="cl-button-secondary-small"
            aria-label="Duplicar"
            onClick={onDuplicar}
          >
            <Copy className="w-4 h-4" />
          </button>
          <button type="button" className="cl-button-secondary-small" onClick={onAbrir}>
            {abierta ? 'Cerrar' : 'Editar'}
          </button>
          <button
            type="button"
            className="cl-button-secondary-small"
            aria-label="Borrar"
            onClick={onBorrar}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {abierta && (
        <div className="grid gap-3 p-3 pt-0 sm:grid-cols-2">
          <label className="block text-xs font-bold text-slate-500 uppercase">
            Titulo (lo ve el cliente)
            <input
              className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1 text-sm font-normal text-slate-800"
              value={plantilla.titulo}
              onChange={(e) => onCambio({ titulo: e.target.value })}
            />
          </label>
          <label className="block text-xs font-bold text-slate-500 uppercase">
            Categoria
            <select
              className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1 text-sm font-normal text-slate-800"
              value={plantilla.categoria}
              onChange={(e) => onCambio({ categoria: e.target.value })}
            >
              {categorias.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-500 uppercase sm:col-span-2">
            PDF importado (plantilla de produccion)
            <select
              className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1 text-sm font-normal text-slate-800"
              value={plantilla.pdf}
              onChange={(e) => onCambio({ pdf: e.target.value })}
            >
              <option value="">Sin PDF (solo imagen procesada)</option>
              {pdfs.map((pdf) => (
                <option key={pdf.slug} value={pdf.slug}>{pdf.titulo || pdf.slug}</option>
              ))}
              {plantilla.pdf !== '' && !pdfs.some((p) => p.slug === plantilla.pdf) && (
                <option value={plantilla.pdf}>{plantilla.pdf}</option>
              )}
            </select>
            {!plantilla.pdf && (
              <span className="mt-1 block normal-case font-normal text-amber-700">
                Sin PDF no se entrega PDF: el pedido lleva solo la imagen procesada.
              </span>
            )}
          </label>

          <label className="block text-xs font-bold text-slate-500 uppercase">
            Grupo del PDF que recibe el arte
            <select
              className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-normal text-slate-800"
              value={plantilla.grupo ?? 'todos'}
              onChange={(e) => onCambio({ grupo: e.target.value })}
            >
              <option value="todos">Todos los grupos (recomendado)</option>
              <option value="auto">Solo el grupo mayor</option>
              {(pdfs.find((p) => p.slug === plantilla.pdf)?.grupos ?? []).map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-500 uppercase">
            Mockup propio (sin PDF)
            <select
              className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-normal text-slate-800"
              value={plantilla.mockup ? 'si' : 'no'}
              onChange={(e) => onCambio({
                mockup: e.target.value === 'si'
                  ? { fondo: 1, hueco: { x: 60, y: 60, w: 180, h: 180, rot: 0 }, forma: 'rectangulo' }
                  : undefined,
              })}
            >
              <option value="no">No (solo los mockups del PDF)</option>
              <option value="si">Si (fondo + hueco)</option>
            </select>
          </label>
          {plantilla.mockup && (
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Fondo (id del catalogo img/)
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1 text-sm font-normal text-slate-800"
                    value={plantilla.mockup.fondo}
                    onChange={(e) => onCambio({ mockup: { ...plantilla.mockup!, fondo: num(e.target.value) } })}
                  />
                </label>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Forma del hueco
                  <select
                    className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1 text-sm font-normal text-slate-800"
                    value={plantilla.mockup.forma}
                    onChange={(e) => onCambio({ mockup: { ...plantilla.mockup!, forma: e.target.value as 'rectangulo' | 'circulo' | 'cuadrado' | 'ovalo' } })}
                  >
                    <option value="rectangulo">Rectangulo</option>
                    <option value="cuadrado">Cuadrado</option>
                    <option value="circulo">Circulo</option>
                    <option value="ovalo">Ovalo</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {(['x', 'y', 'w', 'h', 'rot'] as const).map((clave) => (
                  <label key={clave} className="block text-[10px] font-bold text-slate-500 uppercase">
                    {clave}
                    <input
                      type="number"
                      className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1 text-sm font-normal text-slate-800"
                      value={plantilla.mockup!.hueco[clave] ?? 0}
                      onChange={(e) => onCambio({ mockup: { ...plantilla.mockup!, hueco: { ...plantilla.mockup!.hueco, [clave]: num(e.target.value) } } })}
                    />
                  </label>
                ))}
              </div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">
                Mostrar el mockup
                <select
                  className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1 text-sm font-normal text-slate-800"
                  value={plantilla.requiere ?? ''}
                  onChange={(e) => onCambio({ requiere: e.target.value === '' ? null : (e.target.value as 'arte' | 'pdf') })}
                >
                  <option value="">Siempre</option>
                  <option value="arte">Solo con arte subido</option>
                  <option value="pdf">Solo si la plantilla tiene PDF</option>
                </select>
              </label>
              <p className="text-[11px] text-slate-500">El fondo se elige por id del catalogo img/ (o mockups/). El hueco va en px sobre 300x300.</p>
            </div>
          )}
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
              <input
                type="checkbox"
                checked={!!rango}
                onChange={(e) => onCambio({
                  rango: e.target.checked
                    ? { minX: 0, maxX: 100, minY: 0, maxY: 100 }
                    : undefined,
                })}
              />
              Solo en un rango de tamano
            </label>
            {rango && (
              <div className="grid grid-cols-4 gap-2">
                {(['minX', 'maxX', 'minY', 'maxY'] as const).map((clave) => (
                  <label key={clave} className="block text-[10px] font-bold text-slate-500 uppercase">
                    {clave}
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      className="mt-1 w-20 border border-slate-300 rounded-md px-2 py-1 text-sm font-normal text-slate-800"
                      value={rango[clave]}
                      onChange={(e) => onCambio({
                        rango: {
                          minX: rango.minX,
                          maxX: rango.maxX,
                          minY: rango.minY,
                          maxY: rango.maxY,
                          [clave]: num(e.target.value),
                        },
                      })}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
          <p className="sm:col-span-2 text-xs text-slate-500">
            Los tamanos intermedios del rango se resuelven solos: no hay que cargar cada medida.
            La forma del hueco es siempre automatica (la del placeholder del PDF).
          </p>
        </div>
      )}
    </div>
  );
};

export default PlantillaCard;