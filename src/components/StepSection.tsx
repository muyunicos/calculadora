import React from 'react';
import { CheckCircle2, ChevronDown } from 'lucide-react';

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
const StepSection: React.FC<StepSectionProps> = ({ index, title, summary, isOpen, isDone, onOpen, children }) => {
  const badge = isDone && !isOpen
    ? 'bg-emerald-100 text-emerald-700'
    : isOpen
      ? 'bg-blue-600 text-white'
      : 'bg-slate-100 text-slate-400';

  return (
    <div className={`bg-white rounded-2xl shadow-sm border transition-colors ${isOpen ? 'border-blue-300' : 'border-slate-200'}`}>
      <button
        type="button"
        onClick={onOpen}
        className="w-full flex items-center gap-3 p-5 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-2xl"
        aria-expanded={isOpen}
      >
        <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold flex-shrink-0 ${badge}`}>
          {isDone && !isOpen ? <CheckCircle2 className="w-4 h-4" /> : index}
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block font-bold ${isOpen || isDone ? 'text-slate-800' : 'text-slate-400'}`}>{title}</span>
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

      {isOpen && <div className="px-6 pb-6 pt-1">{children}</div>}
    </div>
  );
};

export default StepSection;
