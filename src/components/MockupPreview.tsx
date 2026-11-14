import React, { useEffect, useRef, useState } from 'react';

import type { MockupCapaPdf, MockupsPdf } from '../types';

/** Forma mínima del núcleo compartido del plugin (spec 011/037). */
interface MockupApi {
  LIENZO: number;
  componer: (
    ctx: CanvasRenderingContext2D,
    capas: Array<Record<string, unknown>>,
    opciones: Record<string, unknown>,
  ) => Promise<{ invalidas?: unknown[] } | unknown>;
}

function apiMockup(): MockupApi | null {
  if (typeof window === 'undefined') return null;
  const api = (window as unknown as { PMUMockup?: MockupApi }).PMUMockup;
  return api && typeof api.componer === 'function' ? api : null;
}

interface MockupPreviewProps {
  /** Mockups del PDF (Editor de mockups): capas + envolturas. Null = sin mockup. */
  mockupsPdf: MockupsPdf | null;
  /** URL del arte del comprador (original). Sin arte se pinta el hueco. */
  arteUrl?: string;
  /** Spec 038 (D3): cual de los mockups del payload se dibuja (default 0). */
  indice?: number;
  lado?: number;
  className?: string;
}

/**
 * Mockup 300x300 del cotizador (Enmienda v2, FR-039).
 *
 * Dibuja **las capas del "Editor de mockups" del PDF** con `PMUMockup.componer`
 * (el mismo núcleo que la ficha), así que placeholders y **envolturas automáticas**
 * se respetan sin reimplementar nada acá. El arte del comprador reemplaza al
 * placeholder; si todavía no subió nada, se dibuja la escena + un marco punteado
 * y la subida sigue disponible (el mockup es accesorio, FR-036).
 */
export const MockupPreview: React.FC<MockupPreviewProps> = ({
  mockupsPdf,
  indice = 0,
  arteUrl,
  lado = 300,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState('');

  const capas: MockupCapaPdf[] = mockupsPdf?.mockups?.[indice ?? 0]?.capas ?? [];
  const imagenes = mockupsPdf?.imagenes ?? {};
  const primerHueco = capas.find((c) => c && c.tipo === 'placeholder');

  useEffect(() => {
    const api = apiMockup();
    const canvas = canvasRef.current;
    if (!api || !canvas || capas.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('mockup:canvas');
      return;
    }
    const resolver = (capa: Record<string, unknown>) => {
      if (capa.tipo === 'placeholder') {
        return arteUrl ? { url: arteUrl } : null;
      }
      const ref = String(capa.ref ?? '');
      const url = imagenes[ref];
      return url ? { url } : null;
    };
    setError('');
    Promise.resolve(api.componer(ctx, capas as unknown as Array<Record<string, unknown>>, {
      resolver,
      // Sin arte NO se dibuja la caja neutra con el ref: el hueco lo pinta la vista.
      huecosTransparentes: true,
      lienzo: api.LIENZO,
      limpiar: true,
      contexto: {
        grupos: mockupsPdf?.grupos ?? [],
        imagenes,
        envolturas: mockupsPdf?.envolturas ?? null,
      },
    })).catch(() => setError('mockup:componer'));
  }, [capas, imagenes, arteUrl, mockupsPdf]);

  if (!mockupsPdf || capas.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500 ${className}`}
        style={{ width: lado, height: lado }}
      >
        Sin mockup para esta forma y tamaño
      </div>
    );
  }

  const pct = (n: number) => `${((Number(n) || 0) / 300) * 100}%`;

  return (
    <div
      className={`relative bg-white rounded-xl overflow-hidden border border-slate-200 ${className}`}
      style={{ width: lado, height: lado }}
    >
      <canvas
        ref={canvasRef}
        width={lado}
        height={lado}
        role="img"
        aria-label="Vista previa de tu diseno en el producto"
        className="w-full h-full"
      />
      {!arteUrl && primerHueco && (
        <div
          className="absolute border-2 border-dashed border-emerald-600/70 bg-emerald-600/10 pointer-events-none"
          style={{
            left: pct(primerHueco.x ?? 0),
            top: pct(primerHueco.y ?? 0),
            width: pct(primerHueco.w ?? 0),
            height: pct(primerHueco.h ?? 0),
          }}
        >
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-emerald-800 text-center px-1">
            Tu diseno va aca
          </span>
        </div>
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