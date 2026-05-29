'use client';

import { createContext, useContext, type ReactNode } from 'react';

type Locale = 'es' | 'en' | 'ru' | 'uk' | 'fr' | 'de' | 'it';

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  availableLocales: Locale[];
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'es',
  setLocale: () => {},
  availableLocales: ['es'], // En MVP solo español activo
});

export function I18nProvider({ children }: { children: ReactNode }) {
  // En MVP locale fijo en 'es'
  const value: I18nContextValue = {
    locale: 'es',
    setLocale: () => {},
    availableLocales: ['es'],
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
