import React, { useEffect, useRef, useState } from 'react';

import type { MockupDef } from '../types';

/** Forma mínima del núcleo compartido del plugin (spec 011/037). */
interface MockupApi {
  LIENZO: number;
  componer: (
    ctx: CanvasRenderingContext2D,
    capas: Array<Record<string, unknown>>,
    opciones: Record<string, unknown>,
  ) => Promise<unknown>;
}

function apiMockup(): MockupApi | null {
  if (typeof window === 'undefined') return null;
  const api = (window as unknown as { PMUMockup?: MockupApi }).PMUMockup;
  return api && typeof api.componer === 'function' ? api : null;
}

interface MockupPreviewProps {
  /** Definición del mockup de la categoría/tamaño (null = sin hueco). */
  mockup: MockupDef | null;
  /** URL del arte del comprador (sin arte se pinta el estado vacío por CSS). */
  arteUrl?: string;
  /** URL del fondo cuando NO hay `mockup` (la foto del propio mockup). */
  lado?: number;
  onAmpliar?: () => void;
  className?: string;
}

/**
 * Mockup 300x300 del cotizador (spec 037, T019).
 *
 * Dos caminos, mismo resultado visual:
 *  - **sin arte**: estado vacío 100% CSS (foto de fondo + hueco punteado), sin JS:
 *    así el paso se ve completo antes de descargar ningún módulo (D10).
 *  - **con arte**: `PMUMockup.componer` sobre un canvas 300x300 con
 *    `huecosTransparentes: true` (nunca se le muestra al cliente la caja neutra
 *    del editor). Todo es local: 0 peticiones para componer.
 *
 * El arte NO viaja compuesto al servidor (constitution §III): esto es solo la
 * vista previa; el archivo que se imprime lo compone el plugin.
 */
export const MockupPreview: React.FC<MockupPreviewProps> = ({
  mockup,
  arteUrl,
  lado = 300,
  onAmpliar,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const api = apiMockup();
    const canvas = canvasRef.current;
    if (!api || !canvas || !mockup || !arteUrl) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('mockup:canvas');
      return;
    }
    const capas: Array<Record<string, unknown>> = [
      { tipo: 'img', ref: `fondo:${mockup.id}`, x: 0, y: 0, w: api.LIENZO, h: api.LIENZO },
      {
        tipo: 'img',
        ref: 'arte',
        x: mockup.hueco.x,
        y: mockup.hueco.y,
        w: mockup.hueco.w,
        h: mockup.hueco.h,
        rot: mockup.hueco.rot,
        forma: mockup.forma,
      },
    ];
    const resolver = (capa: Record<string, unknown>) => (
      capa.ref === 'arte'
        ? { url: arteUrl }
        : { url: mockup.fondo }
    );
    setError('');
    Promise.resolve(api.componer(ctx, capas, {
      resolver,
      huecosTransparentes: true,
      lienzo: api.LIENZO,
      limpiar: true,
    })).catch(() => setError('mockup:componer'));
  }, [mockup, arteUrl]);

  if (!mockup) {
    return (
      <div className={`flex items-center justify-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500 ${className}`}
        style={{ width: lado, height: lado }}>
        Sin mockup para esta forma y tamaño
      </div>
    );
  }

  const pct = (n: number) => `${(n / 300) * 100}%`;

  return (
    <div className={`relative bg-white rounded-xl overflow-hidden border border-slate-200 ${className}`}
      style={{ width: lado, height: lado }}>
      {arteUrl ? (
        <canvas
          ref={canvasRef}
          width={lado}
          height={lado}
          role="img"
          aria-label="Vista previa de tu diseño en el producto"
          className="w-full h-full"
        />
      ) : (
        <>
          <img
            src={mockup.fondo}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          <div
            className="absolute border-2 border-dashed border-white/80 bg-white/30"
            style={{
              left: pct(mockup.hueco.x),
              top: pct(mockup.hueco.y),
              width: pct(mockup.hueco.w),
              height: pct(mockup.hueco.h),
              transform: mockup.hueco.rot ? `rotate(${mockup.hueco.rot}deg)` : undefined,
            }}
          />
          <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-semibold text-white/90 drop-shadow">
            Tu diseño va acá
          </span>
        </>
      )}
      {onAmpliar && (
        <button
          type="button"
          onClick={onAmpliar}
          className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Ampliar la vista previa"
        />
      )}
      {error !== '' && (
        <span className="absolute bottom-1 right-1 text-[10px] text-amber-700 bg-amber-50 px-1 rounded">
          Vista previa no disponible
        </span>
      )}
    </div>
  );
};

export default MockupPreview;