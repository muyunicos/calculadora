import React from 'react';
import { TrendingUp, Clock } from 'lucide-react';
import type { Config } from '../types';

interface AdminConfigPanelProps {
  config: Config;
  handleConfigChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AdminConfigPanel: React.FC<AdminConfigPanelProps> = ({
  config,
  handleConfigChange,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" /> Fijos y Ganancias</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Margen de Error (%)</label>
              <input type="number" name="wasteMargin" value={config.wasteMargin} onChange={handleConfigChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-black text-emerald-700 mb-1.5">Ganancia Negocio (%)</label>
              <input type="number" name="profitMargin" value={config.profitMargin} onChange={handleConfigChange} className="w-full p-2.5 border-2 border-emerald-300 bg-emerald-50 text-emerald-900 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-bold text-lg transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Costo Packaging Fijo x Pedido ($)</label>
            <input type="number" name="packagingCost" value={config.packagingCost} onChange={handleConfigChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Planchas de Referencia (Galería)</label>
            <p className="text-xs text-slate-500 mb-2">Cantidad por defecto para mostrar precio de mayorista en la mini-galería (10 recomendado).</p>
            <input type="number" name="galleryRefSheets" value={config.galleryRefSheets} onChange={handleConfigChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 transition-all" min="1" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2"><Clock className="w-5 h-5 text-orange-500" /> Tiempos Fijos (Minutos)</h3>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Atención al Cliente</label>
            <input type="number" name="timeCustomerService" value={config.timeCustomerService} onChange={handleConfigChange} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Logística / Empaque</label>
            <input type="number" name="timeDelivery" value={config.timeDelivery} onChange={handleConfigChange} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Armado en plancha</label>
            <input type="number" name="timeDesignBasic" value={config.timeDesignBasic} onChange={handleConfigChange} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Diseño a Medida</label>
            <input type="number" name="timeDesignCustom" value={config.timeDesignCustom} onChange={handleConfigChange} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50" />
          </div>
        </div>
      </div>
    </div>
  );
};
