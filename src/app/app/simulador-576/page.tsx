'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PracticaIntegrada } from '@/components/modules/practica/PracticaIntegrada';

export default function Simulador576Page() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="px-5 lg:px-8 pt-6 max-w-[1400px] mx-auto">
        <Link href="/app/dashboard" className="inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-ink">
          <ChevronLeft size={14} /> Volver al centro de control
        </Link>
      </div>
      <PracticaIntegrada />
    </div>
  );
}
