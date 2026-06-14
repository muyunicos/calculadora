import React, { useMemo } from 'react';
import { TrendingDown } from 'lucide-react';
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

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });

// Tabla de precio por cantidad: muestra cómo baja el precio por unidad al pedir
// más planchas (los costos fijos se amortizan). Reutiliza el motor puro.
const PriceTable: React.FC<PriceTableProps> = ({ order, config, materials, shapesCatalog, deliveryOptions = [], designOptions = [], onChangeQuantity }) => {
  const rows = useMemo(() => {
    // Incluir la cantidad actual del cliente si no está en los escalones.
    const steps = Array.from(new Set([...QTY_STEPS, order.sheetsQty]))
      .filter((n) => n >= 1)
      .sort((a, b) => a - b);

    const base = calcularPrecio({ ...order, sheetsQty: 1 }, config, materials, shapesCatalog, deliveryOptions, designOptions);
    const basePerSticker = base?.pricePerSticker || 0;

    return steps.map((n) => {
      const r = calcularPrecio({ ...order, sheetsQty: n }, config, materials, shapesCatalog, deliveryOptions, designOptions);
      const perSticker = r?.pricePerSticker || 0;
      const savingsPct = basePerSticker > 0 ? ((basePerSticker - perSticker) / basePerSticker) * 100 : 0;
      return {
        planchas: n,
        totalStickers: r?.totalStickers || 0,
        perSticker,
        finalPrice: r?.finalPrice || 0,
        savingsPct,
      };
    });
  }, [order, config, materials, shapesCatalog]);

  // Si no entra ningún sticker por hoja, no tiene sentido mostrar la tabla.
  const hasStickers = rows.some((r) => r.totalStickers > 0);
  if (!hasStickers) return null;

  return (
    <div className="cl-card overflow-hidden">
      <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex items-center gap-2">
        <TrendingDown className="w-5 h-5 text-emerald-600" />
        <h4 className="font-bold text-emerald-800">Cuanto más pedís, más barato sale</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100">
              <th className="text-left font-semibold px-4 py-2">Planchas</th>
              <th className="text-right font-semibold px-4 py-2">Unidades</th>
              <th className="text-right font-semibold px-4 py-2">$/unidad</th>
              <th className="text-right font-semibold px-4 py-2">Ahorro</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isCurrent = r.planchas === order.sheetsQty;
              return (
                <tr
                  key={r.planchas}
                  onClick={() => !isCurrent && onChangeQuantity?.(r.planchas)}
                  className={`border-b border-slate-50 last:border-0 transition-colors group ${
                    isCurrent
                      ? 'bg-blue-50 font-bold text-blue-900'
                      : 'text-slate-600 hover:bg-slate-50 cursor-pointer focus:outline-none focus:bg-slate-100'
                  }`}
                  tabIndex={!isCurrent ? 0 : undefined}
                  role={!isCurrent ? "button" : undefined}
                  onKeyPress={(e) => !isCurrent && e.key === 'Enter' && onChangeQuantity?.(r.planchas)}
                >
                  <td className="px-4 py-2.5 text-left">
                    {r.planchas}
                    {isCurrent && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                        Tu pedido
                      </span>
                    )}
                    {!isCurrent && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                        ELEGIR
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">{r.totalStickers}</td>
                  <td className="px-4 py-2.5 text-right">${fmt(r.perSticker)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {r.savingsPct > 0.5 ? (
                      <span className="text-emerald-600 font-semibold">
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
