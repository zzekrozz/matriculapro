import { NextRequest, NextResponse } from 'next/server';
import { searchFiscalCatalog } from '@/server/fiscal/catalog-search';
import { AuthenticationRequiredError, requireServerCapability } from '@/server/access/current-access';
import { rateLimitedResponse } from '@/server/security/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let userId: string;
  try {
    userId = (await requireServerCapability('run_fiscal_calculations')).userId;
  } catch (error) {
    return NextResponse.json({ status: 'access-denied', message: error instanceof AuthenticationRequiredError ? 'Debes iniciar sesión.' : 'Necesitas una licencia activa para consultar el catálogo.' }, { status: error instanceof AuthenticationRequiredError ? 401 : 403 });
  }
  const limited = await rateLimitedResponse(request, `fiscal:catalog:${userId}`, { limit: 240, windowSeconds: 3_600 });
  if (limited) return limited;
  const startedAt = performance.now();
  const query = request.nextUrl.searchParams.get('q') ?? '';
  const page = positiveInteger(request.nextUrl.searchParams.get('page'), 1);
  const pageSize = positiveInteger(request.nextUrl.searchParams.get('pageSize'), 10);

  try {
    const response = await searchFiscalCatalog({ query, page, pageSize });
    const status = response.status === 'catalog-unavailable' ? 503 : response.status === 'invalid-query' ? 400 : 200;
    return NextResponse.json(response, {
      status,
      headers: {
        'Cache-Control': 'private, max-age=0, must-revalidate',
        'Server-Timing': `fiscal-catalog;dur=${(performance.now() - startedAt).toFixed(1)}`,
      },
    });
  } catch {
    return NextResponse.json({
      status: 'catalog-unavailable',
      query: query.trim(),
      page,
      pageSize,
      total: 0,
      totalPages: 0,
      catalogVersion: null,
      sourceChecksum: null,
      results: [],
      message: 'El catálogo oficial no se ha podido validar. El cálculo con tablas queda bloqueado.',
    }, { status: 503 });
  }
}

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
