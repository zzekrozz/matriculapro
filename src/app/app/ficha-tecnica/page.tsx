'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, X, Lock, Sparkles, AlertTriangle, ScrollText } from 'lucide-react';
import { TechnicalCard3D } from '@/components/modules/ficha/TechnicalCard3D';
import { DEMO_VEHICLE, DEMO_ACTIVE_FIELDS } from '@/data/demo-vehicle';
import { ModuleGate } from '@/components/access/ModuleGate';

export default function FichaTecnicaPage() {
  return (
    <ModuleGate
      requiresFounder
      moduleName="Ficha técnica 3D"
      moduleCode="M.03"
      description="Documento técnico vivo con tilt, glow, flip y campos clicables. Aprende a leer una ficha europea sin memorizar los códigos."
      icon={ScrollText}
    >
      <FichaContent />
    </ModuleGate>
  );
}

function FichaContent() {
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const selectedData = selectedField ? DEMO_VEHICLE.fields[selectedField] : null;
  const isLocked = selectedField ? !(DEMO_ACTIVE_FIELDS as readonly string[]).includes(selectedField) : false;

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-5 lg:px-8 pt-6 pb-12 max-w-[1100px] mx-auto">
        <Link href="/app/dashboard" className="mb-5 inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-ink">
          <ChevronLeft size={14} /> Volver al centro de control
        </Link>

        <div className="mb-7">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10.5px] font-mono text-muted tracking-wider">M.03</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10.5px] font-medium tracking-[0.04em] uppercase rounded-full bg-accent-soft text-accent-deep">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
              Documento interactivo
            </span>
          </div>
          <h1 className="font-serif text-ink leading-[1] tracking-tight" style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}>
            Ficha técnica <span className="italic text-accent">3D</span>
          </h1>
          <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed text-ink-soft">
            Aprende a leer una ficha técnica europea sin tener que memorizar los códigos. Mueve el ratón para inclinar el documento, púlsalo para girarlo, y haz clic en cualquier campo para entender qué significa.
          </p>
        </div>

        <div className="rounded-[20px] p-6 lg:p-10 bg-surface border border-line shadow-soft-md">
          <TechnicalCard3D
            vehicle={DEMO_VEHICLE}
            selectedField={selectedField}
            onFieldClick={setSelectedField}
          />

          <AnimatePresence mode="wait">
            {selectedField && selectedData && (
              <motion.div
                key={selectedField}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="mt-6 rounded-xl p-4 bg-bg-deep border border-line"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-accent text-ink">
                    {selectedField}
                  </span>
                  <span className="text-[12px] font-medium text-ink">{selectedData.label}</span>
                  <button onClick={() => setSelectedField(null)} aria-label="Cerrar" className="ml-auto">
                    <X size={12} className="text-muted" />
                  </button>
                </div>
                <p className="text-[12.5px] leading-relaxed text-ink-soft">{selectedData.hint}</p>
                {isLocked && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-[10.5px] text-accent-deep">
                    <Lock size={10} /> Este campo está bloqueado en la demo del simulador.
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-line flex items-baseline gap-2">
                  <span className="text-[10px] tracking-[0.18em] uppercase text-muted">Valor</span>
                  <span className="font-mono text-[13px] text-ink font-medium">{selectedData.value}</span>
                  {selectedData.unit && <span className="text-[10px] text-muted">{selectedData.unit}</span>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Link href="/app/simulador-576"
          className="mt-6 block rounded-[20px] p-5 lg:p-6 relative overflow-hidden hover:shadow-soft-md transition-shadow"
          style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #16335E 100%)', color: '#fff' }}>
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-30 blur-3xl bg-accent" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-accent text-ink">
              <Sparkles size={18} />
            </div>
            <div className="flex-1">
              <div className="text-[10.5px] tracking-[0.22em] uppercase mb-1 text-accent">Siguiente paso</div>
              <div className="text-[15px] font-medium" style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic' }}>
                Practica copiando estos datos al Modelo 576 →
              </div>
              <div className="mt-1 text-[12px] text-muted-soft">
                Ahora que conoces los códigos, ve al simulador y aprende a rellenar el formulario.
              </div>
            </div>
          </div>
        </Link>

        <div className="mt-5 rounded-xl p-4 flex items-start gap-3 text-[11.5px] leading-relaxed bg-warn-soft text-warn border border-accent-soft">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>Ficha simulada con fines formativos. Los datos no corresponden a un vehículo real.</span>
        </div>
      </div>
    </div>
  );
}
