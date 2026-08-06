'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
import {
  formatRenewalWindowOpenEs,
  isWithinRenewalWindow,
  type LicenseDuration,
  type PaidAccessTier,
} from '@/domain/access';
import {
  formatEuroCents,
  PLAN_PRICES,
  splitVatInclusiveCents,
} from '@/lib/payments/catalog';
import { useAccess } from '@/providers/AccessProvider';

const DURATIONS: Array<{ value: LicenseDuration; label: string; note: string }> = [
  { value: 'one_month', label: '1 mes', note: 'Para una operación puntual.' },
  { value: 'six_months', label: '6 meses', note: 'Recomendado para comparar y completar el proceso.' },
  { value: 'twelve_months', label: '12 meses', note: 'Mejor precio mensual para todo el año.' },
];

export function PlanSelector() {
  const access = useAccess();
  const [tier, setTier] = useState<PaidAccessTier>(access.tier === 'professional' ? 'professional' : 'particular');
  const [selected, setSelected] = useState<LicenseDuration>('six_months');
  const [contract, setContract] = useState(false);
  const [performance, setPerformance] = useState(false);
  const [withdrawal, setWithdrawal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkoutAttempt = useRef<{ signature: string; key: string } | null>(null);
  const upgradeDeadline = useMemo(() => {
    if (access.mode !== 'full' || access.license?.duration !== 'one_month' || !access.license.startsAt || access.license.tier !== tier) return null;
    return new Date(new Date(access.license.startsAt).getTime() + 15 * 24 * 60 * 60 * 1_000);
  }, [access.license, access.mode, tier]);
  const canUseCredit = Boolean(upgradeDeadline && upgradeDeadline.getTime() >= Date.now() && selected !== 'one_month');
  const sourceLicenseId = canUseCredit ? access.license?.id ?? null : null;
  const renewalWindowOpen = Boolean(
    access.license?.expiresAt
    && access.license.tier === tier
    && (
      (access.mode === 'full'
        && isWithinRenewalWindow(new Date(), access.license.expiresAt))
      || (access.mode === 'read_only' && ['active', 'expired'].includes(access.license.status))
    )
    && !access.scheduledLicense,
  );
  const renewalOfLicenseId = !canUseCredit && renewalWindowOpen ? access.license?.id ?? null : null;
  const purchaseKind = sourceLicenseId ? 'upgrade' : renewalOfLicenseId ? 'renewal' : 'new';
  const activeSelectionRequiresExpiry = access.mode === 'full' && !canUseCredit && !renewalOfLicenseId;
  const renewalOpensLabel = access.license?.expiresAt
    ? formatRenewalWindowOpenEs(access.license.expiresAt)
    : null;
  const initialCredit = tier === 'particular' ? 7_900 : 12_900;
  const selectedPrice = PLAN_PRICES[tier][selected];
  const displayedDue = selectedPrice.totalCents - (canUseCredit ? initialCredit : 0);
  const dueTax = splitVatInclusiveCents(displayedDue, selectedPrice.vatRateBasisPoints);

  const checkout = async () => {
    if (busy || activeSelectionRequiresExpiry) return;
    setBusy(true);
    setError(null);
    try {
      const attemptSignature = `${tier}:${selected}:${purchaseKind}:${sourceLicenseId ?? renewalOfLicenseId ?? 'new'}`;
      if (!checkoutAttempt.current || checkoutAttempt.current.signature !== attemptSignature) {
        checkoutAttempt.current = {
          signature: attemptSignature,
          key: crypto.randomUUID().replaceAll('-', ''),
        };
      }
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          duration: selected,
          countryCode: 'ES',
          idempotencyKey: checkoutAttempt.current.key,
          purchaseKind,
          sourceLicenseId,
          renewalOfLicenseId,
          acceptedContractTerms: contract,
          acceptedImmediatePerformance: performance,
          acknowledgedWithdrawalRules: withdrawal,
        }),
      });
      const payload = await response.json() as { ok?: boolean; checkoutUrl?: string; message?: string };
      if (!response.ok || !payload.ok || !payload.checkoutUrl) {
        throw new Error(payload.message || 'No se ha podido abrir Stripe Checkout.');
      }
      window.location.assign(payload.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido abrir Stripe Checkout.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="mx-auto max-w-[1080px] px-5 pb-16 pt-8 lg:px-8">
    <header className="max-w-3xl">
      <div className="text-[9.5px] uppercase tracking-[.2em] text-accent-deep">Licencias de pago único</div>
      <h1 className="mt-2 font-serif text-[40px] leading-tight">Elige tiempo y tipo de uso</h1>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">Sin renovación automática y sin límite comercial de vehículos durante la licencia. Stripe permanece en modo de prueba hasta que el propietario complete la configuración y revisión.</p>
    </header>

    <div className="mt-7 inline-flex rounded-full bg-bg-deep p-1">
      {(['particular', 'professional'] as const).map((value) => <button key={value} type="button" onClick={() => setTier(value)} className={`rounded-full px-5 py-2 text-[12px] font-medium ${tier === value ? 'bg-ink text-white' : 'text-ink-soft'}`}>{value === 'particular' ? 'Particular' : 'Profesional'}</button>)}
    </div>

    {canUseCredit && upgradeDeadline && <div className="mt-5 rounded-xl border border-ok/20 bg-ok-soft p-4 text-[11.5px] text-ok"><strong>Ampliación disponible.</strong> Amplía antes del {upgradeDeadline.toLocaleString('es-ES')} y descontaremos íntegramente lo que ya pagaste. La nueva fecha final se calcula desde el inicio original.</div>}
    {renewalOfLicenseId && <div className="mt-5 rounded-xl border border-ok/20 bg-ok-soft p-4 text-[11.5px] text-ok"><strong>Renovación disponible.</strong> Se cobra el precio completo y el nuevo periodo comienza exactamente cuando termina el actual, sin perder días. No hay renovación automática.</div>}
    {activeSelectionRequiresExpiry && <div className="mt-5 rounded-xl border border-line bg-bg p-4 text-[11.5px] leading-relaxed text-ink-soft">Tu licencia actual sigue activa. La renovación manual se abre durante sus últimos 30 días civiles{renewalOpensLabel ? <>: <strong> puedes renovar desde {renewalOpensLabel}</strong></> : null}. Antes, una licencia inicial de un mes solo puede ampliarse dentro del plazo promocional de 15 días.</div>}

    <section className="mt-5 grid gap-4 md:grid-cols-3">
      {DURATIONS.map((duration) => {
        const price = PLAN_PRICES[tier][duration.value];
        const active = selected === duration.value;
        return <button key={duration.value} type="button" onClick={() => setSelected(duration.value)} className={`rounded-[20px] border p-5 text-left transition ${active ? 'border-accent bg-accent-soft shadow-soft-md' : 'border-line bg-surface hover:border-accent/50'}`}>
          <div className="flex items-center justify-between gap-3"><span className="font-serif text-[25px]">{duration.label}</span>{active && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white"><Check size={13} /></span>}</div>
          <div className="mt-4 font-serif text-[34px]">{formatEuroCents(price.totalCents)}</div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-ink-soft">{duration.note}</p>
          <div className="mt-4 space-y-1 text-[9.5px] text-muted"><div>IVA incluido</div><div>Pago único</div><div>Sin renovación automática</div></div>
        </button>;
      })}
    </section>

    <section className="mt-6 rounded-[20px] border border-line bg-surface p-5">
      <div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-accent-deep" /><div><h2 className="font-serif text-[22px]">Confirmación antes de Stripe</h2><p className="mt-1 text-[10.5px] leading-relaxed text-muted">El precio, el crédito y los impuestos se recalculan en servidor. La licencia solo se activa tras autenticar la firma del webhook.</p></div></div>

      <div className="mt-4 grid gap-2 rounded-2xl bg-bg p-4 text-[10.5px] sm:grid-cols-2 lg:grid-cols-3" aria-label="Desglose fiscal del precio">
        <PriceLine label="Nivel y duración" value={`${tier === 'particular' ? 'Particular' : 'Profesional'} · ${DURATIONS.find((item) => item.value === selected)?.label}`} />
        <PriceLine label="País fiscal" value="España (ES)" />
        <PriceLine label="Moneda" value="EUR" />
        <PriceLine label="Base imponible" value={formatEuroCents(dueTax.baseCents)} />
        <PriceLine label={`IVA (${selectedPrice.vatRateBasisPoints / 100} %)`} value={formatEuroCents(dueTax.vatCents)} />
        <PriceLine label="Total a pagar" value={formatEuroCents(displayedDue)} strong />
        {canUseCredit && <PriceLine label="Precio antes del crédito" value={formatEuroCents(selectedPrice.totalCents)} />}
        {canUseCredit && <PriceLine label="Crédito de ampliación" value={`−${formatEuroCents(initialCredit)}`} />}
      </div>
      <p className="mt-2 text-[9.5px] leading-relaxed text-muted">IVA incluido. Configuración fiscal inicial revisada únicamente para España; otras jurisdicciones quedan bloqueadas.</p>
      <p className="mt-1 text-[9.5px] leading-relaxed text-muted">Contratación online disponible inicialmente para clientes con dirección fiscal en España.</p>

      <div className="mt-4 space-y-3">
        <Acceptance checked={contract} onChange={setContract}>Acepto las <Link href="/legal/condiciones-contratacion" target="_blank" className="underline">condiciones de contratación</Link>.</Acceptance>
        <Acceptance checked={performance} onChange={setPerformance}>Solicito el inicio inmediato del acceso digital después de confirmarse el pago.</Acceptance>
        <Acceptance checked={withdrawal} onChange={setWithdrawal}>He leído la información sobre <Link href="/legal/desistimiento" target="_blank" className="underline">desistimiento</Link> y entiendo que su aplicación depende del supuesto y de la revisión legal pendiente.</Acceptance>
      </div>
      {error && <div role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-[11.5px] text-danger">{error}</div>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><div><div className="text-[9px] uppercase tracking-[.14em] text-muted">Importe previsto ahora</div><div className="mt-1 font-serif text-[29px]">{formatEuroCents(displayedDue)}</div>{canUseCredit && <div className="text-[9.5px] text-ok">Crédito aplicado: {formatEuroCents(initialCredit)}</div>}</div><button type="button" disabled={busy || activeSelectionRequiresExpiry || !contract || !performance || !withdrawal} onClick={() => void checkout()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-[12.5px] font-medium text-white disabled:opacity-45">{busy ? <><Loader2 size={14} className="animate-spin" /> Preparando…</> : activeSelectionRequiresExpiry ? 'Disponible al vencer' : 'Continuar a Stripe de prueba'}</button></div>
    </section>
  </div>;
}

function PriceLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div><div className="text-[8.5px] uppercase tracking-[.12em] text-muted">{label}</div><div className={`mt-1 ${strong ? 'font-semibold text-ink' : 'text-ink-soft'}`}>{value}</div></div>;
}

function Acceptance({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: React.ReactNode }) {
  return <label className="flex items-start gap-2.5 text-[10.5px] leading-relaxed text-ink-soft"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#C8862E]" />{children}</label>;
}
