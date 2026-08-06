'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  FiscalCatalogSearchResponse,
  FiscalCatalogVehicle,
} from '@/lib/fiscal/catalog-api';

const EMPTY_RESPONSE: FiscalCatalogSearchResponse = {
  status: 'invalid-query',
  query: '',
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
  catalogVersion: null,
  sourceChecksum: null,
  results: [],
};

export function useFiscalCatalogSearch(query: string, page: number) {
  const [response, setResponse] = useState<FiscalCatalogSearchResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setResponse({ ...EMPTY_RESPONSE, query: normalizedQuery });
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const parameters = new URLSearchParams({
          q: normalizedQuery,
          page: String(page),
          pageSize: '10',
        });
        const request = await fetch(`/api/fiscal/vehicle-catalog?${parameters}`, {
          method: 'GET',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        const payload = await request.json() as FiscalCatalogSearchResponse;
        setResponse(payload);
        if (!request.ok && payload.status !== 'catalog-unavailable') {
          setError(payload.message ?? 'No se ha podido consultar el catálogo oficial.');
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : 'No se ha podido consultar el catálogo oficial.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [normalizedQuery, page]);

  return {
    response,
    results: response.results as FiscalCatalogVehicle[],
    loading,
    error,
  };
}

