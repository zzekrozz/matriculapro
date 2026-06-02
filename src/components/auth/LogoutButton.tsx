'use client';

import { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

export function LogoutButton({ className }: { className?: string }) {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);

    // signOut ya limpia estado y cookies antes de llamar a Supabase
    await signOut().catch(() => { /* ignorar errores */ });

    // Redirigir con replace para no dejar el dashboard en el historial
    // Usamos window.location para forzar una recarga limpia del servidor
    window.location.replace('/');
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={className ?? 'text-[10.5px] text-muted hover:text-white flex items-center gap-1.5 px-3 py-1 transition-colors'}>
      {loading ? <Loader2 size={11} className="animate-spin" /> : <LogOut size={11} />}
      {loading ? 'Cerrando…' : 'Cerrar sesión'}
    </button>
  );
}
