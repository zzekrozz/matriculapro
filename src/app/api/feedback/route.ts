import { NextResponse, type NextRequest } from 'next/server';

/**
 * POST /api/feedback
 *
 * Recibe feedback de Founders y lo envía por email.
 *
 * Body esperado:
 * {
 *   message: string;
 *   founderNumber?: number;
 *   userEmail?: string;
 *   accessLevel: string;
 * }
 *
 * TODO: conectar con Resend, Supabase Edge Function o SendGrid.
 * El destinatario privado está solo en el servidor, nunca en el cliente.
 *
 * Para activar el envío real:
 * 1. Instalar Resend: npm install resend
 * 2. Añadir RESEND_API_KEY en variables de entorno de Vercel
 * 3. Descomentar el bloque de Resend más abajo
 */

// Email privado — SOLO en el servidor, nunca expuesto al cliente
const PRIVATE_RECIPIENT = process.env.FEEDBACK_RECIPIENT_EMAIL ?? 'pogrebnyakivan123@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const { message, founderNumber, userEmail, accessLevel } = await request.json();

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return NextResponse.json({ error: 'Mensaje demasiado corto.' }, { status: 400 });
    }

    const founderTag = founderNumber ? `Founder #${String(founderNumber).padStart(4, '0')}` : 'Explorer';
    const subject = `[MatriculaPRO Feedback] ${founderTag}`;
    const body = [
      `Nivel: ${accessLevel}`,
      founderNumber ? `Founder: #${String(founderNumber).padStart(4, '0')}` : '',
      userEmail ? `Email usuario: ${userEmail}` : '',
      '',
      '--- Mensaje ---',
      message.trim(),
    ].filter(Boolean).join('\n');

    // ── OPCIÓN A: Resend (descomentar cuando se configure) ──────────────────
    // import { Resend } from 'resend';
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'MatriculaPRO <noreply@ivanimports.es>',
    //   to: PRIVATE_RECIPIENT,
    //   subject,
    //   text: body,
    // });
    // ──────────────────────────────────────────────────────────────────────

    // ── OPCIÓN B: Supabase Edge Function (descomentar cuando se configure) ─
    // await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-feedback`, {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    //   body: JSON.stringify({ to: PRIVATE_RECIPIENT, subject, body }),
    // });
    // ──────────────────────────────────────────────────────────────────────

    // ── MODO SIN BACKEND: log en servidor ──────────────────────────────────
    console.log('[Feedback recibido]', { to: PRIVATE_RECIPIENT, subject, body });
    // ──────────────────────────────────────────────────────────────────────

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Feedback API error]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
