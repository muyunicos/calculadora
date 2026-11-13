import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface NumberInputProps {
  value: string | number;
  onChange: (value: string) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
  // Si es false, el valor crudo persiste al perder el foco (no se recorta a min/max).
  clampOnBlur?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  className = '',
  disabled = false,
  clampOnBlur = true,
}) => {
  const handleIncrement = () => {
    const currentValue = parseFloat(String(value)) || 0;
    const newValue = parseFloat((currentValue + step).toFixed(1));
    if (max !== undefined && newValue > max) {
      // Si el nuevo valor excede el máximo, usar el máximo
      onChange(String(max));
      return;
    }
    onChange(String(newValue));
  };

  const handleDecrement = () => {
    const currentValue = parseFloat(String(value)) || 0;
    const newValue = parseFloat((currentValue - step).toFixed(1));
    if (newValue < min) {
      // Si el nuevo valor es menor al mínimo, usar el mínimo
      onChange(String(min));
      return;
    }
    onChange(String(newValue));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Permitir el valor tal cual viene, no validar aquí
    onChange(inputValue);
  };

  // Al salir del campo se recorta al rango: antes se podía dejar 0 (o negativo)
  // en campos con min=1 y el pedido quedaba incompleto sin explicación.
  const handleBlur = () => {
    if (!clampOnBlur) return;
    const parsed = parseFloat(String(value));
    if (!Number.isFinite(parsed)) {
      onChange(String(min));
      return;
    }
    const upper = max ?? Number.MAX_SAFE_INTEGER;
    const clamped = Math.min(upper, Math.max(min, parsed));
    if (clamped !== parsed) onChange(String(clamped));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement();
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || (parseFloat(String(value)) || 0) <= min}
        className="cl-number-input-btn"
        aria-label="Disminuir"
      >
        <Minus className="w-4 h-4" />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`cl-input-number text-center p-0 ${className}`}
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || (max !== undefined && (parseFloat(String(value)) || 0) >= max)}
        className="cl-number-input-btn"
        aria-label="Aumentar"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};
