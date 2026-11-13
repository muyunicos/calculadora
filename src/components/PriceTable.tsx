import React, { useMemo } from 'react';
import type { Config, Material, Order, ShapesCatalog, DeliveryOption, DesignOption } from '../types';
import { calcularPrecio } from '../core/priceEngine';

interface PriceTableProps {
  order: Order;
  config: Config;
  materials: Material[];
  shapesCatalog: ShapesCatalog;
  deliveryOptions?: DeliveryOption[];
  designOptions?: DesignOption[];
  onChangeQuantity?: (qty: number) => void;
}

// Cantidades de referencia para mostrar la economía de escala.
const QTY_STEPS = [1, 5, 10, 25, 50, 100];

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 });

// Tabla de precio por cantidad: muestra cómo baja el precio por unidad al pedir
// más planchas (los costos fijos se amortizan). Reutiliza el motor puro.
const PriceTable: React.FC<PriceTableProps> = ({ order, config, materials, shapesCatalog, deliveryOptions = [], designOptions = [], onChangeQuantity }) => {
  const rows = useMemo(() => {
    // Incluir la cantidad actual del cliente si no está en los escalones.
    const steps = Array.from(new Set([...QTY_STEPS, order.sheetsQty]))
      .filter((n) => n >= 1)
      .sort((a, b) => a - b);

    const base = calcularPrecio({ ...order, sheetsQty: 1 }, config, materials, shapesCatalog, deliveryOptions, designOptions);
    const basePerSheet = base?.pricePerSheet || 0;

    return steps.map((n) => {
      const r = calcularPrecio({ ...order, sheetsQty: n }, config, materials, shapesCatalog, deliveryOptions, designOptions);
      const perSheet = r?.pricePerSheet || 0;
      const savingsPct = basePerSheet > 0 ? ((basePerSheet - perSheet) / basePerSheet) * 100 : 0;
      return {
        planchas: n,
        totalStickers: r?.totalStickers || 0,
        perSheet,
        savingsPct,
      };
    });
  }, [order, config, materials, shapesCatalog, deliveryOptions, designOptions]);

  // Si no entra ningún sticker por hoja, no tiene sentido mostrar la tabla.
  const hasStickers = rows.some((r) => r.totalStickers > 0);
  if (!hasStickers) return null;

  return (
    <div className="cl-card overflow-hidden">
      <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100">
        <h4 className="font-bold text-emerald-900 text-base leading-tight">Ahorrá llevando más planchas</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-wider">
              <th className="text-left font-semibold px-4 py-2.5">Planchas</th>
              <th className="text-right font-semibold px-4 py-2.5">$/plancha</th>
              <th className="text-right font-semibold px-4 py-2.5">Unidades</th>
              <th className="text-right font-semibold px-4 py-2.5">Ahorro</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isCurrent = r.planchas === order.sheetsQty;
              return (
                <tr
                  key={r.planchas}
                  onClick={() => !isCurrent && onChangeQuantity?.(r.planchas)}
                  className={`border-b border-slate-100 last:border-0 transition-colors group ${
                    isCurrent
                      ? 'bg-emerald-50/80 text-emerald-900'
                      : 'text-slate-600 hover:bg-emerald-50/40 cursor-pointer focus:outline-none focus:bg-emerald-50/40'
                  }`}
                  tabIndex={!isCurrent ? 0 : undefined}
                  role={!isCurrent ? "button" : undefined}
                  onKeyPress={(e) => !isCurrent && e.key === 'Enter' && onChangeQuantity?.(r.planchas)}
                >
                  <td className="px-4 py-3 text-left font-bold">
                    <span className="inline-flex items-center gap-2">
                      {r.planchas}
                      {isCurrent && (
                        <span className="text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                          Tu pedido
                        </span>
                      )}
                      {!isCurrent && (
                        <span className="text-[10px] uppercase tracking-wider text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                          Elegir
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">${fmt(r.perSheet)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{r.totalStickers}</td>
                  <td className="px-4 py-3 text-right">
                    {r.savingsPct > 0.5 ? (
                      <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        -{r.savingsPct.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PriceTable;
