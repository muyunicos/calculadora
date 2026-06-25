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
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  className = '',
  disabled = false,
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
