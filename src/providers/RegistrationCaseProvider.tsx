'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DocumentStatus, DocumentType, RegistrationCase, TaxCalculation } from '@/domain/registration';
import type { Model576Calculation } from '@/domain/registration/fiscal/types';
import type { Model576ApiRequest } from '@/lib/fiscal/calculation-api';
import {
  loadPersistedCases,
  loadPersistedChecklistItems,
  loadPersistedDocuments,
  loadPersistedTaxCalculations,
  savePersistedCase,
  savePersistedChecklistItem,
  savePersistedDocument,
  savePersistedTaxCalculation,
  type CaseChecklistRecord,
  type CaseDocumentRecord,
  type StoredTaxCalculation,
} from '@/lib/registration/case-repository';
import { useAccess } from '@/providers/AccessProvider';
import { useAuth } from '@/providers/AuthProvider';

interface RegistrationCaseContextValue {
  cases: RegistrationCase[];
  activeCase: RegistrationCase | null;
  loading: boolean;
  error: string | null;
  /** True while the authenticated user can persist full cases. */
  persistent: boolean;
  refresh: () => Promise<void>;
  getCase: (id: string) => RegistrationCase | null;
  saveCase: (registrationCase: RegistrationCase) => Promise<RegistrationCase>;
  setActiveCaseId: (id: string) => void;
  getDocument: (caseId: string, type: DocumentType) => CaseDocumentRecord | null;
  updateDocument: (document: CaseDocumentRecord) => Promise<CaseDocumentRecord>;
  getLatestTaxCalculation: (caseId: string) => StoredTaxCalculation | null;
  getTaxCalculationHistory: (caseId: string) => StoredTaxCalculation[];
  saveTaxCalculation: (calculation: TaxCalculation) => Promise<StoredTaxCalculation>;
  saveFiscalCalculation: (caseId: string, input: Model576ApiRequest, calculation: Model576Calculation) => Promise<StoredTaxCalculation>;
  getChecklistItem: (caseId: string, checklistKey: string, itemKey: string) => CaseChecklistRecord | null;
  updateChecklistItem: (item: CaseChecklistRecord) => Promise<CaseChecklistRecord>;
}

const RegistrationCaseContext = createContext<RegistrationCaseContextValue | null>(null);

export function RegistrationCaseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { canViewPaidCases, canManageFullCases, publicBeta, loading: accessLoading } = useAccess();
  const persistent = Boolean(user && canManageFullCases);
  const [cases, setCases] = useState<RegistrationCase[]>([]);
  const [documents, setDocuments] = useState<CaseDocumentRecord[]>([]);
  const [taxCalculations, setTaxCalculations] = useState<StoredTaxCalculation[]>([]);
  const [checklistItems, setChecklistItems] = useState<CaseChecklistRecord[]>([]);
  const [activeCaseId, setActiveCaseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user || !canViewPaidCases) {
        setCases([]);
        setDocuments([]);
        setTaxCalculations([]);
        setChecklistItems([]);
        setActiveCaseId('');
        return;
      }
      const loaded = await loadPersistedCases(user.id, publicBeta);
      setCases(loaded);
      setActiveCaseId((current) => loaded.some((item) => item.id === current) ? current : (loaded[0]?.id ?? ''));
      const caseIds = loaded.map((item) => item.id);
      const [nextDocuments, nextTaxes, nextChecklist] = await Promise.all([
        loadPersistedDocuments(user.id, caseIds, publicBeta),
        loadPersistedTaxCalculations(user.id, caseIds, publicBeta),
        loadPersistedChecklistItems(user.id, caseIds, publicBeta),
      ]);
      setDocuments(nextDocuments);
      setTaxCalculations(nextTaxes);
      setChecklistItems(nextChecklist);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se han podido cargar los expedientes.');
    } finally {
      setLoading(false);
    }
  }, [canViewPaidCases, publicBeta, user]);

  useEffect(() => {
    if (!accessLoading) void refresh();
  }, [accessLoading, refresh]);

  const requireWritable = useCallback(() => {
    if (!persistent || !user) throw new Error('Tu cuenta no puede modificar expedientes en este momento.');
    return user;
  }, [persistent, user]);

  const saveCase = useCallback(async (registrationCase: RegistrationCase) => {
    const currentUser = requireWritable();
    const now = new Date().toISOString();
    const normalized: RegistrationCase = {
      ...registrationCase,
      userId: currentUser.id,
      mode: 'case',
      updatedAt: now,
      createdAt: registrationCase.createdAt || now,
    };
    await savePersistedCase(normalized, currentUser.id, publicBeta);
    setCases((current) => [normalized, ...current.filter((item) => item.id !== normalized.id)]);
    setActiveCaseId(normalized.id);
    return normalized;
  }, [publicBeta, requireWritable]);

  const getCase = useCallback((id: string) => cases.find((item) => item.id === id) ?? null, [cases]);
  const getDocument = useCallback((caseId: string, type: DocumentType) => documents.find((item) => item.caseId === caseId && item.type === type) ?? null, [documents]);
  const updateDocument = useCallback(async (document: CaseDocumentRecord) => {
    const currentUser = requireWritable();
    const saved = await savePersistedDocument(document, currentUser.id, publicBeta);
    setDocuments((current) => [saved, ...current.filter((item) => item.id ? item.id !== saved.id : !(item.caseId === saved.caseId && item.type === saved.type))]);
    return saved;
  }, [publicBeta, requireWritable]);

  const getLatestTaxCalculation = useCallback((caseId: string) => taxCalculations.filter((item) => item.caseId === caseId).sort((a, b) => b.calculatedAt.localeCompare(a.calculatedAt))[0] ?? null, [taxCalculations]);
  const getTaxCalculationHistory = useCallback((caseId: string) => taxCalculations.filter((item) => item.caseId === caseId).sort((a, b) => b.calculatedAt.localeCompare(a.calculatedAt)), [taxCalculations]);
  const saveTaxCalculation = useCallback(async (calculation: TaxCalculation) => {
    if (!calculation.caseId) throw new Error('Falta el expediente asociado al cálculo.');
    const currentUser = requireWritable();
    const saved = await savePersistedTaxCalculation(calculation, currentUser.id, undefined, publicBeta);
    setTaxCalculations((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    return saved;
  }, [publicBeta, requireWritable]);
  const saveFiscalCalculation = useCallback(async (caseId: string, input: Model576ApiRequest, calculation: Model576Calculation) => {
    const currentUser = requireWritable();
    const legacy: TaxCalculation = {
      caseId,
      taxableBase: calculation.box01TaxableBase,
      marketValue: calculation.marketValueAfterDepreciation,
      co2GKm: input.vehicle.co2GKm,
      category: input.vehicle.category,
      autonomousCommunity: input.currentAutonomousCommunity,
      epigraph: calculation.epigraph !== null && calculation.epigraph <= 5 ? calculation.epigraph as TaxCalculation['epigraph'] : null,
      rate: calculation.currentIedmtRateForLiquidation,
      estimatedQuota: calculation.box08FinalResult,
      calculatedAt: calculation.calculatedAt,
      sourceIds: calculation.sourceIds,
    };
    const saved = await savePersistedTaxCalculation(legacy, currentUser.id, { input, calculation }, publicBeta);
    setTaxCalculations((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    return saved;
  }, [publicBeta, requireWritable]);

  const getChecklistItem = useCallback((caseId: string, checklistKey: string, itemKey: string) => checklistItems.find((item) => item.caseId === caseId && item.checklistKey === checklistKey && item.itemKey === itemKey) ?? null, [checklistItems]);
  const updateChecklistItem = useCallback(async (item: CaseChecklistRecord) => {
    const currentUser = requireWritable();
    const saved = await savePersistedChecklistItem(item, currentUser.id, publicBeta);
    setChecklistItems((current) => [saved, ...current.filter((existing) => !(existing.caseId === saved.caseId && existing.checklistKey === saved.checklistKey && existing.itemKey === saved.itemKey))]);
    return saved;
  }, [publicBeta, requireWritable]);

  const activeCase = cases.find((item) => item.id === activeCaseId) ?? cases[0] ?? null;
  const value = useMemo<RegistrationCaseContextValue>(() => ({
    cases,
    activeCase,
    loading: loading || accessLoading,
    error,
    persistent,
    refresh,
    getCase,
    saveCase,
    setActiveCaseId,
    getDocument,
    updateDocument,
    getLatestTaxCalculation,
    getTaxCalculationHistory,
    saveTaxCalculation,
    saveFiscalCalculation,
    getChecklistItem,
    updateChecklistItem,
  }), [accessLoading, activeCase, cases, error, getCase, getChecklistItem, getDocument, getLatestTaxCalculation, getTaxCalculationHistory, loading, persistent, refresh, saveCase, saveFiscalCalculation, saveTaxCalculation, updateChecklistItem, updateDocument]);

  return <RegistrationCaseContext.Provider value={value}>{children}</RegistrationCaseContext.Provider>;
}

export function useRegistrationCases() {
  const context = useContext(RegistrationCaseContext);
  if (!context) throw new Error('useRegistrationCases must be used within RegistrationCaseProvider');
  return context;
}

export function createDocumentDraft(caseId: string, type: DocumentType, status: DocumentStatus = 'pending'): CaseDocumentRecord {
  return { caseId, type, status, fileName: null, storagePath: null, issuer: null, documentNumber: null, documentDate: null, notes: '', incident: '', manuallyVerified: false };
}
