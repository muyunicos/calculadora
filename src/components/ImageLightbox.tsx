import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  title?: string;
  caption?: string;
  onClose: () => void;
}

// Visor de una sola imagen en grande (modal). Reutilizable por cualquier parte de
// la app que quiera "ampliar al tocar" (motor de info, materiales, tamaños, etc.).
// Bloquea el scroll de fondo y cierra con Escape o tocando fuera.
const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, alt, title, caption, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-white rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white cl-button-icon"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {title && (
          <div className="px-5 py-3 border-b border-slate-100 pr-14">
            <h4 className="font-bold text-slate-800 leading-tight">{title}</h4>
          </div>
        )}

        <div className="relative bg-slate-900 flex items-center justify-center">
          <img src={src} alt={alt || title || 'Imagen'} className="max-h-[60vh] w-auto object-contain" />
        </div>

        {caption && (
          <div className="p-5 border-t border-slate-100 overflow-y-auto">
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{caption}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageLightbox;
