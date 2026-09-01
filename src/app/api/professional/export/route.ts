import { NextResponse } from 'next/server';
import {
  PROFESSIONAL_OPERATION_STATUS_LABELS,
  ProfessionalExportQuerySchema,
} from '@/domain/professional/contracts';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireServerCapability } from '@/server/access';
import { rateLimitedResponse } from '@/server/security/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let userId: string;
  let publicBeta = false;
  try {
    const access = await requireServerCapability('export_data');
    userId = access.userId;
    publicBeta = access.publicBeta;
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Necesitas una licencia Profesional activa.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const limited = await rateLimitedResponse(
    request,
    `professional:export:${userId}`,
    { limit: 10, windowSeconds: 3_600 },
  );
  if (limited) return limited;

  const url = new URL(request.url);
  const parsedQuery = ProfessionalExportQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!parsedQuery.success) {
    return NextResponse.json(
      { ok: false, message: 'Los filtros de exportación no son válidos.' },
      { status: 400, headers: { 'Cache-Control': 'no-store, private' } },
    );
  }

  const supabase = publicBeta ? createSupabaseAdminClient() : await createSupabaseServerClient();
  let operationsQuery = supabase
    .from('registration_cases')
    .select('id, title, status, vehicles(make, model)')
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (parsedQuery.data.status) {
    operationsQuery = operationsQuery.eq('status', parsedQuery.data.status);
  }
  const [operationsResult, clientResult] = await Promise.all([
    operationsQuery,
    supabase
      .from('professional_clients')
      .select('id, reference, display_name')
      .eq('user_id', userId)
      .is('deleted_at', null),
  ]);

  if (operationsResult.error || clientResult.error) {
    return NextResponse.json(
      { ok: false, message: 'No se ha podido preparar la exportación.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const operationIds = (operationsResult.data ?? []).map((operation) => operation.id);
  let financialRows: Record<string, unknown>[] = [];
  if (operationIds.length > 0) {
    let financialQuery = supabase
      .from('professional_case_financials')
      .select('case_id, client_id, currency, purchase_cost, transport_cost, repair_cost, itv_cost, homologation_cost, taxes_cost, dgt_cost, plates_cost, other_cost, total_cost, target_sale_price, planned_margin, actual_sale_price, actual_margin, notes')
      .eq('user_id', userId)
      .in('case_id', operationIds)
      .order('updated_at', { ascending: false });
    if (parsedQuery.data.client_id) {
      financialQuery = financialQuery.eq('client_id', parsedQuery.data.client_id);
    }
    const financialResult = await financialQuery;
    if (financialResult.error) {
      return NextResponse.json(
        { ok: false, message: 'No se ha podido preparar la exportación.' },
        { status: 503, headers: { 'Cache-Control': 'no-store, private' } },
      );
    }
    financialRows = (financialResult.data ?? []) as Record<string, unknown>[];
  }

  const clients = new Map(
    (clientResult.data ?? []).map((client) => [client.id, client]),
  );
  const operations = new Map(
    (operationsResult.data ?? []).map((operation) => [operation.id, operation]),
  );
  const header = [
    'expediente', 'operacion', 'estado', 'referencia_cliente', 'cliente', 'moneda', 'compra',
    'transporte', 'reparacion', 'itv', 'homologacion', 'impuestos', 'dgt',
    'placas', 'otros', 'coste_total', 'precio_objetivo', 'margen_previsto',
    'precio_real', 'margen_real', 'notas',
  ];
  const rows = financialRows.map((row) => {
    const client = typeof row.client_id === 'string' ? clients.get(row.client_id) : null;
    const operation = typeof row.case_id === 'string' ? operations.get(row.case_id) : null;
    const rawVehicle = operation?.vehicles as unknown;
    const vehicle = Array.isArray(rawVehicle) ? rawVehicle[0] : rawVehicle;
    const vehicleRow = vehicle && typeof vehicle === 'object'
      ? vehicle as Record<string, unknown>
      : null;
    const operationName = [vehicleRow?.make, vehicleRow?.model]
      .filter((value): value is string => typeof value === 'string' && Boolean(value))
      .join(' ') || operation?.title || '';
    const status = operation?.status;
    return [
      row.case_id,
      operationName,
      status && status in PROFESSIONAL_OPERATION_STATUS_LABELS
        ? PROFESSIONAL_OPERATION_STATUS_LABELS[status as keyof typeof PROFESSIONAL_OPERATION_STATUS_LABELS]
        : status ?? '',
      client?.reference ?? '',
      client?.display_name ?? '',
      row.currency,
      row.purchase_cost,
      row.transport_cost,
      row.repair_cost,
      row.itv_cost,
      row.homologation_cost,
      row.taxes_cost,
      row.dgt_cost,
      row.plates_cost,
      row.other_cost,
      row.total_cost,
      row.target_sale_price,
      row.planned_margin,
      row.actual_sale_price,
      row.actual_margin,
      row.notes,
    ];
  });
  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="matriculapro-operaciones-${date}.csv"`,
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function csvCell(value: unknown) {
  let cell = String(value ?? '');
  if (/^[=+\-@]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replace(/"/g, '""')}"`;
}
