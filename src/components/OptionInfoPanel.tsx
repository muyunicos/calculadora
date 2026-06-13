import React, { useState } from 'react';
import { Plus, X, ZoomIn } from 'lucide-react';
import type { OptionInfo } from '../types';
import ImageLightbox from './ImageLightbox';

interface OptionInfoPanelProps {
  // Opción cuya info se muestra. null o sin contenido => no renderiza nada.
  option: OptionInfo | null;
  // Panel desplegado (true) o colapsado mostrando "tocá para más info +" (false).
  isOpen: boolean;
  onToggle: () => void;
  // Resuelve rutas de imagen relativas a la carpeta de assets del tema.
  resolveImage: (src: string) => string;
}

// Motor de info reutilizable: el bloque que va DEBAJO de la lista de opciones de
// cada paso (Material, Forma/Tamaño, Diseño, Entrega). Colapsado muestra un hint
// amarillo "tocá para más info +"; desplegado muestra el panel con título
// "MÁS INFO: <opción>", la descripción y la foto (ampliable al tocarla).
const OptionInfoPanel: React.FC<OptionInfoPanelProps> = ({ option, isOpen, onToggle, resolveImage }) => {
  const [lightbox, setLightbox] = useState(false);

  const hasInfo = !!option && (!!option.description || !!option.image);
  if (!hasInfo || !option) return null;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-full px-3 py-1.5 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> tocá para más info
      </button>
    );
  }

  const imgSrc = option.image ? resolveImage(option.image) : '';

  return (
    <div className="mt-4 rounded-2xl bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-xs font-black uppercase tracking-wide text-amber-800">
          Más info: <span className="text-amber-900">{option.name}</span>
        </h4>
        <button
          type="button"
          onClick={onToggle}
          className="flex-shrink-0 p-1 rounded-full text-amber-700 hover:bg-amber-200 transition-colors"
          aria-label="Cerrar info"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {imgSrc && (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="group relative flex-shrink-0 w-full sm:w-32 h-32 rounded-xl overflow-hidden bg-white/60 focus:outline-none focus:ring-2 focus:ring-amber-400"
            title="Tocá para ampliar"
          >
            <img
              src={imgSrc}
              alt={option.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              onError={(e) => { (e.currentTarget.style.display = 'none'); }}
            />
            <span className="absolute bottom-1.5 right-1.5 p-1 rounded-full bg-black/45 text-white">
              <ZoomIn className="w-3.5 h-3.5" />
            </span>
          </button>
        )}
        {option.description && (
          <p className="flex-1 text-sm text-amber-900/90 leading-relaxed whitespace-pre-line">
            {option.description}
          </p>
        )}
      </div>

      {lightbox && imgSrc && (
        <ImageLightbox
          src={imgSrc}
          alt={option.name}
          title={option.name}
          caption={option.description}
          onClose={() => setLightbox(false)}
        />
      )}
    </div>
  );
};

export default OptionInfoPanel;
