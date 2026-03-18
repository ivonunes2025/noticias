// src/utils/definicoes.ts
// Busca as definições globais do site (favicon, logo, menus) do Strapi

export interface Definicoes {
  favicon: string | null;
  logo: string | null;
  menuPrincipalSlug: string | null;
  menuFooterSlug: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
}

export async function getDefinicoes(): Promise<Definicoes> {
  const STRAPI = import.meta.env.STRAPI_URL?.replace(/\/$/, '');

  const fallback: Definicoes = {
    favicon: null,
    logo: null,
    menuPrincipalSlug: 'menu-principal',
    menuFooterSlug: 'menu-footer',
    facebookUrl: null,
    instagramUrl: null,
    websiteUrl: null,
  };

  if (!STRAPI) return fallback;

  try {
    // Busca as definições principais e popula favicon, logo e slugs de menus
    // Usamos populate=* para campos simples e populate[favicon], [logo], etc para media e relações
    const res = await fetch(
      `${STRAPI}/api/definicaos?populate[favicon]=*&populate[logo]=*&populate[menu_principal][fields][0]=slug&populate[menu_footer][fields][0]=slug&populate[redes_sociais]=*&pagination[pageSize]=1`
    );

    if (!res.ok) return fallback;

    const json = await res.json();
    const raw = json.data?.[0];
    if (!raw) return fallback;

    const data = raw?.attributes ?? raw;

    // Extrai URL de uma media do Strapi (v4 e v5)
    const getUrl = (media: any): string | null => {
      if (!media) return null;
      const m = media?.data ?? media;
      const attrs = m?.attributes ?? m;
      const url = attrs?.url ?? null;
      if (!url) return null;
      return url.startsWith('http') ? url : `${STRAPI}${url}`;
    };

    // Extrai o slug de uma relação do Strapi (v4 e v5)
    const getMenuSlug = (relation: any): string | null => {
      if (!relation) return null;
      const m = relation?.data ?? relation;
      const attrs = m?.attributes ?? m;
      return attrs?.slug ?? null;
    };

    // Tenta encontrar os links das redes sociais em diferentes formatos (campo simples ou componente)
    const redes = data.redes_sociais ?? data;
    const facebook = (redes.facebook_url ?? redes.facebookUrl ?? redes.facebook) || null;
    const instagram = (redes.instagram_url ?? redes.instagramUrl ?? redes.instagram) || null;
    const website = (redes.website_url ?? redes.websiteUrl ?? redes.website) || null;

    return {
      favicon: getUrl(data.favicon),
      logo: getUrl(data.logo),
      menuPrincipalSlug: getMenuSlug(data.menu_principal) ?? fallback.menuPrincipalSlug,
      menuFooterSlug: getMenuSlug(data.menu_footer) ?? fallback.menuFooterSlug,
      facebookUrl: facebook,
      instagramUrl: instagram,
      websiteUrl: website,
    };

  } catch (e) {
    console.error('[getDefinicoes] Erro:', e);
    return fallback;
  }
}