import React from 'react';
import { Info, ChevronUp, ChevronDown, ImageIcon } from 'lucide-react';
import type { ShapesCatalog, A4Layout, Order } from '../types';
import StepSection from './StepSection';
import OptionInfoPanel from './OptionInfoPanel';

interface ShapeSizeSelectorProps {
  order: Order;
  setOrder: (order: Order | ((prev: Order) => Order)) => void;
  shapesCatalog: ShapesCatalog;
  shapesShowMoreIndex: Record<string, number> | null;
  customRectMath: A4Layout;
  expandedShapesCategory: string | null;
  infoOpenSizeIndex: number | null;
  infoBtnClass: (active: boolean) => string;
  setExpandedShapesCategory: (category: string | null) => void;
  setInfoOpenSizeIndex: (index: number | null) => void;
  resolveImage: (src: string) => string;
  setActiveStep: (step: 1 | 2 | 3) => void;
}

export const ShapeSizeSelector: React.FC<ShapeSizeSelectorProps> = ({
  order,
  setOrder,
  shapesCatalog,
  shapesShowMoreIndex,
  customRectMath,
  expandedShapesCategory,
  infoOpenSizeIndex,
  infoBtnClass,
  setExpandedShapesCategory,
  setInfoOpenSizeIndex,
  resolveImage,
  setActiveStep,
}) => {
  const sizeText = order.shapeType === 'Rectangulares'
    ? `${order.customRectW}x${order.customRectH}cm`
    : shapesCatalog?.[order.shapeType]?.[order.sizeIndex]?.size || '';

  return (
    <StepSection
      index={2}
      title="Forma y Tamaño"
      summary={`${order.shapeType} · ${sizeText}`}
      isOpen={true}
      isDone={false}
      onOpen={() => {}}
    >
      {/* Selector de tipo de forma */}
      <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-xl overflow-x-auto">
        {['Circulares', 'Rectangulares', 'Formas'].map((shape) => (
          <button key={shape} onClick={() => { setOrder({ ...order, shapeType: shape, sizeIndex: -1 }); setInfoOpenSizeIndex(null); }}
            className={`flex-1 min-w-[110px] py-2.5 px-3 text-sm font-semibold rounded-lg transition-all ${order.shapeType === shape ? 'bg-white shadow-sm border border-slate-200 text-blue-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}>
            {shape}
          </button>
        ))}
      </div>

      {/* Contenido condicional según la forma */}
      {order.shapeType === 'Rectangulares' ? (

        // VISTA PARA RECTANGULARES (Personalizado y Canvas A4)
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start bg-slate-50 p-6 rounded-xl border border-slate-200">
          <div className="flex-1 space-y-4 w-full">
            <p className="text-sm text-slate-600 font-medium">Ingresá la medida exacta de tu diseño:</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Ancho (cm)</label>
                <input type="number" min="2" step="0.5" value={order.customRectW} onChange={(e) => setOrder({ ...order, customRectW: e.target.value })} className="cl-input-number" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Alto (cm)</label>
                <input type="number" min="2" step="0.5" value={order.customRectH} onChange={(e) => setOrder({ ...order, customRectH: e.target.value })} className="cl-input-number" />
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-start gap-3 mt-4">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-blue-900">Calculador A4 Inteligente</div>
                <div className="text-xs text-blue-700 mt-0.5">Entran <strong>{customRectMath.qty}</strong> unidades por cada plancha impresa.</div>
              </div>
            </div>
          </div>

          {/* Representación Visual de la Hoja */}
          <div className="w-32 h-[180px] bg-white border-2 border-slate-300 rounded-md shadow-sm relative flex flex-col items-center justify-center p-2 flex-shrink-0">
            <div className="absolute top-1 left-2 text-[8px] text-slate-400 font-bold uppercase">Hoja A4</div>

            {customRectMath.qty > 0 && (
              <div className="relative w-full h-full border border-dashed border-slate-200 mt-2 flex items-center justify-center overflow-hidden">
                <div className="bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center shadow-sm"
                  style={{
                    width: `${(customRectMath.renderW / 19) * 100}%`,
                    height: `${(customRectMath.renderH / 27.7) * 100}%`,
                    maxWidth: '95%', maxHeight: '95%',
                  }}>
                  <ImageIcon className="w-4 h-4 text-blue-600/50" />
                </div>
              </div>
            )}
          </div>
        </div>

      ) : (

        // VISTA PARA CIRCULARES Y FORMAS (Catálogo con imágenes)
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {shapesCatalog[order.shapeType]?.map((s, idx) => {
              const catalog = shapesCatalog[order.shapeType];
              const showMoreIdx = shapesShowMoreIndex?.[order.shapeType] ?? catalog?.length ?? 0;
              const isHidden = idx >= showMoreIdx && expandedShapesCategory !== order.shapeType;
              if (isHidden) return null;

              const shapeIndex = Object.keys(shapesCatalog).indexOf(order.shapeType) + 1;
              const imageFileName = `2_${shapeIndex}_${idx + 1}.png`;
              const imagePath = resolveImage(imageFileName);

              const hasInfo = !!(s.description || s.image);
              return (
                <div key={idx} className="relative">
                  <button onClick={() => setOrder({ ...order, sizeIndex: idx })}
                    className={`w-full h-full cl-option-card flex flex-col items-center justify-center min-h-[100px] text-center ${order.sizeIndex === idx ? 'cl-option-card-selected' : ''}`}>

                    <div className="w-12 h-12 mb-2 flex items-center justify-center opacity-80">
                      <img
                        src={imagePath}
                        alt={s.size}
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="absolute -z-10 w-8 h-8 rounded-full border-2 border-slate-200 border-dashed"></div>
                    </div>

                    {order.sizeIndex === idx && <div className="absolute inset-0 border-2 border-blue-600 rounded-xl pointer-events-none"></div>}
                    <div className="font-bold">{s.size}</div>
                    <div className="text-xs mt-0.5 font-medium text-slate-500">{s.qty} uni/plancha</div>
                  </button>
                  {hasInfo && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setInfoOpenSizeIndex(infoOpenSizeIndex === idx ? null : idx); }}
                      className={infoBtnClass(infoOpenSizeIndex === idx)}
                      title="Más info"
                      aria-label={`Más info sobre ${s.size}`}
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Botón "Ver más" si hay tamaños ocultos */}
          {(() => {
            const catalog = shapesCatalog[order.shapeType];
            const showMoreIdx = shapesShowMoreIndex?.[order.shapeType] ?? catalog?.length ?? 0;
            const hasHidden = showMoreIdx < (catalog?.length ?? 0);
            return (
              hasHidden && (
                <button
                  onClick={() => setExpandedShapesCategory(expandedShapesCategory === order.shapeType ? null : order.shapeType)}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  {expandedShapesCategory === order.shapeType ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {expandedShapesCategory === order.shapeType ? 'Ocultar tamaños' : `Ver más (${(catalog?.length ?? 0) - showMoreIdx})`}
                </button>
              )
            );
          })()}

          {/* Motor de info: panel "MÁS INFO" del tamaño elegido / consultado. */}
          {(() => {
            const catalog = shapesCatalog[order.shapeType] || [];
            const expandedIdx = infoOpenSizeIndex;
            const selIdx = order.sizeIndex;
            const idx = expandedIdx != null
              ? expandedIdx
              : (selIdx >= 0 && catalog[selIdx] && (catalog[selIdx].description || catalog[selIdx].image) ? selIdx : -1);
            const item = idx >= 0 ? catalog[idx] : null;
            if (!item) return null;
            return (
              <OptionInfoPanel
                option={{ name: `${order.shapeType} ${item.size}`, description: item.description, image: item.image }}
                isOpen={expandedIdx === idx}
                onToggle={() => setInfoOpenSizeIndex(infoOpenSizeIndex === idx ? null : idx)}
                resolveImage={resolveImage}
              />
            );
          })()}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button type="button" onClick={() => setActiveStep(3)} className="cl-button-primary-small">
          Continuar
        </button>
      </div>
    </StepSection>
  );
};
