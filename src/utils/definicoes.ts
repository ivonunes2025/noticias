// src/utils/definicoes.ts
// Busca as definições globais do site (favicon, logo, menus, fonte) do Strapi

import { getImageUrl } from "./strapi/render";

export type FontFamily = "Inter" | "Open Sans" | "Poppins" | "Roboto" | "Montserrat";

export interface Definicoes {
  favicon: string | null;
  logo: string | null;
  menuPrincipalSlug: string | null;
  menuFooterSlug: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
  newsletterTitulo: string | null;
  newsletterDescricao: string | null;
  newsletterPlaceholder: string | null;
  fontFamily: FontFamily;
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
    newsletterTitulo: 'Subscreva a nossa Newsletter',
    newsletterDescricao: 'Receba as últimas notícias diretamente no seu email.',
    newsletterPlaceholder: 'O seu email...',
    fontFamily: 'Inter',
  };

  if (!STRAPI) return fallback;

  try {
    // Busca definições e garante que o campo font_family é incluído
    const res = await fetch(
      `${STRAPI}/api/definicaos?populate[favicon][fields][0]=url&populate[logo][fields][0]=url&populate[menu_principal][fields][0]=slug&populate[menu_footer][fields][0]=slug&populate[newsletter]=*&pagination[pageSize]=1`
    );

    if (!res.ok) {
      console.warn('[getDefinicoes] Strapi respondeu com status:', res.status);
      return fallback;
    }

    const json = await res.json();
    const raw = json.data?.[0];
    if (!raw) return fallback;

    const data = raw?.attributes ?? raw;

    const getMenuSlug = (relation: any): string | null => {
      if (!relation) return null;
      const m = relation?.data ?? relation;
      const attrs = m?.attributes ?? m;
      return attrs?.slug ?? null;
    };

    const redes = data.redes_sociais ?? data;
    const facebook = redes.facebook_url ?? redes.facebookUrl ?? redes.facebook ?? null;
    const instagram = redes.instagram_url ?? redes.instagramUrl ?? redes.instagram ?? null;
    const website = redes.website_url ?? redes.websiteUrl ?? redes.website ?? null;

    const newsletter = data.newsletter ?? {};

    // Lê o campo font_family do Strapi, valida e usa o fallback se não for válido
    const fontRaw = data.font_family ?? data.fontFamily ?? null;
    const validFonts: FontFamily[] = ["Inter", "Open Sans", "Poppins"];
    const fontFamily: FontFamily = validFonts.includes(fontRaw) ? fontRaw : fallback.fontFamily;

    return {
      favicon: getImageUrl(data.favicon),
      logo: getImageUrl(data.logo),
      menuPrincipalSlug: getMenuSlug(data.menu_principal) ?? fallback.menuPrincipalSlug,
      menuFooterSlug: getMenuSlug(data.menu_footer) ?? fallback.menuFooterSlug,
      facebookUrl: facebook,
      instagramUrl: instagram,
      websiteUrl: website,
      newsletterTitulo: newsletter.titulo ?? newsletter.title ?? fallback.newsletterTitulo,
      newsletterDescricao: newsletter.descricao ?? newsletter.description ?? fallback.newsletterDescricao,
      newsletterPlaceholder: newsletter.placeholder ?? fallback.newsletterPlaceholder,
      fontFamily,
    };

  } catch (e) {
    console.error('[getDefinicoes] Erro:', e);
    return fallback;
  }
}

/**
 * Devolve o URL do Google Fonts para a fonte escolhida.
 * Usado no Layout.astro para carregar a fonte correta.
 */
export function getFontUrl(font: FontFamily): string {
  const urls: Record<FontFamily, string> = {
    "Inter": "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
    "Open Sans": "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap",
    "Poppins": "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap",
    "Roboto": "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap",
    "Montserrat": "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap",
  };
  return urls[font];
}

/**
 * Devolve o valor CSS da font-family para usar na variável CSS.
 */
export function getFontCssValue(font: FontFamily): string {
  const values: Record<FontFamily, string> = {
    "Inter": "'Inter', sans-serif",
    "Open Sans": "'Open Sans', sans-serif",
    "Poppins": "'Poppins', sans-serif",
    "Roboto": "'Roboto', sans-serif",
    "Montserrat": "'Montserrat', sans-serif",
  };
  return values[font];
}