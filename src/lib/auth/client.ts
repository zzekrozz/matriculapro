/**
 * auth/client.ts
 *
 * Capa de abstracción de auth. Hoy usa localStorage (mock).
 * Cuando conectemos Supabase, solo hay que cambiar este archivo.
 *
 * TODO: sustituir las funciones por llamadas a `supabase.auth.*`
 */

import type { AuthResult, LoginPayload, RegisterPayload, UserProfile } from './types';

// ============================================================
// Supabase client — descomentar cuando se conecte
// ============================================================
// import { createClient } from '@supabase/supabase-js';
// export const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
// );

// ============================================================
// Helpers mock (localStorage)
// ============================================================

const STORAGE_KEY = 'mpro:mock-user';

function getMockUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveMockUser(user: UserProfile): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function clearMockUser(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// ============================================================
// API pública (misma interfaz que tendrá Supabase)
// ============================================================

/**
 * Obtiene el usuario actual (mock: desde localStorage).
 * Con Supabase: supabase.auth.getUser()
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  return getMockUser();
}

/**
 * Registra un nuevo usuario (mock: crea perfil en localStorage).
 * Con Supabase: supabase.auth.signUp()
 */
export async function register(payload: RegisterPayload): Promise<AuthResult> {
  const user: UserProfile = {
    id: `mock-${Date.now()}`,
    email: payload.email,
    displayName: payload.displayName,
    displayMode: 'alias',
    accessLevel: 'explorer',
    founderNumber: null,
    founderActivatedAt: null,
    createdAt: new Date().toISOString(),
  };
  saveMockUser(user);
  return { ok: true, profile: user };
}

/**
 * Login (mock: valida que exista un perfil guardado con ese email).
 * Con Supabase: supabase.auth.signInWithPassword()
 */
export async function login(payload: LoginPayload): Promise<AuthResult> {
  const existing = getMockUser();
  if (!existing || existing.email !== payload.email) {
    return { ok: false, error: 'Usuario no encontrado. Regístrate primero.' };
  }
  return { ok: true, profile: existing };
}

/**
 * Logout (mock: borra el perfil de localStorage).
 * Con Supabase: supabase.auth.signOut()
 */
export async function logout(): Promise<void> {
  clearMockUser();
}

/**
 * Activa el acceso Founder para el usuario actual.
 * Con Supabase: llamar a la función RPC `activate_founder`.
 */
export async function activateFounderAccess(opts?: { alias?: string }): Promise<AuthResult> {
  const user = getMockUser();
  if (!user) return { ok: false, error: 'No hay usuario activo.' };

  // Mock: asignar número correlativo (en producción lo calcula Supabase con la secuencia)
  const founderNumber = 7; // Próximo disponible mock
  const updated: UserProfile = {
    ...user,
    accessLevel: 'founder',
    founderNumber,
    founderAlias: opts?.alias ?? user.founderAlias,
    founderActivatedAt: new Date().toISOString(),
  };
  saveMockUser(updated);
  return { ok: true, profile: updated };
}

/**
 * Actualiza el perfil del usuario actual.
 * Con Supabase: supabase.from('profiles').update(...)
 */
export async function updateProfile(updates: Partial<UserProfile>): Promise<AuthResult> {
  const user = getMockUser();
  if (!user) return { ok: false, error: 'No hay usuario activo.' };
  const updated = { ...user, ...updates };
  saveMockUser(updated);
  return { ok: true, profile: updated };
}
