import type { APIRoute } from 'astro';

export const POST: APIRoute = ({ cookies }) => {
  cookies.delete('jwt', { path: '/' });
  cookies.delete('user_name', { path: '/' });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
