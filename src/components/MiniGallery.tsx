import React, { useEffect, useState } from 'react';
import { Images, X, ChevronLeft, ChevronRight, Wand2 } from 'lucide-react';
import type { GalleryItem, GalleryPricing } from '../types';

interface MiniGalleryProps {
  items: GalleryItem[];
  // Resuelve la imagen (permite rutas relativas a la carpeta de assets del tema).
  resolveImage: (src: string) => string;
  // Carga el pedido asociado a la foto en la calculadora.
  onUse: (orderCode: string) => void;
  // Precio marketinero (1 plancha vs. máximo) para la foto; null si no se puede calcular.
  // Puede recibir un segundo parámetro con la cantidad de planchas a mostrar.
  getPricing: (orderCode: string, displaySheets?: number) => GalleryPricing | null;
}

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
const fmt0 = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 });

// Extrae la cantidad de planchas del código v1 (ej: "v1.m11.s201.q25.f2.d0" -> 25)
const extractSheetsFromCode = (code: string): number => {
  const match = code.match(/\.q(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
};

// Bloque de precio "marketinero": precio unitario regular vs. precio de mayorista
const PriceTag: React.FC<{ pricing: GalleryPricing; compact?: boolean }> = ({ pricing, compact }) => {
  const hasDeal = pricing.savingsPct > 0.5;
  if (compact) {
    return (
      <span className="flex items-baseline gap-1 flex-wrap text-[11px]">
        <span className="text-slate-600 font-extrabold">${fmt0(pricing.perUnitBase)}</span>
        <span className="text-slate-500">~</span>
        <span className="text-emerald-600 font-extrabold">${fmt0(pricing.perUnit)}</span>
        <span className="text-slate-500">c/u</span>
      </span>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end gap-6">
        <div>
          <div className="text-xs font-bold text-slate-500 mb-2 uppercase">Precio Regular</div>
          <div className="text-lg font-extrabold text-gray-600">${fmt0(pricing.perUnitBase)} c/u</div>
        </div>
        <div className="flex items-end gap-1">
          <div>
            <div className="text-xs font-bold text-slate-500 mb-2 uppercase">Por Mayor*</div>
            <div className="text-lg font-extrabold text-emerald-600">${fmt0(pricing.perUnit)} c/u</div>
          </div>
          {hasDeal && (
            <span className="text-xs font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full h-fit">
              {pricing.savingsPct.toFixed(0)}% OFF
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        * Comprando {pricing.sheets} planchas (~{fmt0(pricing.totalStickers)} u): <strong className="text-slate-700">${fmt0(pricing.total)}</strong>
      </p>
    </div>
  );
};

// Mini-galería de ejemplos: una fila de miniaturas con scroll horizontal. Al tocar
// una foto se abre un lightbox para verla en grande, con el precio destacado y un
// botón para personalizar (cargar ese pedido como base). Pensada para el cliente
// que no sabe qué elegir.
const MiniGallery: React.FC<MiniGalleryProps> = ({ items, resolveImage, onUse, getPricing }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const isOpen = openIndex !== null;
  const visibleItems = items.filter((item) => item.visible !== false);
  const current = isOpen ? visibleItems[openIndex] : null;
  const currentPricing = current ? getPricing(current.order, extractSheetsFromCode(current.order)) : null;

  const close = () => setOpenIndex(null);
  const prev = () => setOpenIndex((i) => (i === null ? i : (i - 1 + visibleItems.length) % visibleItems.length));
  const next = () => setOpenIndex((i) => (i === null ? i : (i + 1) % visibleItems.length));

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
    <div className="cl-card p-4">
      <div className="flex items-center gap-2">
        <Images className="w-5 h-5 text-blue-600" />
        <h4 className="font-bold text-slate-800 m-0">Ideas (opcional)</h4>
      </div>
      <p className="text-sm text-slate-500 mb-4">Podés elegir una base para personalizar a tu gusto.</p>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {visibleItems.map((item, idx) => {
          const label = item.title || item.caption;
          const displaySheets = extractSheetsFromCode(item.order);
          const pricing = getPricing(item.order, displaySheets);
          return (
            <button
              key={item.id}
              onClick={() => setOpenIndex(idx)}
              className="group relative flex-shrink-0 w-32 sm:w-36 rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 text-left p-0"
              title={label || 'Ver ejemplo'}
            >
              <div className="relative w-full h-28 sm:h-32 bg-slate-100 overflow-hidden">
                <img
                  src={resolveImage(item.image)}
                  alt={label || 'Ejemplo de sticker'}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform opacity-0"
                  onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
                  style={{ transition: 'opacity 0.3s ease-in-out' }}
                />
                {label && (
                  <span className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[11px] font-semibold leading-tight px-1.5 py-1 line-clamp-2">
                    {label}
                  </span>
                )}
              </div>
              {pricing && (
                <div className="px-2 py-1.5 border-t border-slate-100">
                  <PriceTag pricing={pricing} compact />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Lightbox / vista expandida */}
      {isOpen && current && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{ zIndex: 2000 }}
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
              className="absolute top-3 right-3 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white cl-button-icon"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            {current.title && (
              <div className="px-5 py-3 border-b border-slate-100 pr-14">
                <h4 className="font-bold text-slate-800 leading-tight">{current.title}</h4>
              </div>
            )}

            <div className="relative bg-slate-900 flex items-center justify-center min-h-[300px]">
              <img
                src={resolveImage(current.image)}
                alt={current.title || current.caption || 'Ejemplo de sticker'}
                loading="lazy"
                className="max-h-[55vh] w-auto object-contain opacity-0"
                onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
                style={{ transition: 'opacity 0.3s ease-in-out' }}
              />
              {visibleItems.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white cl-button-icon"
                    aria-label="Anterior"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white cl-button-icon"
                    aria-label="Siguiente"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            <div className="p-5 flex flex-col gap-4 border-t border-slate-100 overflow-y-auto">
              {current.caption && <p className="text-sm text-slate-600">{current.caption}</p>}
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="flex-1">
                  {(() => {
                    const displaySheets = extractSheetsFromCode(current.order);
                    const pricing = currentPricing || getPricing(current.order, displaySheets);
                    return pricing && <PriceTag pricing={pricing} />;
                  })()}
                </div>
                <button
                  onClick={() => {
                    onUse(current.order);
                    close();
                  }}
                  className="cl-button-primary-small"
                >
                  <Wand2 className="w-4 h-4" /> Personalizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniGallery;
