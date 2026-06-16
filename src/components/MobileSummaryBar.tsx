import React, { useEffect, useState, useRef } from 'react';
import { Package, ChevronUp, MessageCircle } from 'lucide-react';
import type { Order, PriceResult } from '../types';

interface MobileSummaryBarProps {
  order: Order;
  results: PriceResult | null;
  missing: string[];
  sizeText: string;
  materialName: string;
  formatoLabel: string;
  designLabel: string;
  orderCode?: string | null;
}

const money = (n?: number) => (n ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });
const perUnit = (n?: number) => (n ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });

// Función para hacer scroll al resumen del pedido
const scrollToSummary = () => {
  // Pequeño delay para asegurar que el DOM esté completamente renderizado
  setTimeout(() => {
    const summaryElement = document.getElementById('order-summary');
    if (summaryElement) {
      const offset = 80;
      const elementPosition = summaryElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, 100);
};

// Barra fija inferior para móvil: muestra el precio o progreso + CTA.
// Al tocar, hace scroll al resumen del pedido.
// Oculta en escritorio (lg:hidden), donde el ticket lateral ya cumple ese rol.
// También se oculta cuando el resumen del pedido es visible en la pantalla.
const MobileSummaryBar: React.FC<MobileSummaryBarProps> = ({
  order, results, missing,
  sizeText, materialName, formatoLabel, designLabel,
  orderCode = null,
}) => {
  const isComplete = !!results;
  const [isVisible, setIsVisible] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const summaryElement = document.getElementById('order-summary');
    if (!summaryElement) return;

    // Crear Intersection Observer para detectar cuando el resumen es visible
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // Ocultar la barra cuando el resumen es visible
        setIsVisible(!entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '-100px', // Margen negativo para ocultar la barra antes de que el resumen esté completamente visible
        threshold: 0.1
      }
    );

    observerRef.current.observe(summaryElement);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return (
    <>
      {/* Barra fija compacta - solo se muestra cuando el resumen no es visible */}
      {isVisible && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="px-4 py-3 flex items-center gap-3">
            <div onClick={scrollToSummary} className="flex-1 text-left min-w-0 cursor-pointer rounded-lg px-2 -mx-2">
              {isComplete ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-slate-900">${money(results?.finalPrice)}</span>
                    <span className="text-[11px] text-slate-500">${perUnit(results?.pricePerSticker)}/u</span>
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                    <ChevronUp className="w-3 h-3" /> Ver detalle y precio x cantidad
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-bold text-slate-800">Completá tu pedido</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {missing.length > 0 ? `Te falta: ${missing.join(' · ')}` : 'Tocá para ver el detalle'}
                  </div>
                </>
              )}
            </div>

            {isComplete ? (
              <button
                onClick={() => {
                  if (results?.finalPrice && typeof window !== 'undefined' && (window as any).addToCartFromCalculator) {
                    (window as any).addToCartFromCalculator({
                      price: results.finalPrice,
                      orderCode: orderCode,
                      material: materialName,
                      formato: formatoLabel,
                      medida: `${order.shapeType} ${sizeText}`,
                      quantity: results?.totalStickers,
                      sheets: order.sheetsQty
                    });
                  }
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" /> COMPRAR
              </button>
            ) : (
              <button onClick={scrollToSummary} className="cl-button-primary-large">
                <Package className="w-4 h-4" /> Detalle
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MobileSummaryBar;
