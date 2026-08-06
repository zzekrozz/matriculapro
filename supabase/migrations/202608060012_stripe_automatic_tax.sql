-- MatriculaPro: replace the operational manual Spanish Tax Rate with Stripe Tax.
-- Additive migration; historical migrations and legacy paid evidence stay immutable.
-- Reviewed: 2026-08-06

alter table public.purchases
  add column automatic_tax_status text;

update public.purchases
set expected_stripe_tax_rate_id = null
where status = 'pending' and applied_stripe_tax_rate_id is null;

alter table public.purchases drop constraint purchases_verified_tax_check;
alter table public.purchases add constraint purchases_verified_tax_check check (
  -- No verified fiscal evidence yet.
  (automatic_tax_status is null and applied_stripe_tax_rate_id is null
    and tax_percentage is null and tax_behavior is null
    and subtotal_excluding_tax_cents is null and tax_amount_cents is null
    and total_including_tax_cents is null and stripe_invoice_id is null
    and stripe_invoice_number is null)
  or
  -- Historical evidence generated before automatic Stripe Tax migration.
  (automatic_tax_status is null and applied_stripe_tax_rate_id is not null
    and tax_percentage = 21.00 and tax_behavior = 'inclusive'
    and subtotal_excluding_tax_cents >= 0 and tax_amount_cents >= 0
    and applied_stripe_tax_rate_id = expected_stripe_tax_rate_id
    and subtotal_excluding_tax_cents = amount_due_base_cents
    and tax_amount_cents = amount_due_vat_cents
    and subtotal_excluding_tax_cents + tax_amount_cents = total_including_tax_cents
    and total_including_tax_cents = amount_due_cents
    and stripe_invoice_id ~ '^in_[A-Za-z0-9_]+$'
    and length(btrim(stripe_invoice_number)) > 0)
  or
  -- New Stripe Tax evidence. A zero tax amount is not accepted for an ES sale.
  (automatic_tax_status = 'complete' and expected_stripe_tax_rate_id is null
    and applied_stripe_tax_rate_id is null and tax_percentage is null
    and tax_behavior = 'inclusive' and subtotal_excluding_tax_cents >= 0
    and tax_amount_cents > 0
    and subtotal_excluding_tax_cents = amount_due_base_cents
    and tax_amount_cents = amount_due_vat_cents
    and subtotal_excluding_tax_cents + tax_amount_cents = total_including_tax_cents
    and total_including_tax_cents = amount_due_cents
    and stripe_invoice_id ~ '^in_[A-Za-z0-9_]+$'
    and length(btrim(stripe_invoice_number)) > 0)
);

-- Internal automatic-Tax transition. It is callable only by security-definer
-- orchestration functions, never directly by the application role.
create or replace function public.process_verified_automatic_tax_staging_payment(
  p_provider_event_id text, p_event_type text, p_event_created_at timestamptz,
  p_payload_sha256 text, p_purchase_id uuid, p_checkout_session_id text,
  p_payment_intent_id text, p_customer_id text, p_price_id text,
  p_amount_total_cents bigint, p_currency text, p_country text,
  p_automatic_tax_status text, p_tax_behavior text,
  p_subtotal_excluding_tax_cents bigint, p_tax_amount_cents bigint,
  p_total_including_tax_cents bigint, p_invoice_id text, p_invoice_number text,
  p_invoice_status text, p_invoice_country text, p_invoice_currency text,
  p_invoice_automatic_tax_status text, p_invoice_tax_behavior text,
  p_invoice_subtotal_excluding_tax_cents bigint, p_invoice_tax_amount_cents bigint,
  p_invoice_total_including_tax_cents bigint
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_source public.user_licenses%rowtype;
  v_result jsonb;
  v_reason text;
  v_kind text;
begin
  select p.* into v_purchase from public.purchases p where p.id = p_purchase_id;
  if v_purchase.id is null then
    return public.process_verified_staging_payment(
      p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
      p_purchase_id, p_checkout_session_id, p_payment_intent_id, p_customer_id,
      p_price_id, p_amount_total_cents, p_currency, p_country
    );
  end if;
  if p_automatic_tax_status is distinct from 'complete' then
    v_reason := 'automatic_tax_incomplete'; v_kind := 'tax_mismatch';
  elsif p_tax_behavior is distinct from 'inclusive'
     or p_subtotal_excluding_tax_cents is distinct from v_purchase.amount_due_base_cents
     or p_tax_amount_cents is distinct from v_purchase.amount_due_vat_cents
     or coalesce(p_tax_amount_cents, 0) <= 0
     or p_total_including_tax_cents is distinct from v_purchase.amount_due_cents
     or p_subtotal_excluding_tax_cents + p_tax_amount_cents
       is distinct from p_total_including_tax_cents then
    v_reason := 'tax_breakdown_mismatch'; v_kind := 'tax_mismatch';
  elsif p_invoice_id is null or p_invoice_id !~ '^in_[A-Za-z0-9_]+$'
     or length(btrim(coalesce(p_invoice_number, ''))) = 0
     or p_invoice_status is distinct from 'paid'
     or upper(coalesce(p_invoice_country, '')) <> 'ES'
     or upper(coalesce(p_invoice_currency, '')) <> v_purchase.currency
     or p_invoice_automatic_tax_status is distinct from 'complete'
     or p_invoice_tax_behavior is distinct from 'inclusive'
     or p_invoice_subtotal_excluding_tax_cents is distinct from p_subtotal_excluding_tax_cents
     or p_invoice_tax_amount_cents is distinct from p_tax_amount_cents
     or p_invoice_total_including_tax_cents is distinct from p_total_including_tax_cents then
    v_reason := 'invoice_mismatch'; v_kind := 'invoice_mismatch';
  end if;
  if v_reason is not null then
    update public.payment_events set purchase_id = v_purchase.id,
      processing_status = 'ignored', processed_at = now(), reason_code = v_reason
    where provider_event_id = p_provider_event_id;
    perform public.record_payment_incident(
      p_provider_event_id, v_kind,
      jsonb_build_object(
        'reason', v_reason, 'automaticTaxStatus', p_automatic_tax_status,
        'taxBehavior', p_tax_behavior, 'baseCents', p_subtotal_excluding_tax_cents,
        'taxCents', p_tax_amount_cents, 'totalCents', p_total_including_tax_cents,
        'invoiceId', p_invoice_id, 'invoiceNumber', p_invoice_number,
        'invoiceStatus', p_invoice_status,
        'invoiceAutomaticTaxStatus', p_invoice_automatic_tax_status,
        'invoiceTaxBehavior', p_invoice_tax_behavior
      ),
      v_purchase.user_id, v_purchase.id, p_checkout_session_id,
      p_payment_intent_id, p_customer_id
    );
    return jsonb_build_object('ok', false, 'duplicate', false, 'processed', false,
      'reason', v_reason, 'purchase_id', v_purchase.id, 'license_id', null);
  end if;

  v_result := public.process_verified_staging_payment(
    p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
    p_purchase_id, p_checkout_session_id, p_payment_intent_id, p_customer_id,
    p_price_id, p_amount_total_cents, p_currency, p_country
  );
  if coalesce((v_result->>'processed')::boolean, false) then
    update public.purchases set
      expected_stripe_tax_rate_id = null, applied_stripe_tax_rate_id = null,
      tax_percentage = null, automatic_tax_status = 'complete',
      tax_behavior = p_tax_behavior,
      subtotal_excluding_tax_cents = p_subtotal_excluding_tax_cents,
      tax_amount_cents = p_tax_amount_cents,
      total_including_tax_cents = p_total_including_tax_cents,
      stripe_invoice_id = p_invoice_id, stripe_invoice_number = p_invoice_number
    where id = p_purchase_id
      and (stripe_invoice_id is null or stripe_invoice_id = p_invoice_id);

    select p.* into v_purchase from public.purchases p where p.id = p_purchase_id;
    if v_purchase.purchase_kind = 'upgrade' and v_purchase.resulting_license_id is not null then
      select l.* into v_source from public.user_licenses l where l.id = v_purchase.source_license_id;
      if v_source.id is not null and v_source.original_purchase_id is not null
         and v_source.starts_at is not null and v_source.expires_at is not null then
        insert into public.upgrade_relationships (
          upgrade_purchase_id, user_id, original_purchase_id, original_license_id,
          upgraded_license_id, credited_amount_cents, original_starts_at, original_expires_at
        ) values (
          v_purchase.id, v_purchase.user_id, v_source.original_purchase_id, v_source.id,
          v_purchase.resulting_license_id, v_purchase.upgrade_credit_cents,
          v_source.starts_at, v_source.expires_at
        ) on conflict (upgrade_purchase_id) do nothing;
      end if;
    end if;
  end if;
  return v_result;
end;
$$;

-- This is the only backend payment activation entry point after this migration.
create or replace function public.process_verified_automatic_tax_payment(
  p_provider_event_id text, p_event_type text, p_event_created_at timestamptz,
  p_payload_sha256 text, p_purchase_id uuid, p_checkout_session_id text,
  p_payment_intent_id text, p_charge_id text, p_customer_id text, p_price_id text,
  p_amount_total_cents bigint, p_currency text, p_country text,
  p_automatic_tax_status text, p_tax_behavior text,
  p_subtotal_excluding_tax_cents bigint, p_tax_amount_cents bigint,
  p_total_including_tax_cents bigint, p_invoice_id text, p_invoice_number text,
  p_invoice_status text, p_invoice_country text, p_invoice_currency text,
  p_invoice_automatic_tax_status text, p_invoice_tax_behavior text,
  p_invoice_subtotal_excluding_tax_cents bigint,
  p_invoice_tax_amount_cents bigint, p_invoice_total_including_tax_cents bigint
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_result jsonb;
  v_refund public.pending_payment_reversals%rowtype;
  v_dispute public.pending_payment_reversals%rowtype;
  v_full_refund bigint := 0;
  v_latest_refund_at timestamptz;
  v_latest_refund_event_id text;
  v_latest_dispute text;
  v_latest_dispute_id text;
  v_latest_dispute_at timestamptz;
  v_ambiguous boolean := false;
  v_reason text;
  v_kind text;
begin
  select p.* into v_purchase from public.purchases p where p.id = p_purchase_id;
  if v_purchase.user_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('purchase-user:' || v_purchase.user_id::text, 0));
  end if;
  perform pg_advisory_xact_lock(hashtextextended('purchase:' || p_purchase_id::text, 0));
  select p.* into v_purchase from public.purchases p where p.id = p_purchase_id for update;

  if v_purchase.id is null then
    return public.process_verified_staging_payment(
      p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
      p_purchase_id, p_checkout_session_id, p_payment_intent_id, p_customer_id,
      p_price_id, p_amount_total_cents, p_currency, p_country
    );
  elsif v_purchase.stripe_checkout_session_id is distinct from p_checkout_session_id then
    v_reason := 'checkout_session_mismatch'; v_kind := 'paid_without_license';
  elsif v_purchase.stripe_customer_id is distinct from p_customer_id then
    v_reason := 'customer_mismatch'; v_kind := 'customer_mismatch';
  elsif upper(coalesce(p_country, '')) <> 'ES' then
    v_reason := 'country_mismatch'; v_kind := 'country_mismatch';
  elsif v_purchase.stripe_price_id is distinct from p_price_id then
    v_reason := 'price_mismatch'; v_kind := 'unknown_price';
  elsif v_purchase.amount_due_cents is distinct from p_amount_total_cents then
    v_reason := 'amount_mismatch'; v_kind := 'amount_mismatch';
  elsif v_purchase.currency is distinct from upper(coalesce(p_currency, '')) then
    v_reason := 'currency_mismatch'; v_kind := 'currency_mismatch';
  elsif p_payment_intent_id !~ '^pi_[A-Za-z0-9_]+$'
     or p_charge_id !~ '^ch_[A-Za-z0-9_]+$' then
    v_reason := 'payment_identity_mismatch'; v_kind := 'paid_without_license';
  elsif p_automatic_tax_status is distinct from 'complete' then
    v_reason := 'automatic_tax_incomplete'; v_kind := 'tax_mismatch';
  elsif p_tax_behavior is distinct from 'inclusive'
     or p_subtotal_excluding_tax_cents is distinct from v_purchase.amount_due_base_cents
     or p_tax_amount_cents is distinct from v_purchase.amount_due_vat_cents
     or coalesce(p_tax_amount_cents, 0) <= 0
     or p_total_including_tax_cents is distinct from v_purchase.amount_due_cents
     or p_subtotal_excluding_tax_cents + p_tax_amount_cents
       is distinct from p_total_including_tax_cents then
    v_reason := 'tax_breakdown_mismatch'; v_kind := 'tax_mismatch';
  elsif p_invoice_id is null or p_invoice_id !~ '^in_[A-Za-z0-9_]+$'
     or length(btrim(coalesce(p_invoice_number, ''))) = 0
     or p_invoice_status is distinct from 'paid'
     or upper(coalesce(p_invoice_country, '')) <> 'ES'
     or upper(coalesce(p_invoice_currency, '')) <> v_purchase.currency
     or p_invoice_automatic_tax_status is distinct from 'complete'
     or p_invoice_tax_behavior is distinct from 'inclusive'
     or p_invoice_subtotal_excluding_tax_cents is distinct from p_subtotal_excluding_tax_cents
     or p_invoice_tax_amount_cents is distinct from p_tax_amount_cents
     or p_invoice_total_including_tax_cents is distinct from p_total_including_tax_cents then
    v_reason := case when p_invoice_id is null then 'invoice_missing' else 'invoice_mismatch' end;
    v_kind := 'invoice_mismatch';
  end if;

  if v_reason is not null then
    update public.payment_events set purchase_id = v_purchase.id,
      processing_status = 'ignored', processed_at = now(), reason_code = v_reason
    where provider_event_id = p_provider_event_id;
    perform public.record_payment_incident(
      p_provider_event_id, v_kind,
      jsonb_build_object(
        'reason', v_reason, 'automaticTaxStatus', p_automatic_tax_status,
        'taxBehavior', p_tax_behavior, 'baseCents', p_subtotal_excluding_tax_cents,
        'taxCents', p_tax_amount_cents, 'totalCents', p_total_including_tax_cents,
        'invoiceId', p_invoice_id, 'invoiceStatus', p_invoice_status,
        'invoiceAutomaticTaxStatus', p_invoice_automatic_tax_status,
        'invoiceTaxBehavior', p_invoice_tax_behavior
      ),
      v_purchase.user_id, v_purchase.id, p_checkout_session_id,
      p_payment_intent_id, p_customer_id
    );
    return jsonb_build_object('ok', false, 'duplicate', false, 'processed', false,
      'reason', v_reason, 'purchase_id', v_purchase.id, 'license_id', null);
  end if;

  for v_refund in
    select r.* from public.pending_payment_reversals r
    where r.processing_status in ('pending_match', 'matched', 'requires_review')
      and (r.stripe_payment_intent_id = p_payment_intent_id
        or r.stripe_charge_id = p_charge_id
        or r.stripe_checkout_session_id = p_checkout_session_id
        or r.stripe_invoice_id = p_invoice_id or r.purchase_id = p_purchase_id)
    order by r.occurred_at, r.stripe_event_id for update
  loop
    if v_refund.processing_status = 'requires_review'
       or (v_refund.stripe_payment_intent_id is not null
           and v_refund.stripe_payment_intent_id <> p_payment_intent_id)
       or (v_refund.stripe_charge_id is not null and v_refund.stripe_charge_id <> p_charge_id)
       or (v_refund.stripe_checkout_session_id is not null
           and v_refund.stripe_checkout_session_id <> p_checkout_session_id)
       or (v_refund.stripe_invoice_id is not null and v_refund.stripe_invoice_id <> p_invoice_id)
       or (v_refund.purchase_id is not null and v_refund.purchase_id <> p_purchase_id) then
      v_ambiguous := true;
    elsif v_refund.reversal_kind = 'refund' then
      if v_refund.charge_amount_cents <> p_amount_total_cents
         or v_refund.currency <> upper(p_currency) then v_ambiguous := true;
      elsif v_refund.amount_refunded_cents >= v_full_refund then
        v_full_refund := v_refund.amount_refunded_cents;
        v_latest_refund_at := v_refund.occurred_at;
        v_latest_refund_event_id := v_refund.stripe_event_id;
      end if;
    elsif v_latest_dispute_at is null or v_refund.occurred_at >= v_latest_dispute_at then
      v_latest_dispute := v_refund.dispute_status;
      v_latest_dispute_id := v_refund.stripe_dispute_id;
      v_latest_dispute_at := v_refund.occurred_at;
    end if;
  end loop;

  if v_ambiguous then
    update public.pending_payment_reversals set processing_status = 'requires_review',
      reason_code = 'conflicting_reversal_identity'
    where processing_status <> 'applied' and (
      stripe_payment_intent_id = p_payment_intent_id or stripe_charge_id = p_charge_id
      or stripe_checkout_session_id = p_checkout_session_id
      or stripe_invoice_id = p_invoice_id or purchase_id = p_purchase_id
    );
    perform public.record_payment_incident(
      p_provider_event_id, 'payment_reversal_ambiguous',
      jsonb_build_object('reason', 'conflicting_reversal_identity'),
      v_purchase.user_id, v_purchase.id, p_checkout_session_id,
      p_payment_intent_id, p_customer_id
    );
    update public.payment_events set purchase_id = v_purchase.id,
      processing_status = 'processed', processed_at = now(),
      reason_code = 'payment_reversal_requires_review'
    where provider_event_id = p_provider_event_id;
    return jsonb_build_object('ok', true, 'duplicate', false, 'processed', true,
      'reason', 'payment_reversal_requires_review', 'purchase_id', v_purchase.id,
      'license_id', null);
  end if;

  if v_full_refund >= p_amount_total_cents or v_latest_dispute in ('open', 'lost') then
    update public.purchases set
      stripe_payment_intent_id = p_payment_intent_id, stripe_charge_id = p_charge_id,
      amount_paid_cents = p_amount_total_cents, stripe_customer_id = p_customer_id,
      fiscal_country = 'ES', expected_stripe_tax_rate_id = null,
      applied_stripe_tax_rate_id = null, tax_percentage = null,
      automatic_tax_status = 'complete', tax_behavior = p_tax_behavior,
      subtotal_excluding_tax_cents = p_subtotal_excluding_tax_cents,
      tax_amount_cents = p_tax_amount_cents,
      total_including_tax_cents = p_total_including_tax_cents,
      stripe_invoice_id = p_invoice_id, stripe_invoice_number = p_invoice_number,
      payment_verified_at = p_event_created_at,
      payment_verification_event_id = p_provider_event_id, paid_at = p_event_created_at,
      amount_refunded_cents = greatest(amount_refunded_cents,
        least(v_full_refund, p_amount_total_cents)),
      refund_status = case when v_full_refund >= p_amount_total_cents
        then 'fully_refunded' when v_full_refund > 0 then 'partially_refunded'
        else refund_status end,
      last_refund_at = case when v_full_refund > 0 then v_latest_refund_at else last_refund_at end,
      last_refund_event_created_at = case when v_full_refund > 0
        then v_latest_refund_at else last_refund_event_created_at end,
      refunded_at = case when v_full_refund >= p_amount_total_cents
        then v_latest_refund_at else refunded_at end,
      dispute_status = coalesce(v_latest_dispute, dispute_status),
      stripe_dispute_id = coalesce(v_latest_dispute_id, stripe_dispute_id),
      last_dispute_event_created_at = coalesce(v_latest_dispute_at, last_dispute_event_created_at),
      disputed_at = case when v_latest_dispute in ('open', 'lost')
        then v_latest_dispute_at else disputed_at end,
      status = case when v_full_refund >= p_amount_total_cents then 'refunded' else 'disputed' end,
      failure_reason = case when v_full_refund >= p_amount_total_cents
        then 'fully_refunded_before_activation' else 'dispute_before_activation' end
    where id = v_purchase.id;

    v_reason := case when v_full_refund >= p_amount_total_cents
      then 'fully_refunded_before_activation' else 'dispute_before_activation' end;
    update public.pending_payment_reversals set purchase_id = v_purchase.id,
      user_id = v_purchase.user_id, processing_status = 'applied', applied_at = now(),
      reason_code = v_reason,
      match_basis = case when stripe_payment_intent_id = p_payment_intent_id
        then 'payment_intent' when stripe_charge_id = p_charge_id then 'charge'
        when stripe_checkout_session_id = p_checkout_session_id then 'checkout_session'
        when stripe_invoice_id = p_invoice_id then 'invoice' else 'purchase' end
    where processing_status <> 'applied' and (
      stripe_payment_intent_id = p_payment_intent_id or stripe_charge_id = p_charge_id
      or stripe_checkout_session_id = p_checkout_session_id
      or stripe_invoice_id = p_invoice_id or purchase_id = p_purchase_id
    );
    update public.payment_events set purchase_id = v_purchase.id,
      processing_status = 'processed', processed_at = now(), reason_code = v_reason,
      last_error = null
    where provider_event_id = p_provider_event_id
       or provider_event_id in (select r.stripe_event_id from public.pending_payment_reversals r
         where r.purchase_id = v_purchase.id and r.reason_code = v_reason);
    perform public.record_payment_incident(
      p_provider_event_id,
      case when v_full_refund >= p_amount_total_cents
        then 'payment_fully_refunded_before_activation'
        else 'payment_dispute_before_activation' end,
      jsonb_build_object('reason', v_reason, 'amountRefundedCents', v_full_refund,
        'disputeStatus', v_latest_dispute, 'automaticallyApplied', true),
      v_purchase.user_id, v_purchase.id, p_checkout_session_id,
      p_payment_intent_id, p_customer_id
    );
    if v_full_refund >= p_amount_total_cents then
      with resolved as (
        update public.payment_incidents set status = 'resolved', resolved_at = now(),
          resolution_reason = 'Full refund was automatically applied before activation'
        where stripe_event_id = p_provider_event_id
          and kind = 'payment_fully_refunded_before_activation' returning id
      )
      insert into public.payment_incident_events (incident_id, action, reason)
      select r.id, 'resolved', 'Automatically resolved: no paid licence was created'
      from resolved r where not exists (select 1 from public.payment_incident_events e
        where e.incident_id = r.id and e.action = 'resolved');
    end if;
    if v_full_refund > 0 and v_full_refund < p_amount_total_cents then
      perform public.record_payment_incident(
        v_latest_refund_event_id, 'partial_refund_review',
        jsonb_build_object('amountPaidCents', p_amount_total_cents,
          'amountRefundedCents', v_full_refund,
          'remainingCents', p_amount_total_cents - v_full_refund,
          'appliedBeforeActivation', true),
        v_purchase.user_id, v_purchase.id, p_checkout_session_id,
        p_payment_intent_id, p_customer_id
      );
    end if;
    return jsonb_build_object('ok', true, 'duplicate', false, 'processed', true,
      'reason', v_reason, 'purchase_id', v_purchase.id, 'license_id', null);
  end if;

  v_result := public.process_verified_automatic_tax_staging_payment(
    p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
    p_purchase_id, p_checkout_session_id, p_payment_intent_id, p_customer_id,
    p_price_id, p_amount_total_cents, p_currency, p_country,
    p_automatic_tax_status, p_tax_behavior,
    p_subtotal_excluding_tax_cents, p_tax_amount_cents,
    p_total_including_tax_cents, p_invoice_id, p_invoice_number, p_invoice_status,
    p_invoice_country, p_invoice_currency, p_invoice_automatic_tax_status,
    p_invoice_tax_behavior,
    p_invoice_subtotal_excluding_tax_cents, p_invoice_tax_amount_cents,
    p_invoice_total_including_tax_cents
  );
  if coalesce((v_result->>'processed')::boolean, false) then
    update public.purchases set payment_verified_at = coalesce(payment_verified_at, p_event_created_at),
      payment_verification_event_id = coalesce(payment_verification_event_id, p_provider_event_id),
      stripe_charge_id = coalesce(stripe_charge_id, p_charge_id)
    where id = p_purchase_id;
    for v_refund in
      select r.* from public.pending_payment_reversals r
      where r.processing_status in ('pending_match', 'matched') and r.reversal_kind = 'refund'
        and (r.stripe_payment_intent_id = p_payment_intent_id
          or r.stripe_charge_id = p_charge_id or r.purchase_id = p_purchase_id)
      order by r.occurred_at, r.stripe_event_id for update
    loop
      perform public.process_verified_final_refund(
        v_refund.stripe_event_id, v_refund.event_type, v_refund.occurred_at,
        v_refund.payload_sha256, p_purchase_id, p_payment_intent_id,
        v_refund.amount_refunded_cents, v_refund.charge_amount_cents, v_refund.currency
      );
      update public.pending_payment_reversals set purchase_id = p_purchase_id,
        user_id = v_purchase.user_id, processing_status = 'applied', applied_at = now(),
        reason_code = 'payment_partially_refunded_before_activation',
        match_basis = case when v_refund.stripe_payment_intent_id = p_payment_intent_id
          then 'payment_intent' else 'charge' end where id = v_refund.id;
      update public.payment_events set reason_code = 'payment_partially_refunded_before_activation'
      where provider_event_id = v_refund.stripe_event_id
        and v_refund.amount_refunded_cents < v_refund.charge_amount_cents;
      update public.payment_incidents set details = details || jsonb_build_object(
        'reason', 'payment_partially_refunded_before_activation', 'appliedBeforeActivation', true
      ) where stripe_event_id = v_refund.stripe_event_id and kind = 'partial_refund_review';
    end loop;
    for v_dispute in
      select r.* from public.pending_payment_reversals r
      where r.processing_status in ('pending_match', 'matched') and r.reversal_kind = 'dispute'
        and (r.stripe_payment_intent_id = p_payment_intent_id
          or r.stripe_charge_id = p_charge_id or r.purchase_id = p_purchase_id)
      order by r.occurred_at, r.stripe_event_id for update
    loop
      perform public.process_verified_staging_dispute(
        v_dispute.stripe_event_id, v_dispute.event_type, v_dispute.occurred_at,
        v_dispute.payload_sha256, p_purchase_id, p_payment_intent_id,
        v_dispute.stripe_dispute_id, v_dispute.dispute_status
      );
      update public.pending_payment_reversals set purchase_id = p_purchase_id,
        user_id = v_purchase.user_id, processing_status = 'applied', applied_at = now(),
        reason_code = 'applied_after_payment', match_basis = 'payment_intent'
      where id = v_dispute.id;
    end loop;
  end if;
  return v_result;
end;
$$;

-- A won dispute can reactivate only automatic-Tax evidence already verified and
-- stored by the guarded payment flow.
create or replace function public.process_verified_order_independent_dispute(
  p_provider_event_id text, p_event_type text, p_event_created_at timestamptz,
  p_payload_sha256 text, p_purchase_id uuid, p_payment_intent_id text,
  p_dispute_id text, p_dispute_status text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_purchase public.purchases%rowtype; v_result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('purchase:' || p_purchase_id::text, 0));
  select p.* into v_purchase from public.purchases p where p.id = p_purchase_id for update;
  if v_purchase.id is null
     or v_purchase.stripe_payment_intent_id is distinct from p_payment_intent_id then
    return public.process_verified_staging_dispute(
      p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
      p_purchase_id, p_payment_intent_id, p_dispute_id, p_dispute_status
    );
  end if;
  if p_dispute_status = 'won' and v_purchase.resulting_license_id is null
     and v_purchase.payment_verified_at is not null
     and v_purchase.automatic_tax_status = 'complete'
     and v_purchase.refund_status <> 'fully_refunded'
     and not exists (
       select 1 from public.pending_payment_reversals r
       where r.purchase_id = v_purchase.id and r.reversal_kind = 'dispute'
         and r.processing_status <> 'ignored_with_reason'
         and r.dispute_status in ('open', 'lost') and r.occurred_at > p_event_created_at
     ) then
    update public.purchases set status = 'pending', dispute_status = 'won',
      stripe_dispute_id = p_dispute_id,
      last_dispute_event_created_at = p_event_created_at,
      failure_reason = null where id = v_purchase.id;
    v_result := public.process_verified_automatic_tax_staging_payment(
      p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
      v_purchase.id, v_purchase.stripe_checkout_session_id,
      v_purchase.stripe_payment_intent_id, v_purchase.stripe_customer_id,
      v_purchase.stripe_price_id, v_purchase.amount_paid_cents, v_purchase.currency,
      'ES', v_purchase.automatic_tax_status, v_purchase.tax_behavior,
      v_purchase.subtotal_excluding_tax_cents, v_purchase.tax_amount_cents,
      v_purchase.total_including_tax_cents, v_purchase.stripe_invoice_id,
      v_purchase.stripe_invoice_number, 'paid', 'ES', v_purchase.currency,
      v_purchase.automatic_tax_status, v_purchase.tax_behavior,
      v_purchase.subtotal_excluding_tax_cents, v_purchase.tax_amount_cents,
      v_purchase.total_including_tax_cents
    );
    if coalesce((v_result->>'processed')::boolean, false) then
      update public.purchases set dispute_status = 'won', stripe_dispute_id = p_dispute_id,
        last_dispute_event_created_at = p_event_created_at where id = v_purchase.id;
      update public.pending_payment_reversals set processing_status = 'applied',
        applied_at = coalesce(applied_at, now()), purchase_id = v_purchase.id,
        user_id = v_purchase.user_id, reason_code = 'dispute_won_activation',
        match_basis = coalesce(match_basis, 'payment_intent')
      where stripe_event_id = p_provider_event_id;
      update public.payment_incidents set status = 'resolved', resolved_at = now(),
        resolution_reason = 'Stripe dispute won; verified payment activated'
      where purchase_id = v_purchase.id and kind = 'payment_dispute_before_activation'
        and status in ('open', 'retrying');
      return v_result || jsonb_build_object('reason', 'dispute_won_activated');
    end if;
    update public.purchases set status = 'disputed', dispute_status = 'won',
      failure_reason = 'dispute_won_activation_failed' where id = v_purchase.id;
    return v_result;
  end if;
  v_result := public.process_verified_staging_dispute(
    p_provider_event_id, p_event_type, p_event_created_at, p_payload_sha256,
    p_purchase_id, p_payment_intent_id, p_dispute_id, p_dispute_status
  );
  if coalesce((v_result->>'processed')::boolean, false) then
    update public.pending_payment_reversals set processing_status = 'applied',
      applied_at = coalesce(applied_at, now()), purchase_id = p_purchase_id,
      user_id = v_purchase.user_id, reason_code = 'applied_to_verified_payment',
      match_basis = coalesce(match_basis, 'payment_intent')
    where stripe_event_id = p_provider_event_id;
  end if;
  return v_result;
end;
$$;

revoke execute on function public.bind_purchase_tax_rate(uuid, text) from service_role;
revoke execute on function public.process_verified_order_independent_payment(
  text, text, timestamptz, text, uuid, text, text, text, text, text, bigint, text, text,
  text, numeric, text, bigint, bigint, bigint, text, text, text, text, text, text, text,
  bigint, bigint, bigint
) from service_role;
revoke all on function public.process_verified_automatic_tax_staging_payment(
  text, text, timestamptz, text, uuid, text, text, text, text, bigint, text, text,
  text, text, bigint, bigint, bigint, text, text, text, text, text, text, text,
  bigint, bigint, bigint
) from public, anon, authenticated, service_role;
revoke all on function public.process_verified_automatic_tax_payment(
  text, text, timestamptz, text, uuid, text, text, text, text, text, bigint, text, text,
  text, text, bigint, bigint, bigint, text, text, text, text, text, text, text,
  bigint, bigint, bigint
) from public, anon, authenticated;
grant execute on function public.process_verified_automatic_tax_payment(
  text, text, timestamptz, text, uuid, text, text, text, text, text, bigint, text, text,
  text, text, bigint, bigint, bigint, text, text, text, text, text, text, text,
  bigint, bigint, bigint
) to service_role;

comment on column public.purchases.automatic_tax_status is
  'Stripe Tax calculation status verified from Checkout and paid Invoice; new payments require complete.';
comment on function public.process_verified_automatic_tax_payment(
  text, text, timestamptz, text, uuid, text, text, text, text, text, bigint, text, text,
  text, text, bigint, bigint, bigint, text, text, text, text, text, text, text,
  bigint, bigint, bigint
) is 'Only operational payment activation RPC: requires complete Stripe Tax, ES, inclusive Price and matching paid Invoice evidence.';
