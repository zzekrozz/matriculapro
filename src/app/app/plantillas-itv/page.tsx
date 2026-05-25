'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Mail, AlertTriangle, Copy, Check,
  ChevronRight, Sparkles, Info
} from 'lucide-react';
import { EMAIL_TEMPLATES, type EmailTemplate } from '@/data/email-templates';

export default function PlantillasPage() {
  const [selectedId, setSelectedId] = useState<string>(EMAIL_TEMPLATES[0].id);
  const [copiedField, setCopiedField] = useState<'subject' | 'body' | 'all' | null>(null);
  const selected = EMAIL_TEMPLATES.find(t => t.id === selectedId)!;

  const copyToClipboard = async (text: string, field: 'subject' | 'body' | 'all') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // silencioso: navegadores antiguos
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-5 lg:px-8 pt-6 pb-12 max-w-[1280px] mx-auto">
        <Link href="/app/dashboard" className="mb-4 inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-ink">
          <ChevronLeft size={14} /> Volver al centro de control
        </Link>

        <header className="mb-7">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10.5px] font-mono tracking-wider text-muted">M.10</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10.5px] font-medium tracking-[0.04em] uppercase rounded-full bg-accent-soft text-accent-deep">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
              Comunicación con ITV
            </span>
          </div>
          <h1 className="font-serif text-ink leading-[1] tracking-tight" style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}>
            Plantillas para <span className="italic text-accent">ITV</span>
          </h1>
          <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed text-ink-soft">
            {EMAIL_TEMPLATES.length} emails listos para copiar. Sustituye los corchetes <span className="font-mono text-[13px] text-accent-deep">[ASÍ]</span> por tus datos y envía.
          </p>
        </header>

        {/* Layout 2 columnas: lista + detalle */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Lista */}
          <aside className="space-y-2">
            {EMAIL_TEMPLATES.map(t => {
              const isActive = t.id === selectedId;
              return (
                <button key={t.id} onClick={() => setSelectedId(t.id)}
                  className="w-full text-left rounded-xl p-3 transition-all border"
                  style={{
                    background: isActive ? 'var(--color-ink)' : 'var(--color-surface)',
                    color: isActive ? '#fff' : 'var(--color-ink)',
                    borderColor: isActive ? 'var(--color-ink)' : 'var(--color-line)',
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Mail size={12} style={{ color: isActive ? '#C8862E' : 'var(--color-muted)' }} />
                    <span className="font-mono text-[10px] tracking-wider"
                          style={{ color: isActive ? '#C8862E' : 'var(--color-muted)' }}>
                      {t.code}
                    </span>
                  </div>
                  <div className="text-[12.5px] font-medium leading-tight">{t.title}</div>
                </button>
              );
            })}
          </aside>

          {/* Detalle */}
          <AnimatePresence mode="wait">
            <motion.section
              key={selected.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="rounded-[20px] overflow-hidden bg-surface border border-line shadow-soft-md">
              {/* Encabezado */}
              <div className="p-6 lg:p-7 border-b border-line">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-[10.5px] text-muted">{selected.code}</span>
                </div>
                <h2 className="font-serif text-ink leading-[1.1] tracking-tight mb-3" style={{ fontSize: 26 }}>
                  {selected.title}
                </h2>
                <p className="text-[13px] text-ink-soft leading-relaxed">{selected.purpose}</p>
                <div className="mt-4 rounded-lg p-3 flex items-start gap-2 bg-accent-soft text-accent-deep">
                  <Info size={12} className="shrink-0 mt-0.5" />
                  <div className="text-[11.5px] leading-relaxed">
                    <strong>Cuándo usarla:</strong> {selected.when}
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div className="p-6 lg:p-7 border-b border-line">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] tracking-[0.22em] uppercase text-muted">Asunto</span>
                  <CopyButton onClick={() => copyToClipboard(selected.subject, 'subject')}
                              copied={copiedField === 'subject'} />
                </div>
                <div className="rounded-lg p-3 text-[13px] bg-bg-deep border border-line font-mono">
                  {selected.subject}
                </div>
              </div>

              {/* Body */}
              <div className="p-6 lg:p-7">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] tracking-[0.22em] uppercase text-muted">Cuerpo del email</span>
                  <CopyButton onClick={() => copyToClipboard(selected.body, 'body')}
                              copied={copiedField === 'body'} />
                </div>
                <pre className="rounded-lg p-4 text-[12.5px] bg-bg-deep border border-line whitespace-pre-wrap font-sans leading-relaxed text-ink">
{selected.body}
                </pre>

                {selected.notes && selected.notes.length > 0 && (
                  <div className="mt-5 rounded-xl p-4 bg-bg-deep border border-line">
                    <div className="flex items-center gap-1.5 mb-2 text-[10.5px] tracking-[0.22em] uppercase text-accent-deep">
                      <Sparkles size={11} /> Notas
                    </div>
                    <ul className="space-y-2">
                      {selected.notes.map((n, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-soft">
                          <ChevronRight size={11} className="shrink-0 mt-0.5 text-accent" />
                          <span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Copiar todo */}
                <div className="mt-6 flex justify-end">
                  <button onClick={() => copyToClipboard(`Asunto: ${selected.subject}\n\n${selected.body}`, 'all')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium transition-transform hover:scale-[1.02] bg-ink text-white shadow-soft-md">
                    {copiedField === 'all' ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar email completo</>}
                  </button>
                </div>
              </div>
            </motion.section>
          </AnimatePresence>
        </div>

        {/* Aviso */}
        <div className="mt-8 rounded-xl p-4 flex items-start gap-3 text-[11.5px] leading-relaxed bg-warn-soft text-warn border border-accent-soft">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>Plantillas formativas. Adáptalas a tu situación. No todas las estaciones ITV operan igual ni responden con los mismos plazos.</span>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ onClick, copied }: { onClick: () => void; copied: boolean }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
      style={{
        background: copied ? 'var(--color-ok-soft)' : 'var(--color-bg-deep)',
        color: copied ? 'var(--color-ok)' : 'var(--color-ink-soft)',
      }}>
      {copied ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
    </button>
  );
}
