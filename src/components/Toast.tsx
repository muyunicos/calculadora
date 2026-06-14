import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Toast, ToastType } from './ToastProvider';

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const toastStyles: Record<ToastType, { bg: string; icon: any; textColor: string }> = {
  success: {
    bg: 'bg-emerald-50 border-emerald-200',
    icon: CheckCircle2,
    textColor: 'text-emerald-800',
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    icon: XCircle,
    textColor: 'text-red-800',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    icon: AlertTriangle,
    textColor: 'text-amber-800',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    icon: Info,
    textColor: 'text-blue-800',
  },
};

export const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const { bg, icon: Icon, textColor } = toastStyles[toast.type];

  useEffect(() => {
    // Auto-remove after duration (handled by ToastProvider, but this is a backup)
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
        ${bg} ${textColor}
        animate-in slide-in-from-right-10 fade-in duration-300
      `}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 hover:bg-black/10 rounded-full transition-colors"
        title="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = require('./ToastProvider').useToast();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <div className="pointer-events-auto flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </div>
  );
};
