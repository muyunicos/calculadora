import React from 'react';
import { Clock } from 'lucide-react';
import type { Config } from '../types';

interface AdminSalaryPanelProps {
  config: Config;
  handleConfigChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AdminSalaryPanel: React.FC<AdminSalaryPanelProps> = ({
  config,
  handleConfigChange,
}) => {
  return (
    <div className="cl-card bg-white p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" /> ¿Cuánto vale tu tiempo?
          </h2>
        </div>
        <label className="flex items-center gap-2 text-sm bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors shadow-sm">
          <input type="checkbox" name="calcSalaryMode" checked={config.calcSalaryMode} onChange={handleConfigChange} className="accent-blue-600 w-4 h-4" />
          <span className="font-bold text-blue-800">Calcular según Sueldo Mensual</span>
        </label>
      </div>

      {config.calcSalaryMode ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Sueldo pretendido ($/mes)</label>
            <input type="number" name="monthlySalary" value={config.monthlySalary} onChange={handleConfigChange} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold bg-white text-lg transition-all" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Horas de trabajo a la semana</label>
            <input type="number" name="weeklyHours" value={config.weeklyHours} onChange={handleConfigChange} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold bg-white text-lg transition-all" />
          </div>
          <div className="flex flex-col justify-end">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl flex justify-between items-center shadow-md">
              <span className="text-sm font-medium text-blue-100 uppercase tracking-wider">Tu Valor Hora:</span>
              <span className="text-2xl font-black">${config.hourlyRate}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-sm bg-slate-50 p-6 rounded-xl border border-slate-200">
          <label className="block text-sm font-bold text-slate-700 mb-2">Tu Valor Hora Manual ($)</label>
          <input type="number" name="hourlyRate" value={config.hourlyRate} onChange={handleConfigChange} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold bg-white text-lg shadow-inner transition-all" />
        </div>
      )}
    </div>
  );
};
