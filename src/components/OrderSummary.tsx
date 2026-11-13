import React from 'react';
import { Calculator, Printer, Clock, Package, TrendingUp, ChevronUp, ChevronDown } from 'lucide-react';
import type { Order, Config, Material, ShapesCatalog, PriceResult, DeliveryOption, DesignOption, Diseno } from '../types';
import PriceTable from './PriceTable';
import { useToast } from './ToastProvider';
import { calcularPrecio } from '../core/priceEngine';

// Escalones del incentivo "comprando más planchas" (economía de escala).
const INCENTIVE_STEPS = [1, 2, 3, 5, 10, 25, 50, 100];

// Formatea cm con 1 decimal y coma (5,25 -> "5,3"; 5 -> "5").
const fmtCm = (v?: number): string => (v == null ? '' : String(Number(v.toFixed(1))).replace('.', ','));
// Precio sin decimales, formato es-AR ($3.945).
const money0 = (n?: number): string => (n ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });

interface OrderSummaryProps {
  order: Order;
  config: Config;
  materials: Material[];
  shapesCatalog: ShapesCatalog;
  results: PriceResult | null;
  isAdmin: boolean;
  showMathDetail: boolean;
  setShowMathDetail: (show: boolean) => void;
  missing: string[];
  sizeText: string;
  formatoLabel: string;
  orderCode: string | null;
  consultLink: string;
  // URL pública del pedido (misma que se comparte por WhatsApp). Se manda al
  // carrito para que "Editar" vuelva a esta cotización, sin hardcodear dominio.
  shareUrl?: string;
  setOrder: (order: Order | ((prev: Order) => Order)) => void;
  deliveryOptions?: DeliveryOption[];
  designOptions?: DesignOption[];
  /** Diseno del cotizador cargado (spec 037): viaja con la linea del pedido. */
  diseno?: Diseno | null;
  /** Subida del arte en curso: COMPRAR espera (FR-014). */
  subiendo?: boolean;
  /** Tamaño ajustado (cm) para el detalle de rectangulares en económico. */
  adjustedW?: number;
  adjustedH?: number;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  order,
  config,
  materials,
  shapesCatalog,
  results,
  isAdmin,
  showMathDetail,
  setShowMathDetail,
  missing,
  sizeText,
  formatoLabel,
  orderCode,
  consultLink,
  shareUrl = '',
  setOrder,
  deliveryOptions = [],
  designOptions = [],
  diseno = null,
  subiendo = false,
  adjustedW,
  adjustedH,
}) => {
  const { showToast } = useToast();

  // Incentivo de economía de escala: precio por plancha del siguiente escalón.
  const offer = React.useMemo(() => {
    if (!results) return null;
    const next = INCENTIVE_STEPS.find((n) => n > (order.sheetsQty || 0));
    if (!next) return null;
    const r = calcularPrecio(
      { ...order, sheetsQty: next },
      config,
      materials,
      shapesCatalog,
      deliveryOptions,
      designOptions,
    );
    if (!r || !(r.pricePerSheet < results.pricePerSheet - 0.01)) return null;
    return { sheets: next, pricePerSheet: r.pricePerSheet };
  }, [results, order, config, materials, shapesCatalog, deliveryOptions, designOptions]);

  return (
    <div id="order-summary" className="lg:col-span-5 relative">
      <div className="sticky top-6 space-y-6">

        {/* Tarjeta Cliente Resumen (Hero Card) */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white cl-p-xl cl-rounded-xl cl-shadow-lg cl-border-sm border-slate-700 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
          <div className="absolute left-10 -bottom-10 w-32 h-32 bg-blue-400/10 rounded-full blur-xl"></div>

          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest cl-mb-lg flex items-center cl-gap-md relative z-10">
            <Calculator className="w-4 h-4" /> Resumen de tu pedido
          </h3>

          {!results ? (
            <div className="relative z-10 text-center py-6">
              <div className="w-14 h-14 mx-auto cl-mb-md rounded-full bg-slate-800 cl-border-sm border-slate-700 cl-flex-center">
                <Calculator className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-slate-100 font-semibold cl-mb-sm">Completá los pasos para ver el precio</p>
              {missing.length > 0 && (
                <p className="text-slate-400 text-sm">Te falta elegir: {missing.join(' · ')}.</p>
              )}
            </div>
          ) : (
          <>
          <div className="space-y-4 cl-mb-lg relative z-10">
            <div className="cl-flex-between pb-3">
              <span className="text-slate-300 font-medium">Material:</span>
              <span className="text-white text-sm font-semibold text-right max-w-[60%]">{results?.activeMaterial?.name}</span>
            </div>
            <div className="cl-flex-between  pb-3">
              <span className="text-slate-300 font-medium">Formato:</span>
              <span className="text-white text-sm font-semibold">{formatoLabel || 'A definir'}</span>
            </div>
            <div className="cl-flex-col  pb-3">
              <div className="cl-flex-between">
                <span className="text-slate-300 font-medium">Total Stickers:</span>
                <span className="text-xl font-bold text-white bg-slate-800 cl-p-sm cl-rounded-md cl-border-sm border-slate-600">{results?.totalStickers ?? 0} u.</span>
              </div>
              {(results?.totalStickers ?? 0) > 0 && (
                <div className="text-xs text-slate-400 mt-1.5 text-right font-medium">
                  ({order.sheetsQty} plancha{order.sheetsQty === 1 ? '' : 's'} de {results?.totalStickers} stickers {order.shapeType === 'Rectangulares' ? 'rectangulares' : String(order.shapeType).toLowerCase()} de {order.shapeType === 'Rectangulares' ? `${fmtCm(adjustedW)}x${fmtCm(adjustedH)}cm` : sizeText} c/u)
                </div>
              )}
            </div>
            {(results?.totalStickers ?? 0) > 0 && (
              <div className="cl-flex-between pb-2">
                <span className="text-slate-300 font-medium">Precio por plancha:</span>
                <span className="font-medium text-slate-300">${money0(results?.pricePerSheet)}</span>
              </div>
            )}
          </div>

          <div className="relative z-10 bg-slate-800/50 cl-p-sm cl-rounded-xl cl-border-sm border-slate-700 backdrop-blur-sm">
            <span className="text-slate-400 text-sm font-medium block cl-mb-sm">Total Estimado</span>
            <div className="text-5xl md:text-6xl font-black text-emerald-400 tracking-tight drop-shadow-md">
              ${results?.finalPrice?.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </div>
          </div>

          {offer && results && (
            <div className="relative z-10 mt-2 text-center">
              <button
                type="button"
                onClick={() => setOrder({ ...order, sheetsQty: offer.sheets })}
                className="text-[11px] text-slate-400 hover:text-white transition-colors"
              >
                Comprando {offer.sheets} planchas:{' '}
                <s className="text-slate-500">${money0(results.pricePerSheet)}</s>{' '}
                <span className="text-emerald-300 font-bold">${money0(offer.pricePerSheet)}</span>
              </button>
            </div>
          )}

          {diseno && (
            <div className="relative z-10 flex items-center gap-2 mt-4 text-xs text-slate-300">
              {diseno.url && (
                <img
                  src={diseno.url}
                  alt="Tu diseno"
                  className="w-10 h-10 rounded object-cover border border-white/20"
                />
              )}
              <span>
                <strong className="text-emerald-300">Diseno cargado</strong>
                {' · '}{diseno.w}x{diseno.h} px
              </span>
            </div>
          )}

          <div className="relative z-10 flex cl-gap-md mt-6">
            <button
              disabled={subiendo}
              onClick={() => {
                if (subiendo) return; // FR-014: no se compra con el arte subiendo
                const addToCart = typeof window !== 'undefined' ? (window as any).addToCartFromCalculator : null;
                if (typeof addToCart !== 'function') {
                  showToast('error', 'El carrito no está disponible en esta página. Probá desde el producto Cotizador.');
                  return;
                }
                if (!orderCode) {
                  showToast('error', 'Falta el código del pedido. Revisá que el material y el tamaño tengan código asignado.');
                  return;
                }
                if (!results?.finalPrice) return;
                addToCart({
                  price: results.finalPrice,
                  orderCode,
                  cotizadorUrl: shareUrl,
                  material: results.activeMaterial?.name,
                  formato: formatoLabel,
                  medida: `${order.shapeType} ${sizeText}`,
                  quantity: results.totalStickers,
                  sheets: order.sheetsQty,
                  // Spec 037: el diseno (original + receta) viaja con la linea; el
                  // carrito guarda _mu_origen/_mu_diseno_id/_pmu_sid/_pmu_item_key.
                  diseno: diseno ?? undefined,
                });
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 px-6 cl-rounded-md cl-transition-colors text-lg cl-shadow-lg shadow-emerald-900/50 cl-flex-center cl-gap-md"
            >
              <Package className="w-5 h-5" />
              {subiendo ? 'SUBIENDO TU DISEÑO…' : 'COMPRAR'}
            </button>
            <a href={consultLink} target="_blank" rel="noopener noreferrer" className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-4 cl-rounded-md cl-transition-colors cl-shadow-lg shadow-green-900/50 cl-flex-center cl-gap-md">
              <img src="https://muyunicos.com/wp-content/uploads/2025/10/whatsapp.webp" alt="Contacto por WhatsApp" className="w-5 h-5" />
              <span className="text-sm">CONSULTAR</span>
            </a>
          </div>
          </>
          )}
        </div>

        {/* Tabla de precio por cantidad (economía de escala) */}
        <PriceTable
          order={order}
          config={config}
          materials={materials}
          shapesCatalog={shapesCatalog}
          deliveryOptions={deliveryOptions}
          designOptions={designOptions}
          onChangeQuantity={(qty) => setOrder({ ...order, sheetsQty: qty })}
        />

        {/* Resumen Interno Admin */}
        {isAdmin && (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
            <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex justify-between items-center">
              <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Rentabilidad (Interno)
              </h4>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1.5"><Printer className="w-4 h-4" /> Costo Materiales:</span>
                <span className="font-bold text-slate-800">${results?.costWithWaste?.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Costo Tiempo ({results?.totalTimeMins?.toFixed(0)}m):</span>
                <span className="font-bold text-slate-800">${results?.laborCost?.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1.5"><Package className="w-4 h-4" /> Packaging Fijo:</span>
                <span className="font-bold text-slate-800">${config.packagingCost?.toFixed(0)}</span>
              </div>
              <div className="flex justify-between font-black mt-3 pt-3 border-t-2 border-dashed border-emerald-100 text-emerald-600 text-base">
                <span>Ganancia Neta ({config.profitMargin}%):</span>
                <span>${results?.profitAmount?.toFixed(0)}</span>
              </div>
            </div>

            <div className="border-t border-slate-100">
              <button
                onClick={() => setShowMathDetail(!showMathDetail)}
                className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600 font-semibold text-xs uppercase tracking-wider"
              >
                <span className="flex items-center gap-2"><Calculator className="w-4 h-4" /> Ver fórmulas exactas</span>
                {showMathDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showMathDetail && results && (
                <div className="p-5 bg-slate-900 space-y-4 text-xs font-mono text-slate-300">
                  <div>
                    <h4 className="font-bold text-emerald-400 mb-1 border-b border-slate-700 pb-1">1. Costos de Material</h4>
                    <p>Impr. x Plancha: ${results.activeMaterial?.sheetCost} (H) + ${results.activeMaterial?.inkCost} (T) + ${results.activeMaterial?.printWear} (D) = ${results.printCostPerSheet}</p>
                    <p>Corte x Plancha: ${results.cutWearCostPerSheet?.toFixed(2)}</p>
                    <p>Total {order.sheetsQty} planchas = ${(results.printCostPerSheet + results.cutWearCostPerSheet) * order.sheetsQty}</p>
                    <p className="text-rose-400">+ Merma ({config.wasteMargin}%): ${results.wasteAmount?.toFixed(2)}</p>
                    <p className="text-white mt-1">= Total Materiales: ${results.costWithWaste?.toFixed(2)}</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-blue-400 mb-1 border-b border-slate-700 pb-1 mt-3">2. Costos de Tiempo</h4>
                    <p>Valor Hora Base: ${config.hourlyRate}</p>
                    <p>Atención + Diseño: {config.timeCustomerService} + {results.designTime} min.</p>
                    <p>Impresión: {results.activeMaterial?.printTime * order.sheetsQty} min.</p>
                    <p>Corte: {(results.baseCutTime * order.sheetsQty).toFixed(1)} min.</p>
                    <p>Logística: {results.totalLogisticsTime} min.</p>
                    <p>Total Mins: {results.totalTimeMins?.toFixed(1)} min.</p>
                    <p className="text-white mt-1">= Costo (Mins/60 * ValorHora): ${results.laborCost?.toFixed(2)}</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-purple-400 mb-1 border-b border-slate-700 pb-1 mt-3">3. Suma Final</h4>
                    <p>Subtotal (Mat + Tiem + Pack): ${results.totalCost?.toFixed(2)}</p>
                    <p>Ganancia ({config.profitMargin}%): ${results.profitAmount?.toFixed(2)}</p>
                    <p className="font-bold text-white mt-1 text-sm">= PRECIO FINAL: ${results.finalPrice?.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
