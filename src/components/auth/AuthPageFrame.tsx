import Link from 'next/link';

export function AuthPageFrame({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-8"><div className="w-full max-w-[460px]"><div className="mb-7 text-center"><Link href="/" className="inline-flex items-baseline gap-1.5"><span className="text-[9px] uppercase tracking-[0.2em] text-muted">IvanImports ·</span><span className="font-serif text-[25px] italic text-ink">Matricula</span><span className="text-[10px] font-semibold text-accent">PRO</span></Link></div><section className="rounded-[22px] border border-line bg-surface p-5 shadow-soft-md sm:p-8"><h1 className="font-serif text-[30px] leading-tight text-ink">{title}</h1><p className="mb-6 mt-2 text-[12.5px] leading-relaxed text-ink-soft">{description}</p>{children}</section></div></main>;
}

