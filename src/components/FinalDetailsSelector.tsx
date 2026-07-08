import React from 'react';
import { Info, CheckCircle2, Palette, ShieldCheck } from 'lucide-react';
import type { Order, DeliveryOption, DesignOption, Config, PriceResult, DeliveryFormat, DesignType } from '../types';
import StepSection, { StepSectionRef } from './StepSection';
import OptionInfoPanel from './OptionInfoPanel';
import { NumberInput } from './NumberInput';

interface FinalDetailsSelectorProps {
  order: Order;
  setOrder: (order: Order | ((prev: Order) => Order)) => void;
  deliveryOptions: DeliveryOption[];
  designOptions: DesignOption[];
  config: Config;
  results: PriceResult | null;
  isAdmin: boolean;
  infoOpenDeliveryId: DeliveryFormat | null;
  infoOpenDesignId: DesignType | null;
  infoBtnClass: (active: boolean) => string;
  setInfoOpenDeliveryId: (id: DeliveryFormat | null) => void;
  setInfoOpenDesignId: (id: DesignType | null) => void;
  resolveImage: (src: string) => string;
  activeStep: 0 | 1 | 2 | 3;
  onStepOpen?: () => void;
  onNavigateToNext?: () => void;
  shouldScrollOnMount: boolean;
}

export const FinalDetailsSelector: React.FC<FinalDetailsSelectorProps> = ({
  order,
  setOrder,
  deliveryOptions,
  designOptions,
  config,
  results,
  isAdmin,
  infoOpenDeliveryId,
  infoOpenDesignId,
  infoBtnClass,
  setInfoOpenDeliveryId,
  setInfoOpenDesignId,
  resolveImage,
  activeStep,
  onStepOpen,
  onNavigateToNext,
  shouldScrollOnMount,
}) => {
  const stepRef = React.useRef<StepSectionRef>(null);
  const formatoLabel = deliveryOptions?.find((o) => o.id === order.deliveryFormat)?.label ?? '';
  const designLabel = designOptions?.find((o) => o.id === order.designType)?.label ?? '';

  // Determinar si el paso está completado
  const isStepComplete = !!order.designType && !!order.deliveryFormat && order.sheetsQty > 0;

  const isOpen = activeStep === 3;
  const isDone = isStepComplete; // Paso 3 no tiene siguiente, pero muestra completado cuando está listo
  const hasScrolledRef = React.useRef(false);

  // Scroll automático cuando se abre este paso (respetando flag de scroll inicial)
  React.useEffect(() => {
    if (isOpen && stepRef.current) {
      // Si no debe hacer scroll en el mount inicial y aún no ha scrolleado, evitar scroll
      if (!shouldScrollOnMount && !hasScrolledRef.current) {
        hasScrolledRef.current = true;
        return;
      }
      // Permitir scroll en casos normales o cuando shouldScrollOnMount es true
      stepRef.current.scrollTo();
    }
  }, [isOpen, shouldScrollOnMount]);

  return (
    <>
      <StepSection
        ref={stepRef}
        index={3}
        title="Detalles Finales"
        summary={`${formatoLabel} · ${designLabel} · ${order.sheetsQty} planchas`}
        isOpen={isOpen}
        isDone={isDone}
        onOpen={() => onStepOpen?.()}
      >
        {/* 3.1 Diseño */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Tu Diseño</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {designOptions.filter((opt) => opt.visible !== false).map((opt) => {
              const selected = order.designType === opt.id;
              const Icon = opt.id === 'basic' ? Palette : CheckCircle2;
              const hasInfo = !!(opt.description || opt.image);
              return (
                <div key={opt.id} className="relative">
                  <button onClick={() => {
                    setOrder({ ...order, designType: opt.id });
                    // Si el panel de info está abierto, actualizarlo para mostrar la nueva selección
                    if (infoOpenDesignId !== null) {
                      setInfoOpenDesignId(opt.id);
                    }
                  }}
                    className={`w-full h-full cl-option-card flex items-center gap-3 p-4 sm:p-3 ${selected ? 'cl-option-card-selected' : ''} active:scale-95 transition-transform`}>
                    <Icon className={`w-5 h-5 flex-shrink-0 ${selected ? 'text-blue-600' : 'text-slate-300'}`} />
                    <div className="pr-8 text-left">
                      <div className="font-bold text-sm text-slate-800">{opt.label}</div>
                      {opt.subtitle && <div className="text-xs text-slate-500 mt-0.5">{opt.subtitle}</div>}
                    </div>
                  </button>
                  {hasInfo && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setInfoOpenDesignId(infoOpenDesignId === opt.id ? null : opt.id); }}
                      className={infoBtnClass(infoOpenDesignId === opt.id)} title="Más info" aria-label={`Más info sobre ${opt.label}`}>
                      <Info className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {(() => {
            const expanded = infoOpenDesignId ? designOptions.find((o) => o.id === infoOpenDesignId) : null;
            const selectedO = designOptions.find((o) => o.id === order.designType);
            const subject = expanded ?? (selectedO && (selectedO.description || selectedO.image) ? selectedO : null);
            if (!subject) return null;
            return (
              <OptionInfoPanel
                option={{ name: subject.label, description: subject.description, image: subject.image }}
                isOpen={!!expanded && expanded.id === subject.id}
                onToggle={() => setInfoOpenDesignId(infoOpenDesignId === subject.id ? null : subject.id)}
                resolveImage={resolveImage}
              />
            );
          })()}
        </div>

        {/* 3.2 Corte/Formato */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Formato de Corte</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {deliveryOptions.filter((opt) => opt.visible !== false).map((opt) => {
              const selected = order.deliveryFormat === opt.id;
              const hasInfo = !!(opt.description || opt.image);
              return (
                <div key={opt.id} className="relative">
                  <button onClick={() => {
                    setOrder({ ...order, deliveryFormat: opt.id });
                    // Si el panel de info está abierto, actualizarlo para mostrar la nueva selección
                    if (infoOpenDeliveryId !== null) {
                      setInfoOpenDeliveryId(opt.id);
                    }
                  }}
                    className={`w-full h-full cl-option-card p-4 sm:p-3 ${selected ? 'cl-option-card-selected' : ''} active:scale-95 transition-transform`}>
                    <div className="flex items-start gap-2 pr-8">
                      {selected && <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                      <div>
                        <div className="font-bold text-sm text-slate-800">{opt.label}</div>
                        {opt.subtitle && <div className="text-xs text-slate-500 mt-1">{opt.subtitle}</div>}
                      </div>
                    </div>
                  </button>
                  {hasInfo && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setInfoOpenDeliveryId(infoOpenDeliveryId === opt.id ? null : opt.id); }}
                      className={infoBtnClass(infoOpenDeliveryId === opt.id)} title="Más info" aria-label={`Más info sobre ${opt.label}`}>
                      <Info className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {(() => {
            const expanded = infoOpenDeliveryId ? deliveryOptions.find((o) => o.id === infoOpenDeliveryId) : null;
            const selectedO = deliveryOptions.find((o) => o.id === order.deliveryFormat);
            const subject = expanded ?? (selectedO && (selectedO.description || selectedO.image) ? selectedO : null);
            if (!subject) return null;
            return (
              <OptionInfoPanel
                option={{ name: subject.label, description: subject.description, image: subject.image }}
                isOpen={!!expanded && expanded.id === subject.id}
                onToggle={() => setInfoOpenDeliveryId(infoOpenDeliveryId === subject.id ? null : subject.id)}
                resolveImage={resolveImage}
              />
            );
          })()}
        </div>

        {/* 3.3 Cantidad (sin default: hay que elegir para ver el precio) */}
        <div className="cl-bg-slate-50 cl-p-lg  p-0">
          <label className="block text-sm font-bold text-slate-800 cl-mb-sm">¿Cuántas planchas necesitás?</label>
          <p className="text-xs text-slate-500 cl-mb-lg">Elegí una cantidad para ver el precio. A más planchas, más barato sale.</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 cl-gap-md cl-mb-md">
            {[1, 5, 10, 25, 50, 100].map((q) => (
              <button key={q} type="button" onClick={() => setOrder({ ...order, sheetsQty: q })}
                className={`py-3 sm:py-2.5 cl-rounded-xl cl-border-md font-bold text-sm cl-transition-all active:scale-95 whitespace-nowrap ${order.sheetsQty === q ? 'border-blue-600 cl-bg-blue-50 text-blue-700 cl-shadow-sm' : 'cl-border-sm bg-white text-slate-700 hover:border-blue-300'}`}>
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-center cl-gap-md">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Otra:</label>
            <NumberInput
              value={order.sheetsQty || ''}
              onChange={(value) => setOrder({ ...order, sheetsQty: parseInt(value) || 0 })}
              step={1}
              min={1}
              className="font-bold text-lg"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onNavigateToNext}
            disabled={!isStepComplete}
            className="cl-button-primary-small disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar
          </button>
        </div>
      </StepSection>

      {/* Ajustes Manuales ADMIN */}
      {isAdmin && (
        <div className="cl-bg-amber-50 cl-p-lg cl-rounded-xl cl-border-md border-amber-200 cl-shadow-sm">
          <h3 className="text-sm font-black text-amber-800 cl-mb-lg flex items-center cl-gap-md uppercase tracking-wide">
            <ShieldCheck className="w-5 h-5" /> Ajustes Manuales (Solo Admin)
          </h3>

          <div className="space-y-5">
            <div className="bg-white cl-p-lg cl-rounded-xl cl-border-sm border-amber-100 cl-shadow-sm">
              <div className="cl-flex-between cl-mb-md items-center">
                <label className="text-sm font-bold text-slate-700">Complejidad Forzada del Corte</label>
                <span className="text-xs font-black text-white bg-amber-500 cl-p-sm cl-rounded-md">
                  Nivel {order.complexity} / 10
                </span>
              </div>
              <p className="text-xs text-slate-500 cl-mb-md">Afecta el tiempo de corte estimado: ~{results?.baseCutTime?.toFixed(1)} min/plancha.</p>
              <input type="range" min="1" max="10" value={order.complexity} onChange={(e) => setOrder({ ...order, complexity: parseInt(e.target.value) })} className="cl-input-range" />
            </div>

            <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-sm">
              <label className="block text-sm font-bold text-slate-700 mb-2">Forzar Tiempo de Diseño Personalizado</label>
              <select value={order.designType} onChange={(e) => setOrder({ ...order, designType: e.target.value as Order['designType'], ...(e.target.value === 'custom' ? { customDesignTime: config.timeDesignCustom } : {}) })} className="cl-select">
                <option value="none">Sin costo (+0 min)</option>
                <option value="basic">Armado en plancha (+{config.timeDesignBasic} min)</option>
                <option value="custom">A medida (+{order.customDesignTime} min)</option>
              </select>

              {order.designType === 'custom' && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-600">Minutos estimados de diseño</label>
                    <span className="text-sm font-bold text-amber-700">{order.customDesignTime} min</span>
                  </div>
                  <input type="range" min="5" max="120" step="5" value={order.customDesignTime} onChange={(e) => setOrder({ ...order, customDesignTime: parseInt(e.target.value) })} className="cl-input-range" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
