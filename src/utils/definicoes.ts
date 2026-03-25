// src/utils/definicoes.ts
// Busca as definições globais do site (favicon, logo, menus, fonte) do Strapi
// Campos confirmados no Content-Type Builder:
//   favicon (Media), logo (Media), menu_principal (Relation), menu (Relation),
//   menu_footer (Relation), facebook (Text), instagram (Text), website (Text),
//   font_family (Enumeration)

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

/**
 * Extrai a URL de uma imagem do Strapi, suportando todos os formatos
 * possíveis (v4, v5, normalizado, array, objeto simples, URL relativa, etc.)
 */
function extractImageUrl(field: any, strapiBase: string): string | null {
  if (!field) return null;

  // String direta
  if (typeof field === "string") {
    if (field.startsWith("http")) return field;
    return `${strapiBase}${field.startsWith("/") ? field : `/${field}`}`;
  }

  // Array → pega o primeiro elemento
  if (Array.isArray(field)) {
    return extractImageUrl(field[0], strapiBase);
  }

  // Strapi v4: { data: { id, attributes: { url, ... } } }
  if (field?.data?.attributes?.url) {
    const url = field.data.attributes.url as string;
    return url.startsWith("http") ? url : `${strapiBase}${url}`;
  }

  // Strapi v4 array dentro de data: { data: [{ attributes: { url } }] }
  if (Array.isArray(field?.data) && field.data[0]?.attributes?.url) {
    const url = field.data[0].attributes.url as string;
    return url.startsWith("http") ? url : `${strapiBase}${url}`;
  }

  // Strapi v5 / já normalizado: { id, url, ... }
  if (field?.url) {
    const url = field.url as string;
    return url.startsWith("http") ? url : `${strapiBase}${url}`;
  }

  // Ainda dentro de attributes mas sem data wrapper
  if (field?.attributes?.url) {
    const url = field.attributes.url as string;
    return url.startsWith("http") ? url : `${strapiBase}${url}`;
  }

  return null;
}

/**
 * Extrai o slug de uma relação do Strapi (v4 ou v5).
 */
function extractRelationSlug(relation: any): string | null {
  if (!relation) return null;
  // v4: { data: { attributes: { slug } } }
  if (relation?.data?.attributes?.slug) return relation.data.attributes.slug as string;
  // v4 array
  if (Array.isArray(relation?.data) && relation.data[0]?.attributes?.slug) {
    return relation.data[0].attributes.slug as string;
  }
  // v5 / normalizado: { slug }
  if (relation?.slug) return relation.slug as string;
  // v5 array
  if (Array.isArray(relation) && relation[0]?.slug) return relation[0].slug as string;
  return null;
}

export async function getDefinicoes(): Promise<Definicoes> {
  const STRAPI = import.meta.env.STRAPI_URL?.replace(/\/$/, "");

  const fallback: Definicoes = {
    favicon: null,
    logo: null,
    menuPrincipalSlug: "menu-principal",
    menuFooterSlug: "menu-footer",
    facebookUrl: null,
    instagramUrl: null,
    websiteUrl: null,
    newsletterTitulo: "Subscreva a nossa Newsletter",
    newsletterDescricao: "Receba as últimas notícias diretamente no seu email.",
    newsletterPlaceholder: "O seu email...",
    fontFamily: "Inter",
  };

  if (!STRAPI) return fallback;

  try {
    // populate específico para cada campo de media e relação
    const url =
      `${STRAPI}/api/definicaos?` +
      `populate[favicon][fields][0]=url` +
      `&populate[favicon][fields][1]=alternativeText` +
      `&populate[logo][fields][0]=url` +
      `&populate[logo][fields][1]=alternativeText` +
      `&populate[menu_principal][fields][0]=slug` +
      `&populate[menu_principal][fields][1]=nome` +
      `&populate[menu_footer][fields][0]=slug` +
      `&populate[menu_footer][fields][1]=nome` +
      `&populate[menu][fields][0]=slug` +
      `&populate[menu][fields][1]=nome` +
      `&pagination[pageSize]=1`;

    const res = await fetch(url);

    if (!res.ok) {
      console.warn("[getDefinicoes] Strapi respondeu com status:", res.status, "para URL:", url);
      return fallback;
    }

    const json = await res.json();
    const raw = json.data?.[0];

    if (!raw) {
      console.warn("[getDefinicoes] Nenhuma entrada encontrada na coleção Definição.");
      return fallback;
    }

    // Suporta Strapi v4 (raw.attributes) e v5 (campos diretos em raw)
    const data = raw?.attributes ?? raw;

    // ── Logo & Favicon ────────────────────────────────────────────────────────
    const logoUrl    = extractImageUrl(data.logo, STRAPI);
    const faviconUrl = extractImageUrl(data.favicon, STRAPI);

    if (!logoUrl) {
      console.warn(
        "[getDefinicoes] Logo não encontrado. Estrutura recebida:",
        JSON.stringify(data.logo, null, 2)
      );
    }

    // ── Menus ─────────────────────────────────────────────────────────────────
    // menu_principal tem prioridade; cai para menu como fallback
    const menuPrincipalSlug =
      extractRelationSlug(data.menu_principal) ??
      extractRelationSlug(data.menu) ??
      fallback.menuPrincipalSlug;

    const menuFooterSlug =
      extractRelationSlug(data.menu_footer) ??
      fallback.menuFooterSlug;

    // ── Redes Sociais ─────────────────────────────────────────────────────────
    // Campos diretos no tipo: facebook, instagram, website
    const facebook  = (data.facebook  ?? null) as string | null;
    const instagram = (data.instagram ?? null) as string | null;
    const website   = (data.website   ?? null) as string | null;

    // ── Newsletter (campo componente se existir) ───────────────────────────────
    const newsletter = data.newsletter ?? {};

    // ── Fonte ─────────────────────────────────────────────────────────────────
    const fontRaw = (data.font_family ?? data.fontFamily ?? null) as string | null;
    const validFonts: FontFamily[] = ["Inter", "Open Sans", "Poppins", "Roboto", "Montserrat"];
    const fontFamily: FontFamily = validFonts.includes(fontRaw as FontFamily)
      ? (fontRaw as FontFamily)
      : fallback.fontFamily;

    return {
      favicon:               faviconUrl,
      logo:                  logoUrl,
      menuPrincipalSlug,
      menuFooterSlug,
      facebookUrl:           facebook,
      instagramUrl:          instagram,
      websiteUrl:            website,
      newsletterTitulo:      newsletter.titulo    ?? newsletter.title       ?? fallback.newsletterTitulo,
      newsletterDescricao:   newsletter.descricao ?? newsletter.description ?? fallback.newsletterDescricao,
      newsletterPlaceholder: newsletter.placeholder ?? fallback.newsletterPlaceholder,
      fontFamily,
    };

  } catch (e) {
    console.error("[getDefinicoes] Erro inesperado:", e);
    return fallback;
  }
}

/**
 * Devolve o URL do Google Fonts para a fonte escolhida.
 */
export function getFontUrl(font: FontFamily): string {
  const urls: Record<FontFamily, string> = {
    "Inter":      "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
    "Open Sans":  "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap",
    "Poppins":    "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap",
    "Roboto":     "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap",
    "Montserrat": "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap",
  };
  return urls[font];
}

/**
 * Devolve o valor CSS da font-family para usar na variável CSS.
 */
export function getFontCssValue(font: FontFamily): string {
  const values: Record<FontFamily, string> = {
    "Inter":      "'Inter', sans-serif",
    "Open Sans":  "'Open Sans', sans-serif",
    "Poppins":    "'Poppins', sans-serif",
    "Roboto":     "'Roboto', sans-serif",
    "Montserrat": "'Montserrat', sans-serif",
  };
  return values[font];
}