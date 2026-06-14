import { useState, useEffect, useRef, useCallback } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveProps {
  data: any;
  onSave: (data: any) => Promise<void> | void;
  delay?: number; // milisegundos de debounce
  enabled?: boolean;
}

export const useAutoSave = ({
  data,
  onSave,
  delay = 2000,
  enabled = true,
}: UseAutoSaveProps) => {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<any>(null);

  const save = useCallback(async (dataToSave: any) => {
    setStatus('saving');
    try {
      await onSave(dataToSave);
      setStatus('saved');
      // Reset to idle after 2 seconds
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving data:', error);
      setStatus('error');
      // Reset to idle after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [onSave]);

  useEffect(() => {
    if (!enabled) return;

    // Check if data has actually changed
    if (JSON.stringify(data) === JSON.stringify(lastDataRef.current)) {
      return;
    }

    lastDataRef.current = data;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      save(data);
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, save]);

  const manualSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    save(data);
  }, [data, save]);

  return {
    status,
    manualSave,
  };
};
