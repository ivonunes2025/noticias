import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { identifier, password } = await request.json();
    const STRAPI_URL = import.meta.env.STRAPI_URL;

    if (!identifier || !password) {
      return new Response(JSON.stringify({ error: 'Preencha todos os campos.' }), { status: 400 });
    }

    const res = await fetch(`${STRAPI_URL}/api/auth/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Credenciais inválidas.' }), { status: 401 });
    }

    // Define o cookie com o JWT do Strapi
    cookies.set('jwt', data.jwt, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });

    // Opcional: guardar dados básicos do user num cookie não-httpOnly para UI
    cookies.set('user_name', data.user.username, {
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return new Response(JSON.stringify({ success: true, user: data.user }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro no servidor.' }), { status: 500 });
  }
};
