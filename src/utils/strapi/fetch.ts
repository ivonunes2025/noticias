// src/utils/strapi/fetch.ts
// Lógica de busca genérica no Strapi com tratamento de erros

/**
 * Busca genérica no Strapi com tratamento de erros.
 */
export async function fetchStrapi<T = any>(
  path: string,
  params: Record<string, string | number | boolean> = {}
): Promise<T | null> {
  const STRAPI = import.meta.env.STRAPI_URL?.replace(/\/$/, '');
  if (!STRAPI) return null;

  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      query.append(key, String(value));
    });

    const queryString = query.toString();
    const url = `${STRAPI}/api/${path}${queryString ? `?${queryString}` : ""}`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    return json as T;
  } catch (e) {
    console.error(`Erro ao buscar ${path} no Strapi:`, e);
    return null;
  }
}

/**
 * Busca as categorias do Strapi.
 */
export async function getCategorias() {
  const STRAPI = import.meta.env.STRAPI_URL;
  if (!STRAPI) return [];
  try {
    const res = await fetch(`${STRAPI}/api/categorias?pagination[pageSize]=100&sort=nome:asc`);
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch (e) {
    return [];
  }
}