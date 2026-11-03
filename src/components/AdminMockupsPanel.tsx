import React, { useCallback, useRef, useState } from 'react';
import { Trash2, Plus, Image as ImageIcon } from 'lucide-react';

import type { MockupDef, MockupForma } from '../types';
import { MockupPreview } from './MockupPreview';

/**
 * Pestana "Mockups" del admin (spec 037, T013/T014).
 *
 * Define, por CATEGORIA (y opcionalmente por TAMANO), la foto de escena y el hueco
 * donde va el arte del comprador. El mockup se ve al instante con
 * `PMUMockup.componer` (el mismo nucleo del cliente): lo que el admin aprueba es
 * exactamente lo que ve el comprador.
 *
 * El hueco se arrastra (posicion) y se redimensiona desde la esquina (tamano);
 * los campos numericos permiten el ajuste fino. Un hueco fuera del lienzo se avisa
 * (FR-035) y no se publica: `sanitizeMockups()` lo descarta al guardar.
 */

interface AdminMockupsPanelProps {
  mockups: MockupDef[];
  categorias: string[];
  onChange: (mockups: MockupDef[]) => void;
}

const FORMAS: MockupForma[] = ['auto', 'rectangulo', 'circulo', 'cuadrado', 'ovalo'];

const nuevoId = (): string => `mk-${Math.floor(Math.random() * 1e6).toString(36)}`;

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

export const AdminMockupsPanel: React.FC<AdminMockupsPanelProps> = ({ mockups, categorias, onChange }) => {
  const [abierto, setAbierto] = useState<string | null>(mockups[0]?.id ?? null);
  const lienzoRef = useRef<HTMLDivElement | null>(null);

  const actualizar = useCallback((id: string, cambios: Partial<MockupDef>) => {
    onChange(mockups.map((m) => (m.id === id ? { ...m, ...cambios } : m)));
  }, [mockups, onChange]);

  const agregar = () => {
    const nuevo: MockupDef = {
      id: nuevoId(),
      titulo: '',
      categoria: categorias[0] ?? 'Circulares',
      fondo: '',
      hueco: { x: 100, y: 100, w: 100, h: 100, rot: 0 },
      forma: 'auto',
      visible: true,
    };
    onChange([...mockups, nuevo]);
    setAbierto(nuevo.id);
  };

  const borrar = (id: string) => {
    onChange(mockups.filter((m) => m.id !== id));
    if (abierto === id) setAbierto(null);
  };

  /** Arrastre del hueco (posicion) y de la esquina (tamano), en espacio 300x300. */
  const arrastrar = (evento: React.PointerEvent, mockup: MockupDef, modo: 'mover' | 'redimensionar') => {
    const caja = lienzoRef.current?.getBoundingClientRect();
    if (!caja) return;
    evento.preventDefault();
    evento.stopPropagation();
    const escala = 300 / caja.width;
    const inicioX = evento.clientX;
    const inicioY = evento.clientY;
    const previo = { ...mockup.hueco };
    const mover = (e: PointerEvent) => {
      const dx = (e.clientX - inicioX) * escala;
      const dy = (e.clientY - inicioY) * escala;
      if (modo === 'mover') {
        actualizar(mockup.id, {
          hueco: {
            ...previo,
            x: Math.round(clamp(previo.x + dx, 0, 300 - previo.w)),
            y: Math.round(clamp(previo.y + dy, 0, 300 - previo.h)),
          },
        });
      } else {
        actualizar(mockup.id, {
          hueco: {
            ...previo,
            w: Math.round(clamp(previo.w + dx, 10, 300 - previo.x)),
            h: Math.round(clamp(previo.h + dy, 10, 300 - previo.y)),
          },
        });
      }
    };
    const soltar = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  };

  const elegirFondo = (mockup: MockupDef) => {
    type Marco = {
      open: () => void;
    };
    const wp = (window as unknown as {
      wp?: { media?: (opciones: Record<string, unknown>) => Marco };
    }).wp;
    if (!wp || typeof wp.media !== 'function') return;
    const selector = wp.media({
      title: 'Foto de escena',
      button: { text: 'Usar esta foto' },
      multiple: false,
      library: { type: 'image' },
      select: (medio: { url?: string }) => actualizar(mockup.id, { fondo: String(medio?.url ?? '') }),
    });
    selector.open();
  };
return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-800">Mockups del cotizador</h3>
          <p className="text-xs text-slate-500">
            Foto de escena y hueco donde va el arte, por categoria (override por tamano).
          </p>
        </div>
        <button type="button" className="cl-button-primary-small" onClick={agregar}>
          <Plus className="w-4 h-4" /> Agregar mockup
        </button>
      </div>

      {mockups.length === 0 && (
        <p className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl p-4">
          Todavia no hay mockups: sin uno, el paso de diseno del comprador se muestra vacio.
        </p>
      )}

      {mockups.map((mockup) => {
        const fuera = mockup.hueco.x + mockup.hueco.w > 300 || mockup.hueco.y + mockup.hueco.h > 300;
        const esAbierto = abierto === mockup.id;
        return (
          <div key={mockup.id} className="border border-slate-200 rounded-xl bg-white">
            <div className="flex items-center gap-3 p-3">
              <span className="text-sm font-semibold text-slate-700">
                {mockup.titulo?.trim() || mockup.id}
              </span>
              <span className="text-xs text-slate-500">
                {mockup.categoria}{mockup.size ? ` - ${mockup.size}` : ''}
              </span>
              {fuera && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  El hueco se sale del lienzo
                </span>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="cl-button-secondary-small"
                  onClick={() => setAbierto(esAbierto ? null : mockup.id)}
                >
                  {esAbierto ? 'Cerrar' : 'Editar'}
                </button>
                <button
                  type="button"
                  className="cl-button-secondary-small"
                  onClick={() => borrar(mockup.id)}
                  aria-label="Borrar mockup"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {esAbierto && (
              <div className="grid gap-4 p-3 pt-0 sm:grid-cols-[300px_1fr]">
                <div ref={lienzoRef} className="relative" style={{ width: 300, height: 300 }}>
                  <MockupPreview mockup={mockup} lado={300} />
                  <div
                    role="presentation"
                    onPointerDown={(e) => arrastrar(e, mockup, 'mover')}
                    className="absolute cursor-move border-2 border-emerald-500 bg-emerald-500/10"
                    style={{
                      left: `${(mockup.hueco.x / 300) * 100}%`,
                      top: `${(mockup.hueco.y / 300) * 100}%`,
                      width: `${(mockup.hueco.w / 300) * 100}%`,
                      height: `${(mockup.hueco.h / 300) * 100}%`,
                    }}
                  >
                    <span
                      role="presentation"
                      onPointerDown={(e) => arrastrar(e, mockup, 'redimensionar')}
                      className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-emerald-600 rounded-sm cursor-nwse-resize"
                    />
                  </div>
                </div>

                <div className="space-y-3">
<div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase">
                      Titulo
                      <input
                        className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1 text-sm font-normal text-slate-800"
                        value={mockup.titulo ?? ''}
                        onChange={(e) => actualizar(mockup.id, { titulo: e.target.value })}
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-500 uppercase">
                      Categoria
                      <select
                        className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1 text-sm font-normal text-slate-800"
                        value={mockup.categoria}
                        onChange={(e) => actualizar(mockup.id, { categoria: e.target.value })}
                      >
                        {categorias.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs font-bold text-slate-500 uppercase">
                      Tamano (opcional)
                      <input
                        className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1 text-sm font-normal text-slate-800"
                        placeholder="ej. 6,0 cm"
                        value={mockup.size ?? ''}
                        onChange={(e) => actualizar(mockup.id, { size: e.target.value })}
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-500 uppercase">
                      Forma del hueco
                      <select
                        className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1 text-sm font-normal text-slate-800"
                        value={mockup.forma}
                        onChange={(e) => actualizar(mockup.id, { forma: e.target.value as MockupForma })}
                      >
                        {FORMAS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex items-end gap-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase flex-1">
                      Foto de escena (URL)
                      <input
                        className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1 text-sm font-normal text-slate-800"
                        value={mockup.fondo}
                        onChange={(e) => actualizar(mockup.id, { fondo: e.target.value })}
                      />
                    </label>
                    <button type="button" className="cl-button-secondary-small" onClick={() => elegirFondo(mockup)}>
                      <ImageIcon className="w-4 h-4" /> Media
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {(['x', 'y', 'w', 'h'] as const).map((clave) => (
                      <label key={clave} className="block text-xs font-bold text-slate-500 uppercase">
                        {clave}
                        <input
                          type="number"
                          min={0}
                          max={300}
                          className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1 text-sm font-normal text-slate-800"
                          value={mockup.hueco[clave]}
                          onChange={(e) => actualizar(mockup.id, {
                            hueco: {
                              ...mockup.hueco,
                              [clave]: clamp(
                                Number(e.target.value) || 0,
                                clave === 'w' || clave === 'h' ? 1 : 0,
                                300,
                              ),
                            },
                          })}
                        />
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    El hueco vive en un lienzo de 300x300: arrastralo para moverlo y usa la esquina para el tamano.
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AdminMockupsPanel;