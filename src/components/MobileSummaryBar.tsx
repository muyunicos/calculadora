import React, { useState } from 'react';
import { Package, ChevronUp, X, Lightbulb } from 'lucide-react';
import type { Config, Material, Order, PriceResult, ShapesCatalog, DeliveryOption, DesignOption } from '../types';
import PriceTable from './PriceTable';

interface MobileSummaryBarProps {
  order: Order;
  results: PriceResult | null;
  missing: string[];
  whatsappLink: string;
  config: Config;
  materials: Material[];
  shapesCatalog: ShapesCatalog;
  sizeText: string;
  materialName: string;
  formatoLabel: string;
  designLabel: string;
  deliveryOptions?: DeliveryOption[];
  designOptions?: DesignOption[];
}

const money = (n?: number) => (n ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });
const perUnit = (n?: number) => (n ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between gap-3 border-b border-slate-50 pb-2">
    <span className="text-slate-500">{label}</span>
    <span className="font-semibold text-slate-800 text-right">{value}</span>
  </div>
);

// Barra fija inferior para móvil: ocupa poco (precio o progreso + CTA) y, al
// tocarla, abre un panel deslizante con el detalle, la tabla precio/cantidad y tips.
// Oculta en escritorio (lg:hidden), donde el ticket lateral ya cumple ese rol.
const MobileSummaryBar: React.FC<MobileSummaryBarProps> = ({
  order, results, missing, whatsappLink, config, materials, shapesCatalog,
  sizeText, materialName, formatoLabel, designLabel,
  deliveryOptions = [],
  designOptions = [],
}) => {
  const [open, setOpen] = useState(false);
  const isComplete = !!results;

  const tips: string[] = [];
  if (isComplete) {
    if (order.deliveryFormat !== 'sincorte') tips.push('Elegí “Sin cortar” y el costo baja (lo cortás vos).');
    if (order.sheetsQty < 10) tips.push('Pedí 10+ planchas: el precio por unidad baja muchísimo.');
    tips.push('Cuanto más pedís, más barato sale cada unidad (mirá la tabla).');
  }

  return (
    <>
      {/* Panel deslizante (bottom sheet) */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Detalle de tu pedido</h3>
              <button onClick={() => setOpen(false)} className="cl-button-icon" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {isComplete ? (
                <>
                  <div className="space-y-2 text-sm">
                    <Row label="Material" value={materialName} />
                    <Row label="Forma y tamaño" value={`${order.shapeType} ${sizeText}`} />
                    <Row label="Formato" value={formatoLabel} />
                    <Row label="Diseño" value={designLabel} />
                    <Row label="Planchas" value={`${order.sheetsQty}`} />
                    <Row label="Total stickers" value={`~${results?.totalStickers ?? 0} u.`} />
                  </div>

                  <PriceTable order={order} config={config} materials={materials} shapesCatalog={shapesCatalog} deliveryOptions={deliveryOptions} designOptions={designOptions} />

                  {tips.length > 0 && (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-2">
                        <Lightbulb className="w-4 h-4" /> Tips
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-xs text-amber-900/80">
                        {tips.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  Completá los pasos para ver el detalle.
                  {missing.length > 0 && <> Te falta: <span className="font-semibold text-slate-700">{missing.join(' · ')}</span>.</>}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barra fija compacta */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => setOpen(true)} className="flex-1 text-left min-w-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-2 -mx-2">
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
          </button>

          {isComplete ? (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="cl-button-primary-large">
              <Package className="w-4 h-4" /> Pedir
            </a>
          ) : (
            <span className="cl-button-disabled">
              <Package className="w-4 h-4" /> Pedir
            </span>
          )}
        </div>
      </div>
    </>
  );
};

export default MobileSummaryBar;
