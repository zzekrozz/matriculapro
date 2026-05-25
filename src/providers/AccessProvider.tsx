'use client';

import { createContext, useContext, type ReactNode } from 'react';

interface AccessContextValue {
  hasCourse: boolean;
  hasPremium: boolean;
  isAuthenticated: boolean;
  // En producción esto vendrá de Supabase Auth + verificación de compra Stripe
}

const AccessContext = createContext<AccessContextValue>({
  hasCourse: true,    // MVP: simulamos curso comprado
  hasPremium: false,
  isAuthenticated: true,
});

export function AccessProvider({ children }: { children: ReactNode }) {
  // Placeholder: en producción aquí va Supabase + verificación
  const value: AccessContextValue = {
    hasCourse: true,
    hasPremium: false,
    isAuthenticated: true,
  };

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export const useAccess = () => useContext(AccessContext);
