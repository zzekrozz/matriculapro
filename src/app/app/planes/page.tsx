import Link from 'next/link';
import { PlanSelector } from '@/components/payments/PlanSelector';
import { isPublicBetaEnabled } from '@/config/public-beta';

export default function PlansPage() {
  if (!isPublicBetaEnabled()) return <PlanSelector />;
  return <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:px-8">
    <div className="text-[10px] font-semibold uppercase tracking-[.2em] text-accent-deep">MatriculaPro Beta</div>
    <h1 className="mt-3 font-serif text-[42px] leading-tight text-ink">Todas las herramientas están abiertas.</h1>
    <p className="mx-auto mt-4 max-w-2xl text-[13px] leading-7 text-ink-soft">Durante esta fase no necesitas comprar, elegir una licencia ni crear una cuenta. Inicia un expediente y utiliza las funciones particulares y profesionales directamente.</p>
    <Link href="/app/expedientes/nuevo" className="mt-7 inline-flex rounded-full bg-ink px-6 py-3 text-[13px] font-semibold text-white">Crear un expediente</Link>
  </div>;
}
