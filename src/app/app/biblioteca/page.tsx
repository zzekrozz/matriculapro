'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, FileText, AlertTriangle, X, Search,
  CheckCircle, Clock, Sparkles
} from 'lucide-react';
import { LIBRARY_DOCS, type LibraryDoc } from '@/data/library-docs';
import { tokens } from '@/lib/tokens';
import { ModuleGate } from '@/components/access/ModuleGate';

const APPLIES_BADGE: Record<LibraryDoc['applies'], { label: string; bg: string; text: string }> = {
  always:    { label: 'Siempre',     bg: 'bg-ok-soft',     text: 'text-ok' },
  sometimes: { label: 'Según caso',  bg: 'bg-accent-soft', text: 'text-accent-deep' },
  rare:      { label: 'Excepcional', bg: 'bg-warn-soft',   text: 'text-warn' },
};

export default function BibliotecaPage() {
  return (
    <ModuleGate
      requiredCapability="view_historical_paid_data"
      requiredTier="particular"
      moduleName="Biblioteca de documentos"
      moduleCode="M.09"
      description="Los 11 documentos clave del proceso de matriculación: qué es cada uno, dónde se consigue y cuándo se usa."
      icon={FileText}
    >
      <BibliotecaContent />
    </ModuleGate>
  );
}

function BibliotecaContent() {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<LibraryDoc | null>(null);

  const filtered = LIBRARY_DOCS.filter(d => {
    if (!q) return true;
    const txt = (d.title + d.code + d.description + d.phase + d.source).toLowerCase();
    return txt.includes(q.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-5 lg:px-8 pt-6 pb-12 max-w-[1280px] mx-auto">
        <Link href="/app/dashboard" className="mb-4 inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-ink">
          <ChevronLeft size={14} /> Volver al centro de control
        </Link>

        <header className="mb-7">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10.5px] font-mono tracking-wider text-muted">M.09</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10.5px] font-medium tracking-[0.04em] uppercase rounded-full bg-accent-soft text-accent-deep">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
              Referencia
            </span>
          </div>
          <h1 className="font-serif text-ink leading-[1] tracking-tight" style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}>
            Biblioteca de <span className="italic text-accent">documentos</span>
          </h1>
          <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed text-ink-soft">
            Los {LIBRARY_DOCS.length} documentos clave del proceso de matriculación. Para cada uno: qué es, en qué fase del proceso se usa, dónde se consigue y notas relevantes.
          </p>
        </header>

        {/* Search */}
        <div className="mb-6 relative max-w-[420px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar documento (COC, 576, ficha técnica…)"
            className="w-full pl-9 pr-3 py-2.5 rounded-full text-[13px] outline-none bg-surface border border-line focus:border-ink transition-colors"
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(doc => {
            const applies = APPLIES_BADGE[doc.applies];
            return (
              <button key={doc.id} onClick={() => setSelected(doc)}
                className="text-left rounded-2xl p-5 bg-surface border border-line shadow-soft-sm hover:shadow-soft-md hover:-translate-y-0.5 transition-all group flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-bg-deep text-ink shrink-0 group-hover:bg-accent group-hover:text-ink transition-colors">
                    <FileText size={16} />
                  </div>
                  <span className="font-mono text-[10.5px] text-muted">{doc.code}</span>
                </div>
                <h3 className="font-medium text-[14.5px] text-ink leading-tight mb-1">{doc.title}</h3>
                <p className="text-[12px] leading-relaxed text-ink-soft mb-3 line-clamp-2 flex-1">{doc.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[9.5px] tracking-[0.04em] uppercase font-semibold px-1.5 py-0.5 rounded ${applies.bg} ${applies.text}`}>
                    {applies.label}
                  </span>
                  <span className="text-[10.5px] text-muted flex items-center gap-1">
                    <Clock size={9} /> {doc.phase}
                  </span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-[13px] text-muted py-12">
              No hay documentos que coincidan con «{q}».
            </div>
          )}
        </div>

        {/* Aviso */}
        <div className="mt-8 rounded-xl p-4 flex items-start gap-3 text-[11.5px] leading-relaxed bg-warn-soft text-warn border border-accent-soft">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>Descripción formativa de los documentos del proceso. Tasas, plazos y trámites concretos los gestionan los organismos correspondientes.</span>
        </div>
      </div>

      {/* Modal de detalle */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(11, 31, 58, 0.6)', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ scale: 0.95, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface rounded-[20px] max-w-[640px] w-full max-h-[90vh] overflow-y-auto shadow-soft-xl border border-line">
              <div className="p-6 lg:p-8">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-accent text-ink shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="font-mono text-[10.5px] text-muted mb-0.5">{selected.code}</div>
                      <h2 className="font-serif text-ink leading-[1.1] tracking-tight" style={{ fontSize: 24 }}>
                        {selected.title}
                      </h2>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} aria-label="Cerrar"
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-bg-deep transition-colors">
                    <X size={14} className="text-muted" />
                  </button>
                </div>
                <p className="text-[13.5px] leading-relaxed text-ink-soft mb-5">{selected.description}</p>

                <div className="space-y-3">
                  <DetailRow label="Cuándo se usa" value={selected.phase} />
                  <DetailRow label="Dónde se consigue" value={selected.source} />
                  <DetailRow label="Frecuencia de uso" value={APPLIES_BADGE[selected.applies].label} />
                </div>

                {selected.notes && selected.notes.length > 0 && (
                  <div className="mt-5 rounded-xl p-4 bg-bg-deep border border-line">
                    <div className="flex items-center gap-1.5 mb-2 text-[10.5px] tracking-[0.22em] uppercase text-accent-deep">
                      <Sparkles size={11} /> Notas
                    </div>
                    <ul className="space-y-2">
                      {selected.notes.map((n, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-soft">
                          <CheckCircle size={11} className="shrink-0 mt-0.5 text-accent" />
                          <span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-[10.5px] tracking-[0.18em] uppercase text-muted w-[140px] shrink-0">{label}</span>
      <span className="text-[13px] text-ink">{value}</span>
    </div>
  );
}
