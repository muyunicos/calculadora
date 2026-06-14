import React from 'react';
import { Info, CheckCircle2, ChevronUp, ChevronDown } from 'lucide-react';
import type { Material } from '../types';
import StepSection, { StepSectionRef } from './StepSection';
import OptionInfoPanel from './OptionInfoPanel';

interface MaterialSelectorProps {
  materials: Material[];
  materialId: string;
  showAllMaterials: boolean;
  expandedMaterialId: string | null;
  infoBtnClass: (active: boolean) => string;
  selectMaterial: (id: string) => void;
  setShowAllMaterials: (show: boolean) => void;
  setExpandedMaterialId: (id: string | null) => void;
  resolveImage: (src: string) => string;
  activeStep: 1 | 2 | 3;
  onStepOpen?: () => void;
  onNavigateToNext?: () => void;
}

export const MaterialSelector: React.FC<MaterialSelectorProps> = ({
  materials,
  materialId,
  showAllMaterials,
  expandedMaterialId,
  infoBtnClass,
  selectMaterial,
  setShowAllMaterials,
  setExpandedMaterialId,
  resolveImage,
  activeStep,
  onStepOpen,
  onNavigateToNext,
}) => {
  const stepRef = React.useRef<StepSectionRef>(null);
  const materialName = materials?.find((m) => m.id === materialId)?.name ?? '';
  const isOpen = activeStep === 1;
  const isDone = !!materialId;

  // Scroll automático cuando se abre este paso
  React.useEffect(() => {
    if (isOpen && stepRef.current) {
      stepRef.current.scrollTo();
    }
  }, [isOpen]);

  return (
    <StepSection
      ref={stepRef}
      index={1}
      title="Elegí el material"
      summary={materialName}
      isOpen={isOpen}
      isDone={isDone}
      onOpen={() => onStepOpen?.()}
    >
      <p className="text-sm text-slate-500 mb-4">Tocá la <Info className="inline w-3.5 h-3.5 -mt-0.5" /> para conocer más sobre cada material.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {(showAllMaterials ? materials : materials.slice(0, 2)).filter((m) => m.visible !== false).map((m) => {
          const selected = materialId === m.id;
          return (
            <div key={m.id} className="relative">
              <button onClick={() => selectMaterial(m.id)}
                className={`w-full h-full cl-option-card p-4 sm:p-5 ${selected ? 'cl-option-card-selected' : ''}`}>
                <div className="flex items-start gap-2 pr-8">
                  {selected && <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                  <span className="font-bold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors text-sm sm:text-base">{m.name}</span>
                </div>
              </button>
              {(m.description || m.image) && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExpandedMaterialId(expandedMaterialId === m.id ? null : m.id); }}
                  className={infoBtnClass(expandedMaterialId === m.id)}
                  title="Más info"
                  aria-label={`Más info sobre ${m.name}`}
                >
                  <Info className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Motor de info: panel "MÁS INFO" del material (desplegado por la (i),
          o hint colapsado para el material elegido si tiene info). */}
      {(() => {
        const expanded = expandedMaterialId ? materials.find((m) => m.id === expandedMaterialId) : null;
        const selectedM = materials.find((m) => m.id === materialId);
        const subject = expanded ?? (selectedM && (selectedM.description || selectedM.image) ? selectedM : null);
        if (!subject) return null;
        return (
          <OptionInfoPanel
            option={{ name: subject.name, description: subject.description, image: subject.image }}
            isOpen={!!expanded && expanded.id === subject.id}
            onToggle={() => setExpandedMaterialId(expandedMaterialId === subject.id ? null : subject.id)}
            resolveImage={resolveImage}
          />
        );
      })()}

      {materials.length > 2 && (
        <button
          onClick={() => setShowAllMaterials(!showAllMaterials)}
          className="mt-4 w-full py-3 sm:py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 active:bg-slate-100"
        >
          {showAllMaterials ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showAllMaterials ? 'Ocultar materiales extra' : `Ver más opciones (${materials.length - 2})`}
        </button>
      )}

      <div className="mt-6 flex justify-end">
        <button 
          type="button" 
          onClick={onNavigateToNext}
          disabled={!materialId}
          className="cl-button-primary-small disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuar
        </button>
      </div>
    </StepSection>
  );
};
