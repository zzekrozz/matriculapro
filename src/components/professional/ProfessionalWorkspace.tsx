'use client';

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  Download,
  History,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  Users,
} from 'lucide-react';
import {
  EMPTY_PROFESSIONAL_PROFILE,
  PROFESSIONAL_OPERATION_STATUS_LABELS,
  type ProfessionalClient,
  type ProfessionalClientInput,
  type ProfessionalFinancial,
  type ProfessionalFinancialInput,
  type ProfessionalOperation,
  type ProfessionalOperationStatus,
  type ProfessionalProfile,
  type ProfessionalWorkspaceData,
} from '@/domain/professional/contracts';
import { useAccess } from '@/providers/AccessProvider';

type View = 'overview' | 'clients' | 'reports';
type FilterStatus = ProfessionalOperationStatus | '';

const COST_KEYS = [
  'purchase_cost',
  'transport_cost',
  'repair_cost',
  'itv_cost',
  'homologation_cost',
  'taxes_cost',
  'dgt_cost',
  'plates_cost',
  'other_cost',
] as const;

const COST_LABELS: Record<(typeof COST_KEYS)[number], string> = {
  purchase_cost: 'Compra',
  transport_cost: 'Transporte',
  repair_cost: 'Reparación',
  itv_cost: 'ITV',
  homologation_cost: 'Homologación',
  taxes_cost: 'Impuestos',
  dgt_cost: 'DGT',
  plates_cost: 'Placas',
  other_cost: 'Otros gastos',
};

const EMPTY_CLIENT: ProfessionalClientInput = {
  reference: null,
  display_name: '',
  email: null,
  phone: null,
  tax_identifier: null,
  address: null,
  notes: null,
  status: 'active',
};

const EMPTY_WORKSPACE: ProfessionalWorkspaceData = {
  profile: EMPTY_PROFESSIONAL_PROFILE,
  clients: [],
  financials: [],
  operations: [],
};

export function ProfessionalWorkspace({ view }: { view: View }) {
  const access = useAccess();
  const canViewProfessionalHistory = access.publicBeta || (access.tier === 'professional' && access.canViewPaidCases);
  const [workspace, setWorkspace] = useState<ProfessionalWorkspaceData>(EMPTY_WORKSPACE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canViewProfessionalHistory) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<ProfessionalWorkspaceData>('/api/professional/workspace');
      setWorkspace(result);
    } catch (cause) {
      setError(messageFrom(cause, 'No se han podido cargar los datos profesionales.'));
    } finally {
      setLoading(false);
    }
  }, [canViewProfessionalHistory]);

  useEffect(() => {
    if (!access.loading) void load();
  }, [access.loading, load]);

  if (access.loading || loading) {
    return <div className="px-5 py-16 text-center text-sm text-muted"><Loader2 size={16} className="mx-auto mb-2 animate-spin" /> Cargando espacio profesional…</div>;
  }
  if (!canViewProfessionalHistory) return <ProfessionalGate />;
  if (!access.canUseProfessional) {
    return <ReadOnlyProfessionalHistory workspace={workspace} error={error} />;
  }
  if (view === 'clients') {
    return <ClientsView workspace={workspace} onRefresh={load} error={error} />;
  }
  if (view === 'reports') {
    return <ReportsView workspace={workspace} error={error} />;
  }
  return <OverviewView workspace={workspace} onRefresh={load} error={error} />;
}

function ProfessionalGate() {
  return <div className="mx-auto max-w-2xl px-5 py-16 text-center"><h1 className="font-serif text-3xl">Espacio Profesional</h1><p className="mt-3 text-sm leading-relaxed text-ink-soft">Clientes, costes, márgenes e informes comerciales requieren una licencia Profesional activa.</p><Link href="/#precios" className="mt-5 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm text-white">Ver Profesional</Link></div>;
}

function ReadOnlyProfessionalHistory({ workspace, error }: {
  workspace: ProfessionalWorkspaceData;
  error: string | null;
}) {
  const totalCost = workspace.financials.reduce((sum, row) => sum + Number(row.total_cost || 0), 0);
  const actualMargin = workspace.financials.reduce((sum, row) => sum + Number(row.actual_margin || 0), 0);
  return <Page title="Historial profesional" subtitle="Tu licencia Profesional ha vencido. Clientes, operaciones y cifras anteriores siguen visibles, sin edición ni exportación.">
    {error && <ErrorMessage>{error}</ErrorMessage>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Operaciones" value={workspace.operations.length} />
      <Metric label="Clientes" value={workspace.clients.length} />
      <Metric label="Coste histórico" value={money(totalCost)} />
      <Metric label="Margen real" value={money(actualMargin)} />
    </div>
    <section className="mt-6 rounded-[20px] border border-line bg-surface p-5">
      <h2 className="font-serif text-[23px]">Clientes conservados</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {workspace.clients.map((client) => <article key={client.id} className="rounded-xl bg-bg p-4">
          <div className="font-medium text-ink">{client.display_name}</div>
          <div className="mt-1 text-[10px] text-muted">{[client.reference, client.email, client.phone].filter(Boolean).join(' · ') || 'Sin datos adicionales'}</div>
        </article>)}
      </div>
      {workspace.clients.length === 0 && <p className="mt-3 text-[11px] text-muted">No hay clientes guardados.</p>}
    </section>
    <section className="mt-6 rounded-[20px] border border-line bg-surface p-5">
      <h2 className="font-serif text-[23px]">Operaciones y cifras</h2>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-[10.5px]"><thead><tr className="border-b border-line text-muted"><th className="py-2">Operación</th><th>Estado</th><th>Coste</th><th>Margen previsto</th><th>Margen real</th></tr></thead><tbody>{workspace.operations.map((operation) => { const financial = workspace.financials.find((row) => row.case_id === operation.id); return <tr key={operation.id} className="border-b border-line-soft"><td className="py-3">{operationName(operation)}</td><td>{PROFESSIONAL_OPERATION_STATUS_LABELS[operation.status]}</td><td>{financial ? money(financial.total_cost) : '—'}</td><td>{financial ? optionalMoney(financial.planned_margin) : '—'}</td><td>{financial ? optionalMoney(financial.actual_margin) : '—'}</td></tr>; })}</tbody></table></div>
      {workspace.operations.length === 0 && <p className="mt-3 text-[11px] text-muted">No hay operaciones guardadas.</p>}
    </section>
  </Page>;
}

function OverviewView({ workspace, onRefresh, error }: { workspace: ProfessionalWorkspaceData; onRefresh: () => Promise<void>; error: string | null }) {
  const totalCost = workspace.financials.reduce((sum, row) => sum + Number(row.total_cost || 0), 0);
  const plannedMargin = workspace.financials.reduce((sum, row) => sum + Number(row.planned_margin || 0), 0);
  const actualMargin = workspace.financials.reduce((sum, row) => sum + Number(row.actual_margin || 0), 0);
  const activeOperations = workspace.operations.filter((operation) => !['archived', 'completed', 'registered'].includes(operation.status));

  return <Page title="Operaciones y márgenes" subtitle="Control comercial para una sola persona, con acceso y propiedad comprobados por el servidor.">
    {error && <ErrorMessage>{error}</ErrorMessage>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Operaciones activas" value={activeOperations.length} />
      <Metric label="Clientes activos" value={workspace.clients.filter((client) => client.status === 'active').length} />
      <Metric label="Coste acumulado" value={money(totalCost)} />
      <Metric label="Margen real" value={money(actualMargin)} detail={`Previsto ${money(plannedMargin)}`} />
    </div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
      <ProfessionalProfileForm initial={workspace.profile} onSaved={onRefresh} />
      <FinancialForm workspace={workspace} onSaved={onRefresh} />
    </div>
    <div className="mt-6">
      <OperationsTable workspace={workspace} onSaved={onRefresh} />
    </div>
  </Page>;
}

function ProfessionalProfileForm({ initial, onSaved }: { initial: ProfessionalProfile; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => setDraft(initial), [initial]);

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await apiRequest<ProfessionalProfile>('/api/professional/profile', {
        method: 'PUT',
        body: JSON.stringify(normalizeProfile(draft)),
      });
      setMessage('Perfil profesional guardado.');
      await onSaved();
    } catch (cause) {
      setMessage(messageFrom(cause, 'No se ha podido guardar.'));
    } finally {
      setBusy(false);
    }
  };

  return <section className="rounded-[20px] border border-line bg-surface p-5"><h2 className="font-serif text-[23px]">Datos para informes</h2><p className="mt-1 text-[10.5px] text-muted">No se suben archivos: el logotipo debe ser una URL HTTPS propia. Nombre, dirección y contacto se muestran en el informe.</p><div className="mt-4 space-y-3"><TextInput label="Nombre comercial" value={draft.business_display_name} onChange={(value) => setDraft({ ...draft, business_display_name: value })} /><TextInput label="NIF/CIF profesional" value={draft.tax_identifier} onChange={(value) => setDraft({ ...draft, tax_identifier: value })} /><TextInput label="Email comercial" type="email" value={draft.contact_email} onChange={(value) => setDraft({ ...draft, contact_email: value })} /><TextInput label="Teléfono" value={draft.contact_phone} onChange={(value) => setDraft({ ...draft, contact_phone: value })} /><TextArea label="Dirección comercial" value={draft.business_address} onChange={(value) => setDraft({ ...draft, business_address: value })} /><TextInput label="URL HTTPS del logotipo" type="url" value={draft.logo_url} onChange={(value) => setDraft({ ...draft, logo_url: value })} /><TextArea label="Pie del informe" value={draft.report_footer} onChange={(value) => setDraft({ ...draft, report_footer: value })} /></div><SaveRow busy={busy} message={message} onSave={save} /></section>;
}

function FinancialForm({ workspace, onSaved }: { workspace: ProfessionalWorkspaceData; onSaved: () => Promise<void> }) {
  const availableOperations = workspace.operations.filter((operation) => operation.status !== 'archived');
  const [caseId, setCaseId] = useState(availableOperations[0]?.id ?? '');
  const [clientId, setClientId] = useState('');
  const [values, setValues] = useState<Record<string, number | null>>({});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!availableOperations.some((operation) => operation.id === caseId)) {
      setCaseId(availableOperations[0]?.id ?? '');
    }
  }, [availableOperations, caseId]);
  useEffect(() => {
    const row = workspace.financials.find((item) => item.case_id === caseId);
    setClientId(row?.client_id ?? '');
    setNotes(row?.notes ?? '');
    setValues(Object.fromEntries(
      [...COST_KEYS, 'target_sale_price', 'actual_sale_price'].map((key) => [
        key,
        row?.[key as keyof ProfessionalFinancial] === null || row?.[key as keyof ProfessionalFinancial] === undefined
          ? null
          : Number(row[key as keyof ProfessionalFinancial]),
      ]),
    ));
  }, [caseId, workspace.financials]);

  const total = COST_KEYS.reduce((sum, key) => sum + Number(values[key] || 0), 0);
  const target = values.target_sale_price;
  const actual = values.actual_sale_price;
  const save = async () => {
    if (!caseId) return;
    setBusy(true);
    setMessage(null);
    const payload: ProfessionalFinancialInput = {
      case_id: caseId,
      client_id: clientId || null,
      purchase_cost: Number(values.purchase_cost || 0),
      transport_cost: Number(values.transport_cost || 0),
      repair_cost: Number(values.repair_cost || 0),
      itv_cost: Number(values.itv_cost || 0),
      homologation_cost: Number(values.homologation_cost || 0),
      taxes_cost: Number(values.taxes_cost || 0),
      dgt_cost: Number(values.dgt_cost || 0),
      plates_cost: Number(values.plates_cost || 0),
      other_cost: Number(values.other_cost || 0),
      target_sale_price: target ?? null,
      actual_sale_price: actual ?? null,
      notes: clean(notes),
    };
    try {
      await apiRequest<ProfessionalFinancial>('/api/professional/financials', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setMessage('Finanzas actualizadas.');
      await onSaved();
    } catch (cause) {
      setMessage(messageFrom(cause, 'No se ha podido guardar.'));
    } finally {
      setBusy(false);
    }
  };

  return <section className="rounded-[20px] border border-line bg-surface p-5"><h2 className="font-serif text-[23px]">Finanzas por operación</h2>{availableOperations.length === 0 ? <p className="mt-4 rounded-xl bg-bg p-4 text-[12px] text-ink-soft">Crea un expediente completo para asociar costes y márgenes.</p> : <><div className="mt-4 grid gap-3 sm:grid-cols-2"><SelectInput label="Operación" value={caseId} onChange={setCaseId}>{availableOperations.map((operation) => <option key={operation.id} value={operation.id}>{operationName(operation)}</option>)}</SelectInput><SelectInput label="Cliente" value={clientId} onChange={setClientId}><option value="">Sin cliente</option>{workspace.clients.map((client) => <option key={client.id} value={client.id}>{client.display_name}{client.status === 'archived' ? ' (archivado)' : ''}</option>)}</SelectInput>{COST_KEYS.map((key) => <NumberInput key={key} label={COST_LABELS[key]} value={values[key]} onChange={(value) => setValues({ ...values, [key]: value })} />)}<NumberInput label="Precio objetivo" value={target} onChange={(value) => setValues({ ...values, target_sale_price: value })} /><NumberInput label="Precio real" value={actual} onChange={(value) => setValues({ ...values, actual_sale_price: value })} /><div className="rounded-xl bg-bg p-3"><div className="text-[9px] uppercase text-muted">Coste total</div><div className="mt-1 font-serif text-xl">{money(total)}</div></div><div className="rounded-xl bg-bg p-3"><div className="text-[9px] uppercase text-muted">Margen previsto / real</div><div className="mt-1 font-serif text-xl">{money(target === null || target === undefined ? 0 : target - total)} / {money(actual === null || actual === undefined ? 0 : actual - total)}</div></div></div><div className="mt-3"><TextArea label="Notas comerciales" value={notes} onChange={(value) => setNotes(value ?? '')} /></div><SaveRow busy={busy} message={message} onSave={save} /></>}</section>;
}

function OperationsTable({ workspace, onSaved }: { workspace: ProfessionalWorkspaceData; onSaved: () => Promise<void> }) {
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('');
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const filtered = filterOperations(workspace, clientFilter, statusFilter);

  const updateStatus = async (caseId: string, status: ProfessionalOperationStatus) => {
    setBusyId(caseId);
    setMessage(null);
    try {
      await apiRequest('/api/professional/operations', {
        method: 'PATCH',
        body: JSON.stringify({ case_id: caseId, status }),
      });
      setMessage('Estado comercial actualizado.');
      await onSaved();
    } catch (cause) {
      setMessage(messageFrom(cause, 'No se ha podido actualizar el estado.'));
    } finally {
      setBusyId('');
    }
  };

  return <section className="rounded-[20px] border border-line bg-surface p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-serif text-[23px]">Seguimiento de operaciones</h2><p className="mt-1 text-[10.5px] text-muted">El estado se guarda en el expediente existente; no se crea un CRM paralelo.</p></div><div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2"><SelectInput label="Filtrar por cliente" value={clientFilter} onChange={setClientFilter}><option value="">Todos los clientes</option>{workspace.clients.map((client) => <option key={client.id} value={client.id}>{client.display_name}</option>)}</SelectInput><StatusFilter value={statusFilter} onChange={setStatusFilter} /></div></div>{message && <p role="status" className="mt-3 text-[10px] text-muted">{message}</p>}<div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-[10.5px]"><thead><tr className="border-b border-line text-muted"><th className="py-2">Operación</th><th>Cliente</th><th>Coste</th><th>Margen previsto</th><th>Margen real</th><th className="w-48">Estado comercial</th></tr></thead><tbody>{filtered.map((operation) => { const financial = workspace.financials.find((row) => row.case_id === operation.id); const client = workspace.clients.find((row) => row.id === financial?.client_id); return <tr key={operation.id} className="border-b border-line-soft"><td className="py-3"><div className="font-medium text-ink">{operationName(operation)}</div><div className="mt-0.5 text-[9px] text-muted">{operation.vehicle_vin || operation.id.slice(0, 8)}</div></td><td>{client?.display_name ?? '—'}</td><td>{financial ? money(financial.total_cost) : '—'}</td><td>{financial?.planned_margin === null || financial?.planned_margin === undefined ? '—' : money(financial.planned_margin)}</td><td>{financial?.actual_margin === null || financial?.actual_margin === undefined ? '—' : money(financial.actual_margin)}</td><td><select aria-label={`Estado de ${operationName(operation)}`} value={operation.status} disabled={busyId === operation.id} onChange={(event) => void updateStatus(operation.id, event.target.value as ProfessionalOperationStatus)} className={`${inputClass} min-h-9 py-1.5`}>{operationStatusOptions()}</select></td></tr>; })}</tbody></table></div>{filtered.length === 0 && <p className="py-7 text-center text-[11px] text-muted">No hay operaciones que coincidan con los filtros.</p>}</section>;
}

function ClientsView({ workspace, onRefresh, error }: { workspace: ProfessionalWorkspaceData; onRefresh: () => Promise<void>; error: string | null }) {
  const [query, setQuery] = useState('');
  const [clientStatus, setClientStatus] = useState<'active' | 'archived' | ''>('active');
  const [selectedId, setSelectedId] = useState('');
  const [archiveBusy, setArchiveBusy] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const selected = workspace.clients.find((client) => client.id === selectedId) ?? null;
  const filtered = workspace.clients.filter((client) => {
    const matchesStatus = !clientStatus || client.status === clientStatus;
    const haystack = `${client.reference ?? ''} ${client.display_name} ${client.email ?? ''} ${client.tax_identifier ?? ''}`.toLowerCase();
    return matchesStatus && haystack.includes(query.trim().toLowerCase());
  });

  const changeArchive = async (client: ProfessionalClient) => {
    setArchiveBusy(client.id);
    setMessage(null);
    try {
      await apiRequest('/api/professional/clients', {
        method: 'PATCH',
        body: JSON.stringify({
          ...clientPayload(client),
          id: client.id,
          status: client.status === 'active' ? 'archived' : 'active',
        }),
      });
      setMessage(client.status === 'active' ? 'Cliente archivado.' : 'Cliente reactivado.');
      await onRefresh();
    } catch (cause) {
      setMessage(messageFrom(cause, 'No se ha podido cambiar el estado del cliente.'));
    } finally {
      setArchiveBusy('');
    }
  };

  return <Page title="Clientes" subtitle="Ficha, contacto e historial asociado a tus operaciones. No existen equipos ni acceso compartido.">{error && <ErrorMessage>{error}</ErrorMessage>}{message && <p role="status" className="mb-4 rounded-xl bg-bg p-3 text-[10.5px] text-ink-soft">{message}</p>}<div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><ClientEditor key={selected?.id ?? 'new'} initial={selected} onSaved={async () => { setSelectedId(''); await onRefresh(); }} onCancel={selected ? () => setSelectedId('') : undefined} /><section><div className="grid gap-2 sm:grid-cols-[1fr_170px]"><label className="relative block"><span className="sr-only">Buscar clientes</span><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, referencia, email o NIF" className="min-h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-[12px] outline-none focus:border-accent" /></label><SelectInput label="Estado del cliente" value={clientStatus} onChange={(value) => setClientStatus(value as typeof clientStatus)}><option value="">Todos</option><option value="active">Activos</option><option value="archived">Archivados</option></SelectInput></div><div className="mt-3 space-y-3">{filtered.map((client) => { const history = clientHistory(client.id, workspace); return <article key={client.id} className="rounded-[18px] border border-line bg-surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[9px] uppercase tracking-[.14em] text-muted"><span>{client.reference || 'Sin referencia'}</span>{client.status === 'archived' && <span className="rounded-full bg-bg-deep px-2 py-0.5">Archivado</span>}</div><h3 className="mt-1 font-serif text-[20px]">{client.display_name}</h3><p className="mt-1 text-[10.5px] text-ink-soft">{[client.email, client.phone, client.tax_identifier].filter(Boolean).join(' · ') || 'Sin datos de contacto adicionales'}</p>{client.address && <p className="mt-1 text-[10px] text-muted">{client.address}</p>}</div><Users size={16} className="text-accent-deep" /></div>{client.notes && <p className="mt-3 rounded-xl bg-bg p-3 text-[10.5px] leading-relaxed text-ink-soft">{client.notes}</p>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setSelectedId(client.id)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[10px]"><Pencil size={11} /> Editar ficha</button><button type="button" disabled={archiveBusy === client.id} onClick={() => void changeArchive(client)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[10px] disabled:opacity-50"><Archive size={11} /> {client.status === 'active' ? 'Archivar' : 'Reactivar'}</button></div><div className="mt-4 border-t border-line-soft pt-3"><div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[.12em] text-muted"><History size={11} /> Historial de operaciones</div>{history.length === 0 ? <p className="mt-2 text-[10px] text-muted">Sin operaciones asociadas.</p> : <div className="mt-2 space-y-2">{history.map(({ operation, financial }) => <div key={operation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bg p-2.5 text-[10px]"><div><div className="font-medium">{operationName(operation)}</div><div className="text-[9px] text-muted">{PROFESSIONAL_OPERATION_STATUS_LABELS[operation.status]} · actualizado {formatDate(operation.updated_at)}</div></div><div className="text-right"><div>{money(financial.total_cost)} coste</div><div className="text-[9px] text-muted">{financial.actual_margin === null ? 'Margen real pendiente' : `${money(financial.actual_margin)} margen`}</div></div></div>)}</div>}</div></article>; })}{filtered.length === 0 && <p className="rounded-xl bg-bg p-5 text-center text-[11px] text-muted">No hay clientes que coincidan.</p>}</div></section></div></Page>;
}

function ClientEditor({ initial, onSaved, onCancel }: { initial: ProfessionalClient | null; onSaved: () => Promise<void>; onCancel?: () => void }) {
  const [draft, setDraft] = useState<ProfessionalClientInput>(initial ? clientPayload(initial) : EMPTY_CLIENT);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const save = async () => {
    if (!draft.display_name.trim()) {
      setMessage('Indica el nombre visible del cliente.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await apiRequest<ProfessionalClient>('/api/professional/clients', {
        method: initial ? 'PATCH' : 'POST',
        body: JSON.stringify(initial ? { ...normalizeClient(draft), id: initial.id } : normalizeClient(draft)),
      });
      setMessage(initial ? 'Ficha actualizada.' : 'Cliente creado.');
      if (!initial) setDraft(EMPTY_CLIENT);
      await onSaved();
    } catch (cause) {
      setMessage(messageFrom(cause, 'No se ha podido guardar la ficha.'));
    } finally {
      setBusy(false);
    }
  };

  return <section className="rounded-[20px] border border-line bg-surface p-5"><h2 className="flex items-center gap-2 font-serif text-[23px]">{initial ? <Pencil size={17} /> : <Plus size={17} />} {initial ? 'Editar ficha' : 'Nuevo cliente'}</h2>{initial && <p className="mt-1 text-[10px] text-muted">Creado {formatDate(initial.created_at)} · actualizado {formatDate(initial.updated_at)}</p>}<div className="mt-4 space-y-3"><TextInput label="Referencia" value={draft.reference} onChange={(value) => setDraft({ ...draft, reference: value })} /><TextInput label="Nombre o razón visible" value={draft.display_name} onChange={(value) => setDraft({ ...draft, display_name: value ?? '' })} /><TextInput label="Email" type="email" value={draft.email} onChange={(value) => setDraft({ ...draft, email: value })} /><TextInput label="Teléfono" value={draft.phone} onChange={(value) => setDraft({ ...draft, phone: value })} /><TextInput label="Identificador fiscal" value={draft.tax_identifier} onChange={(value) => setDraft({ ...draft, tax_identifier: value })} /><TextArea label="Dirección" value={draft.address} onChange={(value) => setDraft({ ...draft, address: value })} /><TextArea label="Notas" value={draft.notes} onChange={(value) => setDraft({ ...draft, notes: value })} />{initial && <SelectInput label="Estado" value={draft.status} onChange={(value) => setDraft({ ...draft, status: value as ProfessionalClientInput['status'] })}><option value="active">Activo</option><option value="archived">Archivado</option></SelectInput>}</div><div className="mt-4 flex flex-wrap items-center justify-end gap-3">{message && <span role="status" className="text-[10px] text-muted">{message}</span>}{onCancel && <button type="button" onClick={onCancel} className="rounded-full border border-line px-4 py-2.5 text-[11px]">Cancelar</button>}<button type="button" disabled={busy} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[11px] text-white disabled:opacity-45">{busy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}{initial ? 'Guardar cambios' : 'Crear cliente'}</button></div></section>;
}

function ReportsView({ workspace, error }: { workspace: ProfessionalWorkspaceData; error: string | null }) {
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('');
  const [exportBusy, setExportBusy] = useState(false);
  const filteredOperations = useMemo(
    () => filterOperations(workspace, clientFilter, statusFilter),
    [clientFilter, statusFilter, workspace],
  );
  const operationIds = useMemo(() => new Set(filteredOperations.map((operation) => operation.id)), [filteredOperations]);
  const financials = workspace.financials.filter((row) => operationIds.has(row.case_id));
  const totalCost = financials.reduce((sum, row) => sum + Number(row.total_cost || 0), 0);
  const actualMargin = financials.reduce((sum, row) => sum + Number(row.actual_margin || 0), 0);

  const downloadCsv = async () => {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      const params = new URLSearchParams();
      if (clientFilter) params.set('client_id', clientFilter);
      if (statusFilter) params.set('status', statusFilter);
      const query = params.size ? `?${params.toString()}` : '';
      const response = await fetch(`/api/professional/export${query}`, { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(payload?.message || 'No se ha podido preparar la exportación.');
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `matriculapro-operaciones-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      window.alert(messageFrom(cause, 'No se ha podido preparar la exportación.'));
    } finally {
      setExportBusy(false);
    }
  };

  return <Page title="Informes y exportación" subtitle="Filtra por cliente y estado; el PDF y el CSV respetan exactamente la selección.">{error && <ErrorMessage>{error}</ErrorMessage>}<div className="grid gap-3 print:hidden sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]"><SelectInput label="Cliente" value={clientFilter} onChange={setClientFilter}><option value="">Todos los clientes</option>{workspace.clients.map((client) => <option key={client.id} value={client.id}>{client.display_name}</option>)}</SelectInput><StatusFilter value={statusFilter} onChange={setStatusFilter} /><button type="button" disabled={exportBusy} onClick={() => void downloadCsv()} className="mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[12px] text-white disabled:opacity-50">{exportBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Descargar CSV</button><button type="button" onClick={() => window.print()} className="mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-bg-deep px-5 py-2.5 text-[12px] text-ink"><Printer size={14} /> Guardar como PDF</button></div><section className="mt-6 rounded-[20px] border border-line bg-white p-6 print:border-0 print:p-0"><header className="flex flex-wrap items-start justify-between gap-5 border-b border-line pb-5"><div className="flex min-w-0 items-start gap-4">{workspace.profile.logo_url && <img src={workspace.profile.logo_url} alt={`Logotipo de ${workspace.profile.business_display_name || 'la empresa'}`} className="h-16 w-24 shrink-0 rounded-lg border border-line object-contain p-1" referrerPolicy="no-referrer" />}<div><div className="text-[9px] uppercase tracking-[.18em] text-muted">Informe profesional · generado {new Date().toLocaleDateString('es-ES')}</div><h2 className="mt-2 font-serif text-[28px]">{workspace.profile.business_display_name || 'Datos comerciales pendientes'}</h2><p className="mt-1 text-[10.5px] text-ink-soft">{[workspace.profile.tax_identifier, workspace.profile.contact_email, workspace.profile.contact_phone].filter(Boolean).join(' · ')}</p>{workspace.profile.business_address && <p className="mt-1 max-w-xl whitespace-pre-line text-[10px] leading-relaxed text-muted">{workspace.profile.business_address}</p>}</div></div><div className="grid grid-cols-2 gap-2 text-right"><div><div className="font-serif text-lg">{money(totalCost)}</div><div className="text-[8.5px] uppercase text-muted">Coste filtrado</div></div><div><div className="font-serif text-lg">{money(actualMargin)}</div><div className="text-[8.5px] uppercase text-muted">Margen real</div></div></div></header><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[820px] text-left text-[10px]"><thead><tr className="border-b border-line text-muted"><th className="py-2">Operación</th><th>Estado</th><th>Cliente</th><th>Coste</th><th>Objetivo</th><th>Margen previsto</th><th>Real</th><th>Margen real</th></tr></thead><tbody>{financials.map((row) => { const operation = workspace.operations.find((item) => item.id === row.case_id); const client = workspace.clients.find((item) => item.id === row.client_id); return <tr key={row.id} className="border-b border-line-soft"><td className="py-3">{operation ? operationName(operation) : row.case_id.slice(0, 8)}</td><td>{operation ? PROFESSIONAL_OPERATION_STATUS_LABELS[operation.status] : '—'}</td><td>{client?.display_name ?? '—'}</td><td>{money(row.total_cost)}</td><td>{optionalMoney(row.target_sale_price)}</td><td>{optionalMoney(row.planned_margin)}</td><td>{optionalMoney(row.actual_sale_price)}</td><td>{optionalMoney(row.actual_margin)}</td></tr>; })}</tbody></table></div>{financials.length === 0 && <p className="py-8 text-center text-[11px] text-muted">No hay finanzas que coincidan con los filtros.</p>}{workspace.profile.report_footer && <footer className="mt-6 whitespace-pre-line border-t border-line pt-4 text-[9.5px] text-muted">{workspace.profile.report_footer}</footer>}</section><p className="mt-3 text-[10px] leading-relaxed text-muted print:hidden">La salida PDF utiliza el diálogo de impresión del navegador. Revisa el logotipo, la dirección y los datos fiscales antes de compartirla.</p></Page>;
}

function filterOperations(workspace: ProfessionalWorkspaceData, clientId: string, status: FilterStatus) {
  return workspace.operations.filter((operation) => {
    if (status && operation.status !== status) return false;
    if (!clientId) return true;
    return workspace.financials.some((financial) => financial.case_id === operation.id && financial.client_id === clientId);
  });
}

function clientHistory(clientId: string, workspace: ProfessionalWorkspaceData) {
  return workspace.financials.flatMap((financial) => {
    if (financial.client_id !== clientId) return [];
    const operation = workspace.operations.find((item) => item.id === financial.case_id);
    return operation ? [{ operation, financial }] : [];
  }).sort((a, b) => b.operation.updated_at.localeCompare(a.operation.updated_at));
}

function StatusFilter({ value, onChange }: { value: FilterStatus; onChange: (value: FilterStatus) => void }) {
  return <SelectInput label="Estado comercial" value={value} onChange={(next) => onChange(next as FilterStatus)}><option value="">Todos los estados</option>{operationStatusOptions()}</SelectInput>;
}

function operationStatusOptions() {
  return Object.entries(PROFESSIONAL_OPERATION_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>);
}

function clientPayload(client: ProfessionalClient): ProfessionalClientInput {
  return {
    reference: client.reference,
    display_name: client.display_name,
    email: client.email,
    phone: client.phone,
    tax_identifier: client.tax_identifier,
    address: client.address,
    notes: client.notes,
    status: client.status,
  };
}

function normalizeClient(client: ProfessionalClientInput): ProfessionalClientInput {
  return {
    reference: clean(client.reference),
    display_name: client.display_name.trim(),
    email: clean(client.email),
    phone: clean(client.phone),
    tax_identifier: clean(client.tax_identifier),
    address: clean(client.address),
    notes: clean(client.notes),
    status: client.status,
  };
}

function normalizeProfile(profile: ProfessionalProfile): ProfessionalProfile {
  return {
    business_display_name: clean(profile.business_display_name),
    tax_identifier: clean(profile.tax_identifier),
    business_address: clean(profile.business_address),
    contact_email: clean(profile.contact_email),
    contact_phone: clean(profile.contact_phone),
    logo_url: clean(profile.logo_url),
    report_footer: clean(profile.report_footer),
  };
}

async function apiRequest<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: init?.body
      ? { 'Content-Type': 'application/json', ...init.headers }
      : init?.headers,
  });
  const payload = await response.json().catch(() => null) as { data?: T; message?: string } | null;
  if (!response.ok) throw new Error(payload?.message || 'La operación no se ha podido completar.');
  return payload?.data as T;
}

function operationName(operation: ProfessionalOperation) {
  return [operation.vehicle_make, operation.vehicle_model].filter(Boolean).join(' ') || operation.title || `Operación ${operation.id.slice(0, 8)}`;
}

function clean(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function messageFrom(cause: unknown, fallback: string) {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(value));
}

function Page({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const printable = title === 'Informes y exportación';
  return <div className={`mx-auto max-w-[1220px] px-5 pb-16 pt-7 lg:px-8 ${printable ? 'professional-print-page print-report' : ''}`}>
    <header className={printable ? 'print-shell-hidden' : undefined}><div className="text-[9.5px] uppercase tracking-[.2em] text-accent-deep">Profesional</div><h1 className="mt-1 font-serif text-[38px] text-ink">{title}</h1><p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-ink-soft">{subtitle}</p></header>
    <nav className="print-shell-hidden mt-5 flex flex-wrap gap-2 print:hidden"><Tab href="/app/profesional">Operaciones</Tab><Tab href="/app/profesional/clientes">Clientes</Tab><Tab href="/app/profesional/informes">Informes</Tab></nav>
    <div className="mt-6">{children}</div>
  </div>;
}
function Tab({ href, children }: { href: string; children: React.ReactNode }) { return <Link href={href} className="rounded-full border border-line bg-surface px-4 py-2 text-[11px] text-ink hover:border-accent">{children}</Link>; }
function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) { return <div className="rounded-2xl border border-line bg-surface p-4"><div className="font-serif text-[27px]">{value}</div><div className="mt-1 text-[9px] uppercase tracking-[.13em] text-muted">{label}</div>{detail && <div className="mt-1 text-[9px] text-ink-soft">{detail}</div>}</div>; }
function TextInput({ label, value, onChange, type = 'text' }: { label: string; value: string | null; onChange: (value: string | null) => void; type?: string }) { return <label className="block"><span className="mb-1 block text-[9.5px] font-medium text-ink">{label}</span><input type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value || null)} className={inputClass} /></label>; }
function TextArea({ label, value, onChange }: { label: string; value: string | null; onChange: (value: string | null) => void }) { return <label className="block"><span className="mb-1 block text-[9.5px] font-medium text-ink">{label}</span><textarea rows={2} value={value ?? ''} onChange={(event) => onChange(event.target.value || null)} className={inputClass} /></label>; }
function NumberInput({ label, value, onChange }: { label: string; value: number | null | undefined; onChange: (value: number | null) => void }) { return <label><span className="mb-1 block text-[9.5px] font-medium text-ink">{label}</span><div className="relative"><input type="number" min="0" step="0.01" value={value ?? ''} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} className={`${inputClass} pr-8`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-muted">€</span></div></label>; }
function SelectInput({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <label><span className="mb-1 block text-[9.5px] font-medium text-ink">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>{children}</select></label>; }
function SaveRow({ busy, message, onSave, label = 'Guardar' }: { busy: boolean; message: string | null; onSave: () => Promise<void>; label?: string }) { return <div className="mt-4 flex flex-wrap items-center justify-end gap-3">{message && <span role="status" className="text-[10px] text-muted">{message}</span>}<button type="button" disabled={busy} onClick={() => void onSave()} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[11px] text-white disabled:opacity-45">{busy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}{label}</button></div>; }
function ErrorMessage({ children }: { children: React.ReactNode }) { return <div className="mb-4 rounded-xl bg-danger-soft p-3 text-[11px] text-danger">{children}</div>; }
const inputClass = 'min-h-10 w-full rounded-xl border border-line bg-bg px-3 py-2 text-[12px] text-ink outline-none focus:border-accent';
function money(value: number | null | undefined) { return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value ?? 0)); }
function optionalMoney(value: number | null | undefined) { return value === null || value === undefined ? '—' : money(value); }
