import React, { useState } from 'react';
import { Palette, Plus, Trash2, Eye, EyeOff, Package, Brush } from 'lucide-react';
import type { DeliveryOption, DesignOption, DeliveryFormat, DesignType } from '../types';
import InfoExtraEditor from './InfoExtraEditor';

interface AdminDeliveryDesignPanelProps {
  deliveryOptions: DeliveryOption[];
  designOptions: DesignOption[];
  resolveImage: (src: string) => string;
  updateDeliveryOption: (id: DeliveryFormat, field: 'label' | 'subtitle' | 'description' | 'image' | 'visible', value: string | boolean) => void;
  updateDesignOption: (id: DesignType, field: 'label' | 'subtitle' | 'description' | 'image' | 'visible', value: string | boolean) => void;
  addDeliveryOption: () => void;
  addDesignOption: () => void;
  removeDeliveryOption: (id: DeliveryFormat) => void;
  removeDesignOption: (id: DesignType) => void;
}

export const AdminDeliveryDesignPanel: React.FC<AdminDeliveryDesignPanelProps> = ({
  deliveryOptions,
  designOptions,
  resolveImage,
  updateDeliveryOption,
  updateDesignOption,
  addDeliveryOption,
  addDesignOption,
  removeDeliveryOption,
  removeDesignOption,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'delivery' | 'design'>('delivery');
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'delivery' | 'design'; id: DeliveryFormat | DesignType } | null>(null);

  const handleDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'delivery') {
      removeDeliveryOption(confirmDelete.id as DeliveryFormat);
    } else {
      removeDesignOption(confirmDelete.id as DesignType);
    }
    setConfirmDelete(null);
  };

  return (
    <div className="cl-card bg-white p-6">
      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
        <Palette className="w-6 h-6 text-blue-600" /> Formato y Diseño
      </h2>

      {/* Sub-pestañas */}
      <div className="flex cl-gap-md cl-mb-lg">
        <button
          onClick={() => setActiveSubTab('delivery')}
          className={`flex items-center cl-gap-md px-4 py-2 cl-rounded-md font-medium text-sm cl-transition-all ${
            activeSubTab === 'delivery'
              ? 'cl-tab-active'
              : 'cl-bg-slate-100 cl-text-texto cl-tab-inactive'
          }`}
        >
          <Package className="w-4 h-4" /> Formato
        </button>
        <button
          onClick={() => setActiveSubTab('design')}
          className={`flex items-center cl-gap-md px-4 py-2 cl-rounded-md font-medium text-sm cl-transition-all ${
            activeSubTab === 'design'
              ? 'cl-tab-active'
              : 'cl-bg-slate-100 cl-text-texto cl-tab-inactive'
          }`}
        >
          <Brush className="w-4 h-4" /> Tu Diseño
        </button>
      </div>

      {activeSubTab === 'delivery' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-700">Formato de Entrega</h3>
            <button onClick={addDeliveryOption} className="flex items-center gap-2 cl-button-primary-small">
              <Plus className="w-4 h-4" /> Agregar Formato
            </button>
          </div>
          {deliveryOptions.map((opt) => (
            <div key={opt.id} className={`p-4 rounded-xl border space-y-3 transition-all ${!opt.visible ? 'opacity-50 bg-slate-100' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Título</label>
                    <input type="text" value={opt.label} onChange={(e) => updateDeliveryOption(opt.id, 'label', e.target.value)} className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Subtítulo</label>
                    <input type="text" value={opt.subtitle ?? ''} onChange={(e) => updateDeliveryOption(opt.id, 'subtitle', e.target.value)} className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all" placeholder="Texto secundario de la tarjeta" />
                  </div>
                  <InfoExtraEditor
                    description={opt.description}
                    image={opt.image}
                    onChange={(field, value) => updateDeliveryOption(opt.id, field, value)}
                    resolveImage={resolveImage}
                    descriptionLabel="Descripción (info extra)"
                    descriptionPlaceholder="Ej: detalle del acabado, usos recomendados…"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => updateDeliveryOption(opt.id, 'visible', !opt.visible)}
                    className={`p-2 rounded-lg transition-colors ${opt.visible ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                    title={opt.visible ? 'Ocultar opción' : 'Mostrar opción'}
                  >
                    {opt.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ type: 'delivery', id: opt.id })}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    title="Eliminar formato"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-700">Tu Diseño</h3>
            <button onClick={addDesignOption} className="flex items-center gap-2 cl-button-primary-small">
              <Plus className="w-4 h-4" /> Agregar Opción
            </button>
          </div>
          {designOptions.map((opt) => (
            <div key={opt.id} className={`p-4 rounded-xl border space-y-3 transition-all ${!opt.visible ? 'opacity-50 bg-slate-100' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-600">Título</label>
                    {opt.customerVisible === false && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">solo admin</span>}
                  </div>
                  <input type="text" value={opt.label} onChange={(e) => updateDesignOption(opt.id, 'label', e.target.value)} className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all" />
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Subtítulo</label>
                    <input type="text" value={opt.subtitle ?? ''} onChange={(e) => updateDesignOption(opt.id, 'subtitle', e.target.value)} className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all" placeholder="Texto secundario de la tarjeta" />
                  </div>
                  <InfoExtraEditor
                    description={opt.description}
                    image={opt.image}
                    onChange={(field, value) => updateDesignOption(opt.id, field, value)}
                    resolveImage={resolveImage}
                    descriptionLabel="Descripción (info extra)"
                    descriptionPlaceholder="Ej: qué incluye, tiempos…"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => updateDesignOption(opt.id, 'visible', !opt.visible)}
                    className={`p-2 rounded-lg transition-colors ${opt.visible ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                    title={opt.visible ? 'Ocultar opción' : 'Mostrar opción'}
                  >
                    {opt.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ type: 'design', id: opt.id })}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    title="Eliminar opción"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">¿Eliminar opción?</h3>
            <p className="text-sm text-slate-600 mb-6">Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar esta opción?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
