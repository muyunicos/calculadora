import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, Plus, ArrowUp, ArrowDown, Copy, Eye, EyeOff } from 'lucide-react';

import type { PlantillaCotizador } from '../types';
import { duplicarPlantilla, moverPlantilla } from '../core/plantillas';
import { listarPdfs, type PdfPlantilla } from '../hooks/useCotizadorPdf';
import { PlantillaCard } from './PlantillaCard';

/**
 * Catalogo "Mockups del cotizador" (spec 037, Enmienda v2 / T043).
 *
 * NO es un editor de mockups: el mockup (capas, filtros, placeholders y
 * **envolturas automaticas**) se edita en el **Editor de mockups** del plugin,
 * sobre el PDF importado. Aca solo se administra el **catalogo**:
 * `titulo` (lo ve el cliente), `categoria`, `pdf` (plantilla importada), `rango`
 * min/max en X e Y (opcional), `visible`, **orden** y **duplicar**.
 */

interface AdminPlantillasPanelProps {
  plantillas: PlantillaCotizador[];
  categorias: string[];
  onChange: (plantillas: PlantillaCotizador[]) => void;
}

const nuevoId = (): string => `pl-${Math.floor(Math.random() * 1e6).toString(36)}`;

const num = (v: string, def = 0): number => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : def;
};

export const AdminPlantillasPanel: React.FC<AdminPlantillasPanelProps> = ({
  plantillas,
  categorias,
  onChange,
}) => {
  const [pdfs, setPdfs] = useState<PdfPlantilla[]>([]);
  const [errorPdfs, setErrorPdfs] = useState('');
  const [abierta, setAbierta] = useState<string | null>(null);

  // El select de plantilla se llena con los PDFs importados que TIENEN mockups.
  useEffect(() => {
    let vivo = true;
    listarPdfs()
      .then((lista) => { if (vivo) setPdfs(lista); })
      .catch((e) => { if (vivo) setErrorPdfs(e instanceof Error ? e.message : String(e)); });
    return () => { vivo = false; };
  }, []);

  const ordenadas = plantillas.slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  const actualizar = useCallback((id: string, cambios: Partial<PlantillaCotizador>) => {
    onChange(plantillas.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
  }, [plantillas, onChange]);

  const agregar = () => {
    const nueva: PlantillaCotizador = {
      id: nuevoId(),
      titulo: categorias[0] ?? 'Circulares',
      categoria: categorias[0] ?? 'Circulares',
      pdf: '',
      visible: true,
      orden: plantillas.length,
    };
    onChange([...plantillas, nueva]);
    setAbierta(nueva.id);
  };

  const borrar = (id: string) => {
    onChange(moverPlantilla(plantillas.filter((p) => p.id !== id), id, 0));
    if (abierta === id) setAbierta(null);
  };

  const duplicar = (id: string) => {
    const original = plantillas.find((p) => p.id === id);
    if (!original) return;
    const copia = duplicarPlantilla(original, nuevoId());
    onChange([...plantillas, { ...copia, orden: plantillas.length }]);
    setAbierta(copia.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-800">Mockups del cotizador</h3>
          <p className="text-xs text-slate-500">
            Cada opcion asocia una categoria y un rango de tamano a un PDF importado. Las capas,
            filtros y <strong>envolturas</strong> del mockup se editan en el editor del plugin.
          </p>
        </div>
        <button type="button" className="cl-button-primary-small" onClick={agregar}>
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {errorPdfs !== '' && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
          No se pudo leer la lista de PDFs ({errorPdfs}). Se puede escribir el slug a mano.
        </p>
      )}

      {ordenadas.length === 0 && (
        <p className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl p-4">
          Todavia no hay opciones: el paso de diseno funciona igual (el comprador sube su arte y se
          descarga la imagen procesada), pero no hay mockup ni PDF de produccion.
        </p>
      )}

      {ordenadas.map((plantilla, indice) => (
        <PlantillaCard
          key={plantilla.id}
          plantilla={plantilla}
          indice={indice}
          total={ordenadas.length}
          categorias={categorias}
          pdfs={pdfs}
          abierta={abierta === plantilla.id}
          onAbrir={() => setAbierta(abierta === plantilla.id ? null : plantilla.id)}
          onCambio={(cambios) => actualizar(plantilla.id, cambios)}
          onBorrar={() => borrar(plantilla.id)}
          onDuplicar={() => duplicar(plantilla.id)}
          onMover={(delta) => onChange(moverPlantilla(plantillas, plantilla.id, delta))}
        />
      ))}
    </div>
  );
};

export default AdminPlantillasPanel;