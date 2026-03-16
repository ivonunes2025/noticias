import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { username, email, password } = await request.json();
    const STRAPI_URL = import.meta.env.STRAPI_URL;

    if (!username || !email || !password) {
      return new Response(JSON.stringify({ error: 'Preencha todos os campos.' }), { status: 400 });
    }

    // No Strapi, o 'username' deve ser único. 
    // Para permitir que vários utilizadores tenham o mesmo 'nome' (ex: João Pedro),
    // vamos usar o 'email' como o 'username' técnico no Strapi,
    // e guardar o nome escolhido num campo personalizado ou apenas nos cookies por agora.
    // Desta forma, o Strapi valida a unicidade do email automaticamente.
    
    const res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // O username técnico passa a ser o email para garantir unicidade,
      // mas o Strapi também valida o campo email separadamente.
      body: JSON.stringify({ 
        username: email, // Usamos o email como identificador único (username)
        email, 
        password,
        nome: username // Se tiver um campo 'nome' no User do Strapi, ele guarda aqui
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      let msg = data?.error?.message || 'Erro ao criar conta.';
      
      // Tradução amigável para erro de duplicado
      if (msg.includes('Email') || msg.includes('Username')) {
        msg = 'Este e-mail já está em uso por outra conta.';
      }
      
      return new Response(JSON.stringify({ error: msg }), { status: 400 });
    }

    // Define os cookies após registo bem-sucedido
    // Usamos o 'username' original (o nome real do user) para os cookies
    cookies.set('jwt', data.jwt, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    cookies.set('user_name', username, { // Mostramos o nome real no site
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
