import React from 'react';
import { Package, ShieldCheck, Users, Calculator, Settings, Save } from 'lucide-react';
import { CAN_BE_ADMIN } from '../core/wp';
import { DeleteModeToggle } from './DeleteModeToggle';
import { SaveIndicator } from './SaveIndicator';

interface CalculatorHeaderProps {
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  activeTab: 'calculator' | 'settings';
  setActiveTab: (tab: 'calculator' | 'settings') => void;
  isDeleteMode?: boolean;
  setIsDeleteMode?: (mode: boolean) => void;
  isSaving?: boolean;
  saveError?: string | null;
  hasChanges?: boolean;
  onSave?: () => void;
}

export const CalculatorHeader: React.FC<CalculatorHeaderProps> = ({
  isAdmin,
  setIsAdmin,
  activeTab,
  setActiveTab,
  isDeleteMode = false,
  setIsDeleteMode,
  isSaving = false,
  saveError = null,
  hasChanges = false,
  onSave,
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-center bg-white p-0">
      <div className="flex-1 w-full flex justify-between md:justify-start items-center">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2 m-0">
            Cotizá tu pedido
          </h1>
          {isAdmin && <p className="text-emerald-600 text-sm mt-1 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Modo Administrador Activo</p>}
        </div>

        {/* Toggle móvil para vista cliente/admin (solo admin real de WP) */}
        {CAN_BE_ADMIN && (
          <div className="md:hidden">
            <button onClick={() => setIsAdmin(!isAdmin)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-blue-600" title="Alternar Vista">
              {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 mt-4 md:mt-0">
        {/* Toggle Desktop (solo admin real de WP) */}
        {CAN_BE_ADMIN && (
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 font-medium">
            <span className={!isAdmin ? 'text-slate-800 font-bold' : ''}>Cliente</span>
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className={`w-12 h-6 rounded-full p-1 transition-colors relative ${isAdmin ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isAdmin ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
            <span className={isAdmin ? 'text-emerald-600 font-bold' : ''}>Admin</span>
          </div>
        )}

        {isAdmin && (
          <div className="flex items-center gap-3">
            {activeTab === 'settings' && (
              <>
                <SaveIndicator 
                  status={isSaving ? 'saving' : saveError ? 'error' : hasChanges ? 'dirty' : 'saved'} 
                />
                <button
                  onClick={onSave}
                  disabled={isSaving || !hasChanges}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    isSaving || !hasChanges
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                  }`}
                  title={hasChanges ? 'Guardar cambios en el servidor' : 'No hay cambios para guardar'}
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </>
            )}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setActiveTab('calculator')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'calculator' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                <Calculator className="w-4 h-4" /> Cotizador
              </button>
              <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                <Settings className="w-4 h-4" /> Admin
              </button>
            </div>
            
            {activeTab === 'settings' && setIsDeleteMode && (
              <DeleteModeToggle
                isDeleteMode={isDeleteMode}
                onDeleteModeChange={setIsDeleteMode}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};