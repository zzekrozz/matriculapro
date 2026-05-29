'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { FounderUpgradeModal } from '@/components/access/FounderUpgradeModal';

interface FounderModalContextValue {
  openFounderModal: () => void;
  closeFounderModal: () => void;
  isOpen: boolean;
}

const FounderModalContext = createContext<FounderModalContextValue | null>(null);

export function FounderModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <FounderModalContext.Provider value={{
      openFounderModal: () => setIsOpen(true),
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
