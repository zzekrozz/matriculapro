export type ModuleState =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'locked'
  | 'alert'
  | 'recommended'
  | 'special'
  | 'premium';

export interface ModuleDef {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string; // nombre del icono lucide
  href: string;
  state: ModuleState;
  hot?: boolean;
  premium?: boolean;
}

export interface RouteStep {
  n: number;
  id: string;
  title: string;
  icon: string;
  brief: string;
  what: string;
  needs: string[];
  errors: string[];
  delicate?: boolean;
}

export interface ITVStep {
  id: string;
  n: number;
  title: string;
  icon: string;
  zones: string[];
  labels?: Record<string, string>;
  pide: string;
  haces: string;
  revisas: string[];
  inspector: string;
  showBrakeMeter?: boolean;
}
