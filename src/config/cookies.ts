export type CookieInventoryItem = {
  name: string;
  provider: string;
  purpose: string;
  category: 'necessary' | 'preferences' | 'analytics' | 'marketing';
  duration: string;
  firstOrThirdParty: 'first_party' | 'third_party';
  condition?: string;
};

export const COOKIE_INVENTORY_REVIEW_DATE = '5 de agosto de 2026';

export const cookieInventory: readonly CookieInventoryItem[] = [
  {
    name: 'sb-<referencia-proyecto>-auth-token (y fragmentos .0, .1… cuando proceda)',
    provider: 'Supabase Auth, servida desde MatriculaPro',
    purpose:
      'Mantener la sesión iniciada y renovar de forma segura los tokens de autenticación.',
    category: 'necessary',
    duration: 'Sesión persistente según la caducidad configurada en Supabase; se elimina al cerrar sesión.',
    firstOrThirdParty: 'first_party',
    condition: 'Solo después de registrarse o iniciar sesión.',
  },
  {
    name: 'mpro-recovery-state',
    provider: 'MatriculaPro',
    purpose:
      'Vincular la solicitud de recuperación con su callback y bloquear enlaces iniciados desde otro navegador.',
    category: 'necessary',
    duration: '15 minutos; HttpOnly y eliminada al completar o invalidar el callback.',
    firstOrThirdParty: 'first_party',
    condition: 'Solo al solicitar restablecer la contraseña.',
  },
  {
    name: 'mpro-recovery-authorized',
    provider: 'MatriculaPro',
    purpose:
      'Autorizar durante una ventana breve el formulario que establece la nueva contraseña tras un callback válido.',
    category: 'necessary',
    duration: '10 minutos; HttpOnly y eliminada tras usarla o cerrar el flujo.',
    firstOrThirdParty: 'first_party',
    condition: 'Solo después de validar un enlace de recuperación.',
  },
  {
    name: '__stripe_mid',
    provider: 'Stripe',
    purpose: 'Prevención del fraude y funcionamiento seguro del pago alojado por Stripe.',
    category: 'necessary',
    duration: 'Hasta 1 año, según la configuración vigente de Stripe.',
    firstOrThirdParty: 'third_party',
    condition: 'Solo al abandonar MatriculaPro para entrar en Stripe Checkout.',
  },
  {
    name: '__stripe_sid',
    provider: 'Stripe',
    purpose: 'Prevención del fraude y funcionamiento seguro de la sesión de pago.',
    category: 'necessary',
    duration: 'Aproximadamente 30 minutos, según la configuración vigente de Stripe.',
    firstOrThirdParty: 'third_party',
    condition: 'Solo durante Stripe Checkout.',
  },
] as const;

export const analyticsOrMarketingCookies = cookieInventory.filter(
  ({ category }) => category === 'analytics' || category === 'marketing',
);

export const usesOptionalTrackingCookies = analyticsOrMarketingCookies.length > 0;
