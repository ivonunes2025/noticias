import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { username, email, password } = await request.json();
    const STRAPI_URL = import.meta.env.STRAPI_URL;

    if (!username || !email || !password) {
      return new Response(JSON.stringify({ error: 'Preencha todos os campos.' }), { status: 400 });
    }

    const res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error?.message || 'Erro ao criar conta.';
      return new Response(JSON.stringify({ error: msg }), { status: 400 });
    }

    // Define os cookies após registo bem-sucedido
    cookies.set('jwt', data.jwt, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

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
