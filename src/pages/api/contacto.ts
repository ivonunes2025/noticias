import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const STRAPI_URL = import.meta.env.STRAPI_URL;
    const STRAPI_TOKEN = import.meta.env.STRAPI_API_TOKEN;

    if (!STRAPI_URL) {
      return new Response(JSON.stringify({ error: 'Falta STRAPI_URL no .env' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Limpar a URL para evitar barras duplas
    const cleanUrl = STRAPI_URL.replace(/\/$/, '');
    const endpoint = `${cleanUrl}/api/mensagens`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(STRAPI_TOKEN ? { 'Authorization': `Bearer ${STRAPI_TOKEN}` } : {})
      },
      body: JSON.stringify(body),
    });

    const status = response.status;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        status: status,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      const text = await response.text();
      return new Response(JSON.stringify({ 
        error: 'O Strapi não devolveu JSON. Verifique se a coleção existe.',
        debug: text.slice(0, 100)
      }), {
        status: status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
