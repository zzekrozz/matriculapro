'use client';

import { useEffect, useState } from 'react';

/**
 * Hook que persiste estado en localStorage de forma segura para SSR.
 * En SSR el valor inicial es el default; al hidratar se rehidrata desde localStorage.
 */
export function usePersistentState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        setValue(JSON.parse(raw) as T);
      }
    } catch {
      // silencioso
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // silencioso
    }
  }, [key, value, hydrated]);

  return [value, setValue, hydrated] as const;
}
