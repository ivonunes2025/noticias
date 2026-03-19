    // src/pages/api/newsletter.ts
// Endpoint para subscrever/cancelar subscrição da newsletter
// Suporta dois casos:
//   1. Utilizador autenticado → atualiza o campo newsletter_subscrito no User do Strapi
//   2. Visitante anónimo → cria entrada na coleção newsletter-subscritores

import type { APIRoute } from 'astro';

const STRAPI = import.meta.env.STRAPI_URL?.replace(/\/$/, '');
const TOKEN  = import.meta.env.STRAPI_API_TOKEN;

const headers = (extra: Record<string, string> = {}) => ({
  'Content-Type': 'application/json',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
  ...extra,
});

// ── POST /api/newsletter ──────────────────────────────────────────────────────
// Body esperado:
//   { email: string, subscrito: boolean }          ← visitante anónimo
//   { subscrito: boolean }                          ← utilizador autenticado (JWT no cookie)
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const jwt  = cookies.get('jwt')?.value;

    // ── Caso 1: Utilizador autenticado ────────────────────────────────────────
    if (jwt) {
      // Obtém o ID do utilizador atual via /users/me
      const meRes = await fetch(`${STRAPI}/api/users/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (!meRes.ok) {
        return json({ error: 'Sessão inválida.' }, 401);
      }

      const me = await meRes.json();

      // Atualiza o campo newsletter_subscrito no User
      const updateRes = await fetch(`${STRAPI}/api/users/${me.id}`, {
        method: 'PUT',
        headers: { ...headers(), Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ newsletter_subscrito: body.subscrito ?? true }),
      });

      if (!updateRes.ok) {
        return json({ error: 'Erro ao atualizar preferências.' }, 500);
      }

      return json({ success: true, subscrito: body.subscrito ?? true });
    }

    // ── Caso 2: Visitante anónimo ─────────────────────────────────────────────
    const { email } = body;

    if (!email || !email.includes('@')) {
      return json({ error: 'Email inválido.' }, 400);
    }

    // Verifica se o email já existe na coleção
    const existRes = await fetch(
      `${STRAPI}/api/newsletter-subscritores?filters[email][$eq]=${encodeURIComponent(email)}`,
      { headers: headers() },
    );

    if (existRes.ok) {
      const existing = await existRes.json();
      const items    = existing?.data ?? [];

      if (items.length > 0) {
        // Já existe → atualiza o estado
        const id = items[0].id;
        await fetch(`${STRAPI}/api/newsletter-subscritores/${id}`, {
          method: 'PUT',
          headers: headers(),
          body: JSON.stringify({ data: { subscrito: body.subscrito ?? true } }),
        });

        return json({ success: true, subscrito: body.subscrito ?? true, action: 'updated' });
      }
    }

    // Cria nova entrada
    const createRes = await fetch(`${STRAPI}/api/newsletter-subscritores`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        data: {
          email,
          subscrito: true,
          data_subscricao: new Date().toISOString(),
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      console.error('[newsletter] Strapi error:', err);
      return json({ error: 'Erro ao guardar subscrição.' }, 500);
    }

    return json({ success: true, subscrito: true, action: 'created' });

  } catch (e: any) {
    console.error('[newsletter] Unexpected error:', e);
    return json({ error: 'Erro interno.' }, 500);
  }
};

// ── GET /api/newsletter ───────────────────────────────────────────────────────
// Devolve o estado de subscrição do utilizador autenticado
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const jwt = cookies.get('jwt')?.value;

    if (!jwt) {
      return json({ subscrito: false, autenticado: false });
    }

    const meRes = await fetch(`${STRAPI}/api/users/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!meRes.ok) {
      return json({ subscrito: false, autenticado: false });
    }

    const me = await meRes.json();

    return json({
      subscrito:   me.newsletter_subscrito ?? false,
      autenticado: true,
    });

  } catch {
    return json({ subscrito: false, autenticado: false });
  }
};

// ── Helper ────────────────────────────────────────────────────────────────────
function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}