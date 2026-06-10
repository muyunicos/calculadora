import React, { useEffect, useState } from 'react';
import { Images, X, ChevronLeft, ChevronRight, Wand2 } from 'lucide-react';
import type { GalleryItem } from '../types';

interface MiniGalleryProps {
  items: GalleryItem[];
  // Resuelve la imagen (permite rutas relativas a la carpeta de assets del tema).
  resolveImage: (src: string) => string;
  // Carga el pedido asociado a la foto en la calculadora.
  onUse: (orderCode: string) => void;
}

// Mini-galería de ejemplos: una fila de miniaturas con scroll horizontal. Al tocar
// una foto se abre un lightbox para verla en grande, con un botón para cargar ese
// pedido en la calculadora. Pensada para el cliente que no sabe qué elegir.
const MiniGallery: React.FC<MiniGalleryProps> = ({ items, resolveImage, onUse }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const isOpen = openIndex !== null;
  const current = isOpen ? items[openIndex] : null;

  const close = () => setOpenIndex(null);
  const prev = () => setOpenIndex((i) => (i === null ? i : (i - 1 + items.length) % items.length));
  const next = () => setOpenIndex((i) => (i === null ? i : (i + 1) % items.length));

  // Navegación por teclado y bloqueo del scroll de fondo cuando el lightbox está abierto.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, items.length]);

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Images className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-slate-800">¿No sabés qué elegir? Inspirate</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {items.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => setOpenIndex(idx)}
            className="group relative flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 hover:border-blue-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            title={item.caption || 'Ver ejemplo'}
          >
            <img
              src={resolveImage(item.image)}
              alt={item.caption || 'Ejemplo de sticker'}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            {item.caption && (
              <span className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[10px] leading-tight px-1.5 py-1 text-left line-clamp-2">
                {item.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox / vista expandida */}
      {isOpen && current && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative bg-white rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              className="absolute top-3 right-3 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative bg-slate-900 flex items-center justify-center">
              <img
                src={resolveImage(current.image)}
                alt={current.caption || 'Ejemplo de sticker'}
                className="max-h-[60vh] w-auto object-contain"
              />
              {items.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
                    aria-label="Anterior"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
                    aria-label="Siguiente"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 border-t border-slate-100">
              <p className="flex-1 text-sm text-slate-600">{current.caption || 'Ejemplo de pedido.'}</p>
              <button
                onClick={() => {
                  onUse(current.order);
                  close();
                }}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-md shadow-blue-600/20 flex-shrink-0"
              >
                <Wand2 className="w-4 h-4" /> Usar este diseño
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniGallery;
