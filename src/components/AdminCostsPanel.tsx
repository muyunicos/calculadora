import React, { useState } from 'react';
import { Clock, TrendingUp, Tag, Plus, Trash2 } from 'lucide-react';
import type { Config, Material, Promo, ShapesCatalog } from '../types';
import { AdminSalaryPanel } from './AdminSalaryPanel';
import { AdminConfigPanel } from './AdminConfigPanel';

interface AdminCostsPanelProps {
  config: Config;
  handleConfigChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfigChange?: (config: Config) => void;
  materials?: Material[];
  shapesCatalog?: ShapesCatalog;
}

export const AdminCostsPanel: React.FC<AdminCostsPanelProps> = ({
  config,
  handleConfigChange,
  onConfigChange,
  materials,
  shapesCatalog,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'salary' | 'costs' | 'times' | 'promos'>('salary');

  // --- Promos (spec 038, v5) ---
  // OJO: `handleConfigChange` (de App) atiende los inputs NUMERICOS planos; la lista de
  // promos se escribe entera por `onConfigChange`, asi el borrado, el alta y el
  // reordenado no dependen de parsear un input.
  const promos: Promo[] = Array.isArray(config.promos) ? config.promos : [];
  const materiales: Material[] = Array.isArray(materials) ? materials : [];
  const categorias: string[] = shapesCatalog && typeof shapesCatalog === 'object' ? Object.keys(shapesCatalog) : [];

  const guardar = (lista: Promo[]) => {
    if (onConfigChange) onConfigChange({ ...config, promos: lista });
  };

  const agregar = () => {
    const nueva: Promo = {
      id: 'promo-' + Math.random().toString(36).slice(2, 8),
      material: 'todos',
      forma: 'todas',
      desde: 1,
      pct: 10,
      activa: true,
    };
    guardar([...promos, nueva]);
  };

  const cambiar = (indice: number, cambios: Partial<Promo>) => {
    guardar(promos.map((p, i) => (i === indice ? { ...p, ...cambios } : p)));
  };

  const quitar = (indice: number) => {
    guardar(promos.filter((_, i) => i !== indice));
  };

  const campo = 'w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50';
  const etiqueta = 'block text-[10px] font-bold text-slate-500 uppercase mb-1';
  return (
    <div className="cl-card bg-white p-6">
      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
        <TrendingUp className="w-6 h-6 text-blue-600" /> Costos y Tiempos
      </h2>

      {/* Sub-pestañas */}
      <div className="flex flex-wrap cl-gap-md cl-mb-lg">
        <button
          onClick={() => setActiveSubTab('salary')}
          className={`flex items-center cl-gap-md px-4 py-2 cl-rounded-md font-medium text-sm cl-transition-all ${
            activeSubTab === 'salary'
              ? 'cl-tab-active'
              : 'cl-bg-slate-100 cl-text-texto cl-tab-inactive'
          }`}
        >
          <Clock className="w-4 h-4" /> Sueldo
        </button>
        <button
          onClick={() => setActiveSubTab('costs')}
          className={`flex items-center cl-gap-md px-4 py-2 cl-rounded-md font-medium text-sm cl-transition-all ${
            activeSubTab === 'costs'
              ? 'cl-tab-active'
              : 'cl-bg-slate-100 cl-text-texto cl-tab-inactive'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Fijos y Ganancias
        </button>
        <button
          onClick={() => setActiveSubTab('times')}
          className={`flex items-center cl-gap-md px-4 py-2 cl-rounded-md font-medium text-sm cl-transition-all ${
            activeSubTab === 'times'
              ? 'cl-tab-active'
              : 'cl-bg-slate-100 cl-text-texto cl-tab-inactive'
          }`}
        >
          <Clock className="w-4 h-4" /> Tiempos Fijos
        </button>
        <button
          onClick={() => setActiveSubTab('promos')}
          className={`flex items-center cl-gap-md px-4 py-2 cl-rounded-md font-medium text-sm cl-transition-all ${
            activeSubTab === 'promos'
              ? 'cl-tab-active'
              : 'cl-bg-slate-100 cl-text-texto cl-tab-inactive'
          }`}
        >
          <Tag className="w-4 h-4" /> Promos
        </button>
      </div>

      {activeSubTab === 'salary' && (
        <AdminSalaryPanel config={config} handleConfigChange={handleConfigChange} />
      )}

      {activeSubTab === 'costs' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Fijos y Ganancias
          </h3>
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
      )}

      {activeSubTab === 'times' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" /> Tiempos Fijos (Minutos)
          </h3>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Atención al Cliente</label>
              <input type="number" name="timeCustomerService" value={config.timeCustomerService} onChange={handleConfigChange} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Logística / Empaque</label>
              <input type="number" name="timeDelivery" value={config.timeDelivery} onChange={handleConfigChange} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50" />
            </div>
            <div className="col-span-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
              El tiempo de diseño se configura por opción en <strong>Admin → Formato de Corte y Diseño</strong> (minutos de diseño / pide minutos al cliente).
            </div>
          </div>
        </div>
      )}
{activeSubTab === 'promos' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-500" /> Promos
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Gana la de <strong>mayor descuento</strong>; solo se aplica si supera al descuento por cantidad.
              </p>
            </div>
            <button
              type="button"
              onClick={agregar}
              className="cl-button-secondary-small shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Añadir promo
            </button>
          </div>

          {promos.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay promos. Con "Añadir promo" podes crear un descuento para un material, una forma y un rango de tamaños.
            </p>
          ) : (
            <div className="space-y-3">
              {promos.map((promo, indice) => {
                const activo = promo.activa !== false;
                return (
                  <div
                    key={promo.id || indice}
                    className={`rounded-xl border p-3 space-y-2 ${
                      activo ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-70'
                    }`}
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <label className={etiqueta}>
                        Material
                        <select
                          className={campo}
                          value={promo.material || 'todos'}
                          onChange={(e) => cambiar(indice, { material: e.target.value })}
                        >
                          <option value="todos">Todos</option>
                          {materiales.map((m) => (
                            <option key={m.id} value={m.id}>{m.name || m.id}</option>
                          ))}
                        </select>
                      </label>
                      <label className={etiqueta}>
                        Forma
                        <select
                          className={campo}
                          value={promo.forma || 'todas'}
                          onChange={(e) => cambiar(indice, { forma: e.target.value })}
                        >
                          <option value="todas">Todas</option>
                          {categorias.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                          <option value="Rectangulares">Rectangulares</option>
                        </select>
                      </label>
                      <label className={etiqueta}>
                        Desde (cm)
                        <input
                          type="number"
                          className={campo}
                          min={0}
                          step={0.5}
                          value={promo.tamMin ?? ''}
                          placeholder="sin mínimo"
                          onChange={(e) => cambiar(indice, {
                            tamMin: e.target.value === '' ? undefined : Number(e.target.value),
                          })}
                        />
                      </label>
                      <label className={etiqueta}>
                        Hasta (cm)
                        <input
                          type="number"
                          className={campo}
                          min={0}
                          step={0.5}
                          value={promo.tamMax ?? ''}
                          placeholder="sin máximo"
                          onChange={(e) => cambiar(indice, {
                            tamMax: e.target.value === '' ? undefined : Number(e.target.value),
                          })}
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
                      <label className={etiqueta}>
                        Planchas mínimas
                        <input
                          type="number"
                          className={campo}
                          min={1}
                          value={promo.desde}
                          onChange={(e) => cambiar(indice, { desde: Math.max(1, Number(e.target.value) || 1) })}
                        />
                      </label>
                      <label className={etiqueta}>
                        Descuento (%)
                        <input
                          type="number"
                          className={campo}
                          min={0}
                          max={100}
                          value={promo.pct}
                          onChange={(e) => cambiar(indice, {
                            pct: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                          })}
                        />
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 pb-2">
                        <input
                          type="checkbox"
                          checked={activo}
                          onChange={(e) => cambiar(indice, { activa: e.target.checked })}
                        />
                        Activa
                      </label>
                      <button
                        type="button"
                        onClick={() => quitar(indice)}
                        className="cl-button-secondary-small justify-self-start"
                        aria-label="Borrar esta promo"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Borrar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="col-span-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4">
            El descuento se aplica sobre el <strong>total del pedido</strong> (no por unidad) y el tamaño
            se evalúa en <strong>ambos lados</strong> del sticker. Si dos promos aplican, se cobra la de mayor porcentaje.
          </p>
        </div>
      )}
    </div>
  );
};
