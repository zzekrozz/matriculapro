import Link from 'next/link';
import {
  ArrowRight,
  Calculator,
  CarFront,
  Check,
  ChevronRight,
  CircleAlert,
  FileCheck2,
  Landmark,
  LockKeyhole,
  Route,
  SearchCheck,
  ShieldCheck,
  TableProperties,
  Users,
  Wrench,
} from 'lucide-react';
import { LANDING_FAQS } from '@/content/landing';
import { PublicFooter, PublicHeader } from '@/components/public/PublicChrome';
import { LandingPricing } from './LandingPricing';

const checkerFields = [
  'País y vendedor',
  'Primera matriculación',
  'Kilometraje',
  'Campo K y COC',
  'CO₂ y combustible',
  'Reformas aparentes',
];

const productSteps = [
  { icon: SearchCheck, title: '1. Comprueba', body: 'Introduce los datos y detecta ausencias, contradicciones y rutas especiales antes de pagar.' },
  { icon: Calculator, title: '2. Calcula', body: 'Con licencia activa, prepara la valoración, la minoración y las casillas fiscales con trazabilidad.' },
  { icon: Route, title: '3. Avanza', body: 'Ordena ITV, impuestos y DGT con hitos, checklist, costes y fechas del expediente.' },
];

const comparison = [
  ['Comprobaciones previas manuales', true, true, true],
  ['Catálogo Hacienda y cálculo 576', false, true, true],
  ['Seguimiento ITV, fiscal y DGT', false, true, true],
  ['Clientes, costes y márgenes', false, false, true],
  ['Informes profesionales y CSV', false, false, true],
] as const;

export default function Landing() {
  return (
    <div className="overflow-x-hidden bg-bg text-ink">
      <PublicHeader />
      <main>
        <section className="relative overflow-hidden border-b border-line bg-[radial-gradient(circle_at_80%_10%,#F5E9D4_0,transparent_32%),linear-gradient(180deg,#FFFFFF_0%,#F4F6FA_100%)] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-deep">
                <CarFront size={13} aria-hidden="true" /> Software para importar vehículos a España
              </div>
              <h1 className="mt-6 max-w-[700px] font-serif text-[48px] leading-[0.98] tracking-[-0.025em] sm:text-[64px] lg:text-[72px]">
                Comprueba antes de comprar. <span className="italic text-accent-deep">Matricula después, paso a paso.</span>
              </h1>
              <p className="mt-6 max-w-[650px] text-[16px] leading-8 text-ink-soft sm:text-[18px]">
                Analiza la documentación de un vehículo extranjero, detecta riesgos y prepara su matriculación en España con cálculos explicados y fuentes oficiales.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/registro?next=/app/comprobar" className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[14px] font-semibold text-white shadow-lg">
                  Comprobar un vehículo gratis <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <a href="#como-funciona" className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-6 py-3.5 text-[14px] font-semibold text-ink">
                  Ver cómo funciona <ChevronRight size={15} aria-hidden="true" />
                </a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted">
                <span className="flex items-center gap-1.5"><Check size={12} className="text-ok" /> Sin tarjeta</span>
                <span className="flex items-center gap-1.5"><Check size={12} className="text-ok" /> Datos introducidos manualmente</span>
                <span className="flex items-center gap-1.5"><Check size={12} className="text-ok" /> Sin OCR, IA ni subida de documentos</span>
              </div>
            </div>

            <div className="relative rounded-[30px] border border-line bg-white p-4 shadow-xl sm:p-6" aria-label="Vista de ejemplo del comprobador">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-deep">Ejemplo ilustrativo</p>
                  <p className="mt-1 text-[15px] font-semibold">Comprobación previa</p>
                </div>
                <span className="rounded-full bg-warn-soft px-3 py-1.5 text-[11px] font-semibold text-warn">Riesgo medio</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {checkerFields.map((field, index) => (
                  <div key={field} className="rounded-xl bg-bg p-3">
                    <p className="text-[10px] text-muted">{field}</p>
                    <p className="mt-1 text-[12px] font-medium">{index === 3 ? 'Pendiente de comprobar' : 'Dato introducido'}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-warn/25 bg-warn-soft p-4">
                <p className="flex items-center gap-2 text-[12px] font-semibold"><CircleAlert size={14} /> Factor principal</p>
                <p className="mt-2 text-[12px] leading-5 text-ink-soft">El campo K no coincide con la contraseña transcrita del COC. Conviene aclararlo con el vendedor y la ITV antes de comprar.</p>
              </div>
              <p className="mt-4 text-[10px] leading-5 text-muted">El resultado no es una probabilidad ni garantiza la matriculación. Los documentos no han sido inspeccionados por MatriculaPro.</p>
            </div>
          </div>
        </section>

        <section className="border-b border-line bg-ink py-8 text-white">
          <div className="mx-auto grid max-w-[1180px] gap-4 px-5 text-center sm:grid-cols-3 lg:px-8">
            <p className="text-[12px] text-[#C7D0DE]"><strong className="block text-[16px] text-white">70.931 registros</strong>Catálogo oficial 2026 preparado</p>
            <p className="text-[12px] text-[#C7D0DE]"><strong className="block text-[16px] text-white">Casillas 01–08</strong>Cálculo explicado cuando aplica</p>
            <p className="text-[12px] text-[#C7D0DE]"><strong className="block text-[16px] text-white">Fuentes versionadas</strong>BOE, AEAT, DGT e Industria</p>
          </div>
        </section>

        <section id="como-funciona" className="py-20 lg:py-28">
          <div className="mx-auto max-w-[1180px] px-5 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-deep">Cómo funciona</p>
              <h2 className="mt-3 font-serif text-[40px] leading-tight sm:text-[50px]">De una compra incierta a un expediente que puedes revisar.</h2>
              <p className="mt-4 text-[15px] leading-7 text-ink-soft">La dificultad no es encontrar un formulario. Es saber qué información falta, qué ruta corresponde y de dónde sale cada cálculo.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {productSteps.map(({ icon: Icon, title, body }) => (
                <article key={title} className="rounded-[24px] border border-line bg-white p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent-deep"><Icon size={20} /></div>
                  <h3 className="mt-5 text-[17px] font-semibold">{title}</h3>
                  <p className="mt-3 text-[13px] leading-6 text-ink-soft">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-white py-20 lg:py-24">
          <div className="mx-auto grid max-w-[1180px] gap-10 px-5 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-deep">Gratis y con valor real</p>
              <h2 className="mt-3 font-serif text-[40px] leading-tight">Comprobación previa a la compra.</h2>
              <p className="mt-4 text-[15px] leading-7 text-ink-soft">Introduce país, vendedor, fechas, kilometraje, categoría, COC, campo K, CO₂ y reformas. El sistema explica la ruta probable, contradicciones, documentos que pedir y preguntas concretas para el vendedor.</p>
              <Link href="/registro?next=/app/comprobar" className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[13px] font-semibold text-white">Crear cuenta gratis <ArrowRight size={14} /></Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {['Nuevo o usado para IVA', 'Ruta técnica preliminar', 'Nivel de riesgo detectado', 'Contradicciones visibles', 'Documentos que pedir', 'Casos especiales bloqueados'].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl bg-bg p-4 text-[13px] font-medium"><Check className="mt-0.5 shrink-0 text-ok" size={15} />{item}</div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-[1180px] px-5 lg:px-8">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-deep">Núcleo fiscal</p>
              <h2 className="mx-auto mt-3 max-w-3xl font-serif text-[40px] leading-tight sm:text-[50px]">Un cálculo que conserva el camino, no solo el resultado.</h2>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {[
                { icon: Calculator, title: 'Calculadora Modelo 576', body: 'Prepara base, reducción, epígrafe, cuota y resultado con avisos bloqueantes.', href: '/calcular-modelo-576' },
                { icon: TableProperties, title: 'Tablas de Hacienda 2026', body: 'Busca una fila concreta y conserva valor, referencia, periodo y versión oficial.', href: '/tablas-hacienda-vehiculos-2026' },
                { icon: Landmark, title: 'Minoración explicada', body: 'Reconstruye impuestos indirectos residuales con tipos históricos versionados.', href: '/minoracion-impuesto-matriculacion' },
              ].map(({ icon: Icon, title, body, href }) => (
                <Link key={title} href={href} className="group rounded-[24px] border border-line bg-white p-6 shadow-sm hover:border-accent">
                  <Icon className="text-accent-deep" size={22} />
                  <h3 className="mt-5 text-[17px] font-semibold">{title}</h3>
                  <p className="mt-3 text-[13px] leading-6 text-ink-soft">{body}</p>
                  <span className="mt-5 inline-flex items-center gap-1 text-[12px] font-semibold text-accent-deep">Leer cómo funciona <ChevronRight size={13} /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-ink py-20 text-white lg:py-24">
          <div className="mx-auto grid max-w-[1180px] gap-10 px-5 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Ruta completa</p>
              <h2 className="mt-3 font-serif text-[40px] leading-tight">ITV, impuestos y DGT en el orden del expediente.</h2>
              <p className="mt-4 text-[14px] leading-7 text-[#C7D0DE]">Los hitos no se marcan como verificados por MatriculaPro. Tú registras lo que tienes, lo que falta y lo que debe comprobar el organismo.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Wrench, title: 'ITV', text: 'COC, ficha reducida, reformas y resultado.' },
                { icon: Landmark, title: 'Impuestos', text: 'IVA, 05/06/576 e impuesto municipal.' },
                { icon: FileCheck2, title: 'DGT', text: 'Tasas, justificantes, permiso y placas.' },
              ].map(({ icon: Icon, title, text }, index) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                  <span className="text-[10px] text-accent">0{index + 1}</span><Icon className="mt-4 text-accent" size={21} />
                  <h3 className="mt-4 text-[16px] font-semibold">{title}</h3><p className="mt-2 text-[12px] leading-6 text-[#B4BECE]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-[1050px] px-5 lg:px-8">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-deep">Gratis · Particular · Profesional</p>
              <h2 className="mt-3 font-serif text-[40px] leading-tight sm:text-[50px]">El mismo rigor fiscal. Herramientas según tu uso.</h2>
            </div>
            <div className="mt-10 overflow-x-auto rounded-[24px] border border-line bg-white">
              <table className="w-full min-w-[720px] border-collapse text-[13px]">
                <thead><tr className="bg-bg-deep text-left"><th className="p-4">Función</th><th className="p-4">Gratis</th><th className="p-4">Particular</th><th className="p-4">Profesional</th></tr></thead>
                <tbody>{comparison.map(([label, free, particular, professional]) => (
                  <tr key={label} className="border-t border-line"><td className="p-4 font-medium">{label}</td>{[free, particular, professional].map((available, index) => <td key={index} className="p-4">{available ? <Check className="text-ok" size={16} aria-label="Incluido" /> : <span className="text-muted" aria-label="No incluido">—</span>}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
            <p className="mt-4 text-center text-[12px] text-muted">Profesional está pensado inicialmente para una sola persona: autónomo, compraventa, importador, gestoría pequeña o profesional del automóvil.</p>
          </div>
        </section>

        <section id="precios" className="border-y border-line bg-white py-20 lg:py-28">
          <div className="mx-auto max-w-[1180px] px-5 lg:px-8">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-deep">Precios públicos</p>
              <h2 className="mt-3 font-serif text-[40px] leading-tight sm:text-[50px]">Elige tiempo, no una renovación automática.</h2>
              <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-7 text-ink-soft">Todas las licencias son de pago único, muestran IVA incluido y conservan tus expedientes en modo lectura al vencer.</p>
              <p className="mx-auto mt-2 max-w-2xl text-[11px] leading-5 text-muted">Contratación online disponible inicialmente para clientes con dirección fiscal en España.</p>
            </div>
            <div className="mt-10"><LandingPricing /></div>
          </div>
        </section>

        <section className="py-20 lg:py-24">
          <div className="mx-auto grid max-w-[1180px] gap-5 px-5 md:grid-cols-2 lg:px-8">
            <article className="rounded-[26px] border border-line bg-white p-7">
              <ShieldCheck className="text-ok" size={24} /><h2 className="mt-5 font-serif text-[32px]">Fuentes oficiales y límites visibles.</h2>
              <p className="mt-3 text-[13px] leading-7 text-ink-soft">Las reglas enlazan BOE, AEAT, DGT e Industria e indican fecha de revisión. Si una cronología o territorio no está suficientemente acreditado, el cálculo se bloquea.</p>
              <Link href="/legal/aviso-fiscal-tecnico" className="mt-5 inline-flex items-center gap-1 text-[12px] font-semibold text-accent-deep">Ver alcance fiscal <ChevronRight size={13} /></Link>
            </article>
            <article className="rounded-[26px] border border-line bg-white p-7">
              <LockKeyhole className="text-accent-deep" size={24} /><h2 className="mt-5 font-serif text-[32px]">Privacidad sin vigilancia añadida.</h2>
              <p className="mt-3 text-[13px] leading-7 text-ink-soft">No se incorporan analítica, píxeles, grabaciones, OCR o IA. Solo cookies necesarias de sesión, seguridad y pago, descritas en un inventario público.</p>
              <Link href="/legal/cookies" className="mt-5 inline-flex items-center gap-1 text-[12px] font-semibold text-accent-deep">Consultar cookies <ChevronRight size={13} /></Link>
            </article>
          </div>
        </section>

        <section id="faq" className="border-y border-line bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-[850px] px-5 lg:px-8">
            <div className="text-center"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-deep">Preguntas frecuentes</p><h2 className="mt-3 font-serif text-[40px]">Antes de empezar.</h2></div>
            <div className="mt-9 space-y-3">{LANDING_FAQS.map(({ question, answer }) => (
              <details key={question} className="group rounded-2xl border border-line bg-bg p-5"><summary className="cursor-pointer list-none pr-6 text-[14px] font-semibold">{question}</summary><p className="mt-3 text-[13px] leading-6 text-ink-soft">{answer}</p></details>
            ))}</div>
          </div>
        </section>

        <section className="py-20 lg:py-24">
          <div className="mx-auto max-w-[1000px] px-5 lg:px-8">
            <div className="rounded-[30px] bg-[linear-gradient(135deg,#0B1F3A,#16335E)] p-8 text-center text-white shadow-xl sm:p-14">
              <Users className="mx-auto text-accent" size={26} /><h2 className="mx-auto mt-5 max-w-2xl font-serif text-[40px] leading-tight sm:text-[50px]">Comprueba el coche antes de convertirlo en un problema.</h2>
              <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-7 text-[#C7D0DE]">Crea una cuenta gratuita, introduce los datos manualmente y recibe una revisión preliminar clara. Sin tarjeta y sin ocultar riesgos críticos.</p>
              <Link href="/registro?next=/app/comprobar" className="mt-7 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-[14px] font-semibold text-ink">Comprobar un vehículo gratis <ArrowRight size={15} /></Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
