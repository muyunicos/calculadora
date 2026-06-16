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
    const newValue = currentValue + step;
    if (max !== undefined && newValue > max) return;
    onChange(String(newValue));
  };

  const handleDecrement = () => {
    const currentValue = parseFloat(String(value)) || 0;
    const newValue = currentValue - step;
    if (newValue < min) return;
    onChange(String(newValue));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
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
