import React from 'react';
import { LayoutDashboard, ArrowUp, ArrowDown, Trash2, Eye, EyeOff } from 'lucide-react';
import type { ShapesCatalog, ShapesShowMoreIndex, Order } from '../types';
import InfoExtraEditor from './InfoExtraEditor';

interface AdminShapesPanelProps {
  shapesCatalog: ShapesCatalog;
  shapesShowMoreIndex: ShapesShowMoreIndex | null;
  resolveImage: (src: string) => string;
  updateShapeCatalog: (category: string, index: number, field: 'size' | 'qty' | 'code' | 'description' | 'image' | 'visible', value: string | boolean) => void;
  addShapeItem: (category: string) => void;
  removeShapeItem: (category: string, index: number, order: Order, orderSetter: (order: Order) => void) => void;
  moveShapeItem: (category: string, index: number, direction: -1 | 1) => void;
  setShowMoreIndex: (category: string, index: number) => void;
  order: Order;
  setOrder: (order: Order | ((prev: Order) => Order)) => void;
  isDeleteMode?: boolean;
}

export const AdminShapesPanel: React.FC<AdminShapesPanelProps> = ({
  shapesCatalog,
  shapesShowMoreIndex,
  resolveImage,
  updateShapeCatalog,
  addShapeItem,
  removeShapeItem,
  moveShapeItem,
  setShowMoreIndex,
  order,
  setOrder,
  isDeleteMode = false,
}) => {
  return (
    <div className="cl-card bg-white p-6">
      <h2 className="text-xl font-bold text-slate-800 flex items-center cl-gap-md border-b border-slate-100 pb-4 cl-mb-lg">
        <LayoutDashboard className="w-6 h-6 cl-text-primario" /> Configuración de Formas y Tamaños
      </h2>
      <p className="text-sm text-slate-500 mb-6">Administra las opciones predefinidas y la cantidad de stickers que entran por hoja A4. Rectangulares se calcula automáticamente. El <strong>código</strong> es un número estable y único que identifica el tamaño en los links compartibles y la galería (no lo reutilices). Cada tamaño puede tener una descripción e imagen opcional.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {Object.keys(shapesCatalog).map((category) => {
          const showMoreIdx = shapesShowMoreIndex?.[category] ?? shapesCatalog[category].length;
          // Display name mapping
          const displayName = category === 'Formas' ? 'A Medida' : category;
          return (
            <div key={category} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-700">{displayName}</h3>
                <button onClick={() => addShapeItem(category)} className="text-xs bg-white border border-slate-300 text-slate-600 px-2 py-1 rounded hover:text-blue-600 hover:border-blue-400 transition-colors">+ Añadir Tamaño</button>
              </div>
              <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                {shapesCatalog[category].map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border transition-colors ${idx < showMoreIdx ? 'bg-white border-slate-200' : 'bg-slate-100 border-slate-300 opacity-60'}`}>
                    {/* Línea divisoria "Ver más" */}
                    {idx === showMoreIdx && showMoreIdx < shapesCatalog[category].length && (
                      <div className="mb-3 text-xs font-bold text-slate-500 text-center border-t-2 border-dashed border-slate-300 pt-2 pb-1">
                        ← Ver más →
                      </div>
                    )}

                    {/* Row 1: Ordenamiento, código, tamaño, cantidad */}
                    <div className="flex gap-2 items-center mb-2">
                      <div className="flex flex-col gap-1">
                        <button onClick={() => moveShapeItem(category, idx, -1)} disabled={idx === 0} className={`p-1 rounded-md bg-white border shadow-sm ${idx === 0 ? 'text-slate-300 border-slate-200' : 'text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-blue-600'}`} title="Subir"><ArrowUp className="w-3 h-3" /></button>
                        <button onClick={() => moveShapeItem(category, idx, 1)} disabled={idx === shapesCatalog[category].length - 1} className={`p-1 rounded-md bg-white border shadow-sm ${idx === shapesCatalog[category].length - 1 ? 'text-slate-300 border-slate-200' : 'text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-blue-600'}`} title="Bajar"><ArrowDown className="w-3 h-3" /></button>
                      </div>
                      <input type="number" value={item.code ?? ''} onChange={(e) => updateShapeCatalog(category, idx, 'code', e.target.value)} className="w-16 p-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-center font-mono transition-all" title="Código estable (único)" placeholder="cód." />
                      <input type="text" value={item.size} onChange={(e) => updateShapeCatalog(category, idx, 'size', e.target.value)} className="flex-1 p-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Ej: 4,0 cm" />
                      <input type="number" value={item.qty} onChange={(e) => updateShapeCatalog(category, idx, 'qty', e.target.value)} className="w-20 p-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-center transition-all" title="Stickers por hoja" />
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => updateShapeCatalog(category, idx, 'visible', !(item.visible ?? true))}
                          className={`p-2 rounded-lg transition-colors ${item.visible ?? true ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                          title={item.visible ?? true ? 'Ocultar tamaño' : 'Mostrar tamaño'}
                        >
                          {item.visible ?? true ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => removeShapeItem(category, idx, order, setOrder)} 
                          className={`
                            p-2 transition-colors
                            ${isDeleteMode 
                              ? 'bg-red-500 text-white hover:bg-red-600 rounded-lg hover:shadow-md' 
                              : 'text-slate-400 hover:text-red-500'
                            }
                            ${!isDeleteMode ? 'opacity-40' : ''}
                          `}
                          title={isDeleteMode ? 'Borrar tamaño (modo eliminación activo)' : 'Activa el modo eliminación para borrar'}
                          disabled={!isDeleteMode}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Info extra unificada (descripción + imagen) */}
                    <InfoExtraEditor
                      description={item.description}
                      image={item.image}
                      onChange={(field, value) => updateShapeCatalog(category, idx, field, value)}
                      resolveImage={resolveImage}
                      descriptionLabel="Descripción (opcional)"
                      descriptionPlaceholder="Ej: ideal para frascos"
                    />
                  </div>
                ))}
              </div>

              {/* Control de "Ver más" */}
              {shapesCatalog[category].length > 0 && (
                <div className="p-3 bg-white border-t border-slate-200">
                  <label className="text-xs font-semibold text-slate-600 block mb-2">Línea "Ver más" después de:</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range"
                      min="0"
                      max={shapesCatalog[category].length}
                      value={showMoreIdx}
                      onChange={(e) => setShowMoreIndex(category, parseInt(e.target.value))}
                      className="flex-1 h-2 bg-slate-300 rounded-lg appearance-none accent-blue-600"
                    />
                    <span className="text-xs font-bold text-slate-600 w-8 text-center">{showMoreIdx}/{shapesCatalog[category].length}</span>
                    <button
                      onClick={() => setShowMoreIndex(category, showMoreIdx - 1)}
                      disabled={showMoreIdx === 0}
                      className={`p-1 rounded-md bg-white border shadow-sm ${showMoreIdx === 0 ? 'text-slate-300 border-slate-200' : 'text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-blue-600'}`}
                      title="Subir línea Ver más"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setShowMoreIndex(category, showMoreIdx + 1)}
                      disabled={showMoreIdx === shapesCatalog[category].length}
                      className={`p-1 rounded-md bg-white border shadow-sm ${showMoreIdx === shapesCatalog[category].length ? 'text-slate-300 border-slate-200' : 'text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-blue-600'}`}
                      title="Bajar línea Ver más"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{showMoreIdx === shapesCatalog[category].length ? 'Todos los tamaños visibles (sin "Ver más")' : `Primeros ${showMoreIdx} visibles, ${shapesCatalog[category].length - showMoreIdx} ocultos`}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
