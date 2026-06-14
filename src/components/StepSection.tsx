import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { CheckCircle2, ChevronDown } from 'lucide-react';

export interface StepSectionRef {
  scrollTo: () => void;
}

interface StepSectionProps {
  index: number;
  title: string;
  summary?: string;   // Resumen que se muestra cuando el paso está colapsado y ya fue completado.
  isOpen: boolean;
  isDone: boolean;    // Paso anterior al actual (ya visitado).
  onOpen: () => void;
  children: React.ReactNode;
}

// Paso de un acordeón guiado: solo uno abierto a la vez. Los completados se
// colapsan mostrando un resumen + "Editar"; los futuros quedan atenuados.
const StepSection = forwardRef<StepSectionRef, StepSectionProps>(({ index, title, summary, isOpen, isDone, onOpen, children }, ref) => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    scrollTo: () => {
      if (sectionRef.current) {
        const offset = 80; // Offset para header móvil
        const elementPosition = sectionRef.current.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
  }));

  const badge = isDone && !isOpen
    ? 'bg-emerald-100 text-emerald-700'
    : isOpen
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
      : 'bg-slate-100 text-slate-400';

  return (
    <div 
      ref={sectionRef}
      className={`cl-section ${isOpen ? 'cl-section-active' : ''} transition-all duration-300 mb-4`}
    >
      <button
        type="button"
        onClick={onOpen}
        className={`w-full flex items-center gap-3 p-4 sm:p-5 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-2xl transition-all duration-300 ${isOpen ? 'bg-white shadow-md' : 'bg-white hover:shadow-sm'}`}
        aria-expanded={isOpen}
      >
        <span className={`w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-sm font-bold flex-shrink-0 ${badge} transition-all duration-300`}>
          {isDone && !isOpen ? <CheckCircle2 className="w-4 h-4" /> : index}
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block font-bold text-sm sm:text-base ${isOpen || isDone ? 'text-slate-800' : 'text-slate-400'}`}>{title}</span>
          {!isOpen && isDone && summary && (
            <span className="block text-xs text-slate-500 mt-0.5 truncate">{summary}</span>
          )}
        </span>
        {!isOpen && isDone && (
          <span className="text-xs font-semibold text-blue-600 flex-shrink-0">Editar</span>
        )}
        {!isOpen && !isDone && (
          <ChevronDown className="w-4 h-4 text-slate-300 flex-shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 sm:px-6 pb-6 pt-1 animate-in slide-in-from-top-2 duration-300">
          {children}
        </div>
      )}
    </div>
  );
});

StepSection.displayName = 'StepSection';

export default StepSection;
