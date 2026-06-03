import Link from 'next/link';
import { ChevronLeft, AlertTriangle } from 'lucide-react';

export default function AvisoFormativoPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="px-5 lg:px-8 pt-6 pb-12 max-w-[820px] mx-auto">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-ink">
          <ChevronLeft size={14} /> Volver
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-warn-soft text-warn">
            <AlertTriangle size={18} />
          </div>
          <span className="text-[10.5px] tracking-[0.22em] uppercase text-accent-deep">Aviso formativo</span>
        </div>

        <h1 className="font-serif text-[40px] lg:text-[52px] leading-[1] tracking-tight text-ink">
          No sustituimos a <span className="italic text-accent">nadie</span>.
        </h1>

        <div className="mt-8 prose prose-lg max-w-none">
          <p className="text-[15px] leading-relaxed text-ink-soft">
            MatriculaPRO es una herramienta interactiva de carácter práctico y orientativo. Te ayuda a entender el proceso de matriculación de vehículos en España y a practicar con escenarios cercanos a la realidad, pero <strong className="text-ink">no sustituye en ningún caso</strong>:
          </p>
          <ul className="mt-4 space-y-2 text-[14px] text-ink-soft">
            <li>• A la <strong>ITV oficial</strong> ni a la decisión técnica de sus inspectores.</li>
            <li>• A la <strong>Dirección General de Tráfico (DGT)</strong> ni a sus trámites administrativos.</li>
            <li>• A la <strong>Agencia Tributaria</strong>, sus impuestos, ni a la presentación real del Modelo 576.</li>
            <li>• A una <strong>gestoría administrativa</strong> ni a un asesor fiscal cualificado.</li>
            <li>• A un <strong>ingeniero industrial</strong> u homologador en caso de reformas.</li>
            <li>• Al <strong>fabricante</strong> o concesionario en lo relativo a la documentación del vehículo.</li>
          </ul>
          <p className="mt-6 text-[14px] leading-relaxed text-ink-soft">
            El simulador del Modelo 576 es educativo y no calcula el impuesto real. Las cifras y los resultados son orientativos. Si tu caso incluye reformas, datos dudosos o documentación incompleta, te indicamos cuándo parar y consultar con el profesional adecuado.
          </p>
          <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
            La validación final del proceso corresponde siempre al organismo competente.
          </p>
        </div>
      </div>
    </div>
  );
}
