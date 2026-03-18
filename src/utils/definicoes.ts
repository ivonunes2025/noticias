// src/utils/definicoes.ts
// Busca as definições globais do site (favicon, logo, menus) do Strapi

import { getImageUrl } from "./strapi/render";

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
    const res = await fetch(
      `${STRAPI}/api/definicaos?populate[favicon][fields][0]=url&populate[logo][fields][0]=url&populate[menu_principal][fields][0]=slug&populate[menu_footer][fields][0]=slug&pagination[pageSize]=1`
    );

    if (!res.ok) {
      console.warn('[getDefinicoes] Strapi respondeu com status:', res.status);
      return fallback;
    }

    const json = await res.json();
    const raw = json.data?.[0];
    if (!raw) return fallback;

    const data = raw?.attributes ?? raw;

    // Extrai o slug de uma relação do Strapi (v4 e v5)
    const getMenuSlug = (relation: any): string | null => {
      if (!relation) return null;
      const m = relation?.data ?? relation;
      const attrs = m?.attributes ?? m;
      return attrs?.slug ?? null;
    };

    // Tenta obter redes sociais em diferentes estruturas
    const redes = data.redes_sociais ?? data;
    const facebook = redes.facebook_url ?? redes.facebookUrl ?? redes.facebook ?? null;
    const instagram = redes.instagram_url ?? redes.instagramUrl ?? redes.instagram ?? null;
    const website = redes.website_url ?? redes.websiteUrl ?? redes.website ?? null;

    return {
      favicon: getImageUrl(data.favicon),
      logo: getImageUrl(data.logo),
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