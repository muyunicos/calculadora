import React from 'react';
import { Trash2, ShieldCheck } from 'lucide-react';

interface DeleteModeToggleProps {
  isDeleteMode: boolean;
  onDeleteModeChange: (mode: boolean) => void;
}

export const DeleteModeToggle: React.FC<DeleteModeToggleProps> = ({
  isDeleteMode,
  onDeleteModeChange,
}) => {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onDeleteModeChange(!isDeleteMode)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all
          ${isDeleteMode 
            ? 'bg-red-500 text-white hover:bg-red-600 shadow-md' 
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-red-600'
          }
        `}
        title={isDeleteMode ? 'Desactivar modo eliminación' : 'Activar modo eliminación'}
      >
        {isDeleteMode ? (
          <>
            <ShieldCheck className="w-4 h-4" />
            <span>MODO ELIMINACIÓN ACTIVO</span>
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4" />
            <span>Activar modo eliminación</span>
          </>
        )}
      </button>
      
      {isDeleteMode && (
        <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded border border-red-200">
          Los botones de eliminación están activos
        </span>
      )}
    </div>
  );
};
