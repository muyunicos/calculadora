import React from 'react';
import { Printer, Plus, Trash2, ArrowUp, ArrowDown, Scissors } from 'lucide-react';
import type { Material, Order } from '../types';
import InfoExtraEditor from './InfoExtraEditor';

interface AdminMaterialsPanelProps {
  materials: Material[];
  resolveImage: (src: string) => string;
  updateMaterial: (id: string, field: string, value: string) => void;
  addMaterial: (orderSetter: (order: Order) => void) => void;
  removeMaterial: (id: string, order: Order, orderSetter: (order: Order) => void) => void;
  moveMaterial: (index: number, direction: -1 | 1) => void;
  order: Order;
  setOrder: (order: Order | ((prev: Order) => Order)) => void;
  isDeleteMode?: boolean;
  materialsShowMoreIndex: number;
  setMaterialsShowMoreIndex: (index: number) => void;
}

export const AdminMaterialsPanel: React.FC<AdminMaterialsPanelProps> = ({
  materials,
  resolveImage,
  updateMaterial,
  addMaterial,
  removeMaterial,
  moveMaterial,
  order,
  setOrder,
  isDeleteMode = false,
  materialsShowMoreIndex,
  setMaterialsShowMoreIndex,
}) => {
  return (
    <div className="cl-card bg-white p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Printer className="w-6 h-6 text-blue-600" /> Base de Materiales
          </h2>
        </div>
        <button onClick={() => addMaterial(setOrder)} className="flex items-center gap-2 cl-button-primary-small">
          <Plus className="w-4 h-4" /> Añadir Material
        </button>
      </div>

      <div className="space-y-6">
        {materials.map((m, index) => (
          <div key={m.id} className={`border rounded-2xl overflow-hidden transition-shadow ${index < materialsShowMoreIndex ? 'border-slate-200 shadow-sm hover:shadow-md' : 'border-slate-300 opacity-60 bg-slate-100'}`}>
            {/* Línea divisoria "Ver más" */}
            {index === materialsShowMoreIndex && materialsShowMoreIndex < materials.length && (
              <div className="text-xs font-bold text-slate-500 text-center border-t-2 border-dashed border-slate-300 pt-2 pb-1 mb-2">
                ← Ver más →
              </div>
            )}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3 w-full">
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveMaterial(index, -1)} disabled={index === 0} className={`p-1 rounded-md bg-white border shadow-sm ${index === 0 ? 'text-slate-300 border-slate-200' : 'text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-blue-600'}`} title="Subir"><ArrowUp className="w-3 h-3" /></button>
                  <button onClick={() => moveMaterial(index, 1)} disabled={index === materials.length - 1} className={`p-1 rounded-md bg-white border shadow-sm ${index === materials.length - 1 ? 'text-slate-300 border-slate-200' : 'text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-blue-600'}`} title="Bajar"><ArrowDown className="w-3 h-3" /></button>
                </div>
                <input type="number" value={m.code ?? ''} onChange={(e) => updateMaterial(m.id, 'code', e.target.value)} className="w-16 p-1.5 text-sm border border-slate-300 rounded-lg text-center font-mono focus:ring-2 focus:ring-blue-500 outline-none flex-shrink-0" title="Código estable y único del material" placeholder="cód." />
                <input type="text" value={m.name} onChange={(e) => updateMaterial(m.id, 'name', e.target.value)} className="font-black text-slate-800 bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none px-2 py-1 w-full max-w-sm transition-all text-lg" placeholder="Nombre del Material" />
              </div>
              <button 
                onClick={() => removeMaterial(m.id, order, setOrder)} 
                className={`
                  p-2 rounded-lg transition-colors flex-shrink-0
                  ${isDeleteMode 
                    ? 'bg-red-500 text-white hover:bg-red-600 hover:shadow-md' 
                    : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                  }
                  ${!isDeleteMode ? 'opacity-40' : ''}
                `}
                title={isDeleteMode ? 'Borrar Material (modo eliminación activo)' : 'Activa el modo eliminación para borrar'}
                disabled={!isDeleteMode}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Costo Base</h4>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Costo de 1 Hoja Blanca ($)</label>
                  <input type="number" value={m.sheetCost} onChange={(e) => updateMaterial(m.id, 'sheetCost', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Info extra para el cliente</label>
                  <InfoExtraEditor
                    description={m.description}
                    image={m.image}
                    onChange={(field, value) => updateMaterial(m.id, field, value)}
                    resolveImage={resolveImage}
                  />
                </div>
              </div>

              <div className="space-y-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-2 flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Impresión x Hoja</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Costo Tinta ($)</label>
                    <input type="number" value={m.inkCost} onChange={(e) => updateMaterial(m.id, 'inkCost', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Desgaste Imp. ($)</label>
                    <input type="number" value={m.printWear} onChange={(e) => updateMaterial(m.id, 'printWear', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tiempo de Impresión (Minutos)</label>
                    <input type="number" step="0.5" value={m.printTime} onChange={(e) => updateMaterial(m.id, 'printTime', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                <h4 className="text-xs font-bold text-purple-600 uppercase tracking-widest border-b border-purple-100 pb-2 flex items-center gap-1.5"><Scissors className="w-3.5 h-3.5" /> Corte x Hoja</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Desgaste Cuchilla/Plotter ($)</label>
                    <input type="number" value={m.cutWear} onChange={(e) => updateMaterial(m.id, 'cutWear', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">T. Mínimo (Min)</label>
                    <input type="number" step="0.5" value={m.minCutTime} onChange={(e) => updateMaterial(m.id, 'minCutTime', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">T. Máximo (Min)</label>
                    <input type="number" step="0.5" value={m.maxCutTime} onChange={(e) => updateMaterial(m.id, 'maxCutTime', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Control de "Ver más" */}
      {materials.length > 0 && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mt-6">
          <label className="text-xs font-semibold text-slate-600 block mb-2">Línea "Ver más" después de:</label>
          <div className="flex gap-2 items-center">
            <input
              type="range"
              min="0"
              max={materials.length}
              value={materialsShowMoreIndex}
              onChange={(e) => setMaterialsShowMoreIndex(parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-300 rounded-lg appearance-none accent-blue-600"
            />
            <span className="text-xs font-bold text-slate-600 w-8 text-center">{materialsShowMoreIndex}/{materials.length}</span>
            <button
              onClick={() => setMaterialsShowMoreIndex(materialsShowMoreIndex - 1)}
              disabled={materialsShowMoreIndex === 0}
              className={`p-1 rounded-md bg-white border shadow-sm ${materialsShowMoreIndex === 0 ? 'text-slate-300 border-slate-200' : 'text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-blue-600'}`}
              title="Subir línea Ver más"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => setMaterialsShowMoreIndex(materialsShowMoreIndex + 1)}
              disabled={materialsShowMoreIndex === materials.length}
              className={`p-1 rounded-md bg-white border shadow-sm ${materialsShowMoreIndex === materials.length ? 'text-slate-300 border-slate-200' : 'text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-blue-600'}`}
              title="Bajar línea Ver más"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">{materialsShowMoreIndex === materials.length ? 'Todos los materiales visibles (sin "Ver más")' : `Primeros ${materialsShowMoreIndex} visibles, ${materials.length - materialsShowMoreIndex} ocultos`}</p>
        </div>
      )}
    </div>
  );
};
