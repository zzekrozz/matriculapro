'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { FounderUpgradeModal } from '@/components/access/FounderUpgradeModal';
import { STRIPE_FOUNDERS_URL } from '@/lib/env';

interface FounderModalContextValue {
  /** Abre el modal Founder (o redirige a Stripe en producción) */
  openFounderModal: () => void;
  /** Siempre abre el modal, aunque sea en producción (para probar) */
  openFounderModalForce: () => void;
  closeFounderModal: () => void;
  isOpen: boolean;
}

const FounderModalContext = createContext<FounderModalContextValue | null>(null);

export function FounderModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Comportamiento estándar:
   * - Producción → redirige directo a Stripe Payment Link (sin pedir login)
   * - Desarrollo  → abre el modal mock para probar la UX
   */
  const openFounderModal = useCallback(() => {
    if (process.env.NODE_ENV === 'production') {
      window.location.href = STRIPE_FOUNDERS_URL;
    } else {
      setIsOpen(true);
    }
  }, []);

  const openFounderModalForce = useCallback(() => {
    setIsOpen(true);
  }, []);

  return (
    <FounderModalContext.Provider value={{
      openFounderModal,
      openFounderModalForce,
      closeFounderModal: () => setIsOpen(false),
      isOpen,
    }}>
      {children}
      <FounderUpgradeModal open={isOpen} onClose={() => setIsOpen(false)} />
    </FounderModalContext.Provider>
  );
}

export function useFounderModal() {
  const ctx = useContext(FounderModalContext);
  if (!ctx) throw new Error('useFounderModal must be used within FounderModalProvider');
  return ctx;
}
