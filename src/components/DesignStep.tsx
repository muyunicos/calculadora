import React, { useEffect, useState } from 'react';

import { sizeToPx } from '../core/mockups';
import type { Diseno, MockupsPdf } from '../types';
import type { PmuAssetsApi } from '../hooks/usePmuAssets';
import { DesignFields } from './DesignFields';
import { MockupPreview } from './MockupPreview';

/**
 * Paso "Tu diseno" del cotizador (spec 037, T018/T019).
 *
 * Compone el mockup 300x300 con el arte del comprador y delega la subida en
 * `DesignFields` (que envuelve el `CargadorPMU` del plugin, T017). Reglas:
 *  - el arte es OPCIONAL (constitution §I, Enmienda 4.1.0): sin arte se cotiza y
 *    se compra igual; el mockup solo informa;
 *  - NO hay aviso de resolucion (D8) ni de DPI;
 *  - el bitmap compuesto NUNCA se sube (§III): viaja el original + la receta;
 *  - si el puente no esta disponible, el paso se degrada (D9).
 */

export interface DesignStepProps {
  categoria: string;
  size: string;
  forma?: string;
  mockupsPdf: MockupsPdf | null;
  /** Plantilla importada para esta categoria+tamano ('' = sin PDF). */
  pdf: string;
  diseno: Diseno | null;
  onDiseno: (diseno: Diseno | null) => void;
  /** El puente del plugin esta configurado (si no, el paso se oculta). */
  disponible: boolean;
  /** Modulos del paso (carga diferida). */
  assets: PmuAssetsApi;
  /** Pide los modulos al abrir el paso. */
  onAbrir?: () => void;
  /** Subida en curso (gobierna el boton COMPRAR, FR-014). */
  onSubiendo?: (subiendo: boolean) => void;
}

export const DesignStep: React.FC<DesignStepProps> = ({
  categoria,
  size,
  forma,
  mockupsPdf,
  pdf,
  diseno,
  onDiseno,
  disponible,
  assets,
  onAbrir,
  onSubiendo,
}) => {
  const [itemKey, setItemKey] = useState(diseno?.itemKey ?? '');

  useEffect(() => {
    onAbrir?.();
  }, [onAbrir]);

  // Cambiar forma/tamano recalcula el lienzo sin volver a subir (FR-005/FR-007).
  useEffect(() => {
    if (!diseno) return;
    const px = sizeToPx(size);
    if (px.w < 1 || px.h < 1 || (px.w === diseno.w && px.h === diseno.h)) return;
    onDiseno({ ...diseno, w: px.w, h: px.h });
  }, [size, diseno, onDiseno]);

  if (!disponible) {
    // Degradacion (D9): el cotizador sigue funcionando con el canal alternativo.
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">El disenador no esta disponible ahora.</p>
        <p className="mt-1 text-xs">
          Podes cotizar y comprar igual: nos envias tu arte por WhatsApp despues de la compra.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start">
      <MockupPreview mockupsPdf={mockupsPdf} arteUrl={diseno?.url} />
      <DesignFields
        categoria={categoria}
        size={size}
        forma={forma || ''}
        pdf={pdf}
        itemKey={itemKey}
        onItemKey={setItemKey}
        onDiseno={onDiseno}
        onSubiendo={(v) => onSubiendo?.(v)}
        assets={assets}
        hayDiseno={!!diseno}
        onQuitar={() => {
          onDiseno(null);
          setItemKey('');
        }}
      />
    </div>
  );
};

export default DesignStep;