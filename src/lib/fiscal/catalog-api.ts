export interface FiscalCatalogVehicle {
  id: string;
  catalogYear: number;
  sourceOrder: string;
  sourceAnnex: string;
  brand: string;
  model: string;
  version: string | null;
  commercialStartYear: number | null;
  commercialEndYear: number | null;
  fuelType: string | null;
  engineCapacityCc: number | null;
  cylinders: number | null;
  powerKw: number | null;
  fiscalPower: number | null;
  co2Gkm: number | null;
  newVehicleOfficialValue: number;
  officialRowReference: string;
  normalizedSearchText: string;
  sourceChecksum: string;
}

export type FiscalCatalogApiStatus = 'ready' | 'catalog-unavailable' | 'invalid-query';

export interface FiscalCatalogSearchResponse {
  status: FiscalCatalogApiStatus;
  query: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  catalogVersion: string | null;
  sourceChecksum: string | null;
  results: FiscalCatalogVehicle[];
  message?: string;
}
