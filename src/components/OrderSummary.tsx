import React from 'react';
import { Calculator, Printer, Clock, Package, TrendingUp, ChevronUp, ChevronDown, MessageCircle } from 'lucide-react';
import type { Order, Config, Material, ShapesCatalog, PriceResult, DeliveryOption, DesignOption } from '../types';
import PriceTable from './PriceTable';

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
  orderCode: string | null;
  consultLink: string;
  setOrder: (order: Order | ((prev: Order) => Order)) => void;
  deliveryOptions?: DeliveryOption[];
  designOptions?: DesignOption[];
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
  orderCode,
  consultLink,
  setOrder,
  deliveryOptions = [],
  designOptions = [],
}) => {
  return (
    <div id="order-summary" className="lg:col-span-5 relative">
      <div className="sticky top-6 space-y-6">

        {/* Tarjeta Cliente Resumen (Hero Card) */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white cl-p-xl cl-rounded-xl cl-shadow-lg cl-border-sm border-slate-700 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 cl-rounded-full blur-2xl"></div>
          <div className="absolute left-10 -bottom-10 w-32 h-32 bg-blue-400/10 cl-rounded-full blur-xl"></div>

          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest cl-mb-lg flex items-center cl-gap-md relative z-10">
            <Calculator className="w-4 h-4" /> Resumen de tu pedido
          </h3>

          {!results ? (
            <div className="relative z-10 text-center py-6">
              <div className="w-14 h-14 mx-auto cl-mb-md cl-rounded-full bg-slate-800 cl-border-sm border-slate-700 cl-flex-center">
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
              <span className="text-white text-sm font-semibold">{order.deliveryFormat === 'sincorte' ? 'Sin Cortar' : (order.deliveryFormat === 'individual' ? 'Troquel Individual' : 'Planchas (Medio corte)')}</span>
            </div>
            <div className="cl-flex-col  pb-3">
              <div className="cl-flex-between">
                <span className="text-slate-300 font-medium">Total Stickers:</span>
                <span className="text-xl font-bold text-white bg-slate-800 cl-p-sm cl-rounded-md cl-border-sm border-slate-600">~{results?.totalStickers ?? 0} unid.</span>
              </div>
              {(results?.totalStickers ?? 0) > 0 && (
                <div className="text-xs text-slate-400 mt-1.5 text-right font-medium">
                  ({order.sheetsQty} planchas de {order.shapeType} {sizeText})
                </div>
              )}
            </div>
            {(results?.totalStickers ?? 0) > 0 && (
              <div className="cl-flex-between pb-2">
                <span className="text-slate-300 font-medium">Precio por unidad:</span>
                <span className="font-medium text-slate-300">${results?.pricePerSticker?.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>

          <div className="relative z-10 bg-slate-800/50 cl-p-lg cl-rounded-xl cl-border-sm border-slate-700 backdrop-blur-sm">
            <span className="text-slate-400 text-sm font-medium block cl-mb-sm">Total Estimado</span>
            <div className="text-5xl md:text-6xl font-black text-emerald-400 tracking-tight drop-shadow-md">
              ${results?.finalPrice?.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="relative z-10 flex cl-gap-md mt-6">
            <a href={`?add-to-cart=123&p=${orderCode || ''}`} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-6 cl-rounded-md cl-transition-colors text-lg cl-shadow-lg shadow-emerald-900/50 cl-flex-center cl-gap-md">
              COMPRAR
            </a>
            <a href={consultLink} target="_blank" rel="noopener noreferrer" className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-4 cl-rounded-md cl-transition-colors cl-shadow-lg shadow-green-900/50 cl-flex-center cl-gap-md">
              <MessageCircle className="w-5 h-5" />
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
