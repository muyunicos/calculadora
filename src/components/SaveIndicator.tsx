import React from 'react';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveIndicatorProps {
  status: SaveStatus;
  className?: string;
}

export const SaveIndicator: React.FC<SaveIndicatorProps> = ({ status, className = '' }) => {
  const statusConfig: Record<
    SaveStatus,
    { icon: any; text: string; color: string; bgColor: string }
  > = {
    idle: {
      icon: Clock,
      text: 'Sin cambios',
      color: 'text-slate-500',
      bgColor: 'bg-slate-100',
    },
    saving: {
      icon: Loader2,
      text: 'Guardando...',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    saved: {
      icon: CheckCircle2,
      text: 'Guardado',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    error: {
      icon: XCircle,
      text: 'Error al guardar',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  };

  const { icon: Icon, text, color, bgColor } = statusConfig[status];

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
        ${bgColor} ${color}
        ${className}
      `}
    >
      {status === 'saving' && (
        <Icon className="w-4 h-4 animate-spin" />
      )}
      {status !== 'saving' && (
        <Icon className="w-4 h-4" />
      )}
      <span>{text}</span>
    </div>
  );
};
