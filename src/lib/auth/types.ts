/**
 * auth/types.ts
 *
 * Estructura prevista para el perfil de usuario cuando conectemos Supabase.
 * Todas las interfaces están listas para mapear a la tabla `profiles` de Supabase.
 *
 * ESTADO: pendiente de conexión real.
 * TODO: conectar con Supabase Auth + tabla profiles cuando se active el login.
 */

import type { AccessLevel } from '@/providers/AccessProvider';

/** Modos de visualización en el Garaje Fundador */
export type DisplayMode = 'name' | 'initials' | 'alias' | 'anonymous';

/**
 * Perfil de usuario completo.
 * Corresponde a la tabla `profiles` de Supabase (ver schema.sql).
 */
export interface UserProfile {
  /** UUID de Supabase Auth */
  id: string;
  email: string;
  /** Nombre completo (opcional) */
  displayName?: string | null;
  /** Alias personalizado para el Garaje Fundador */
  founderAlias?: string | null;
  /** Cómo el usuario decide aparecer en el Garaje Fundador */
  displayMode: DisplayMode;
  /** Nivel de acceso actual */
  accessLevel: AccessLevel;
  /** Número de Fundador asignado (null si no es Founder) */
  founderNumber?: number | null;
  /** Fecha de activación del acceso Founder (ISO string) */
  founderActivatedAt?: string | null;
  /** Fecha de creación del perfil (ISO string) */
  createdAt: string;
  /** Metadata libre para flags futuros */
  meta?: Record<string, unknown>;
}

/**
 * Datos mínimos para crear un perfil en el registro.
 */
export interface RegisterPayload {
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Datos mínimos para el login.
 */
export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * Respuesta mock de auth (antes de Supabase).
 */
export interface AuthResult {
  ok: boolean;
  profile?: UserProfile;
  error?: string;
}
