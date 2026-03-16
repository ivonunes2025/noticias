// src/utils/strapi/render.ts
// Lógica de renderização de conteúdos, formatação e verificação de estados

/**
 * Converte rich text do Strapi (blocos/children) em texto contínuo.
 */
export function getRichText(blocks: any): string {
  if (!blocks) return "";
  if (typeof blocks === "string") return blocks;
  try {
    return blocks
      .map(
        (block: any) =>
          block?.children?.map((child: any) => child?.text ?? "").join("") ?? "",
      )
      .join("\n");
  } catch {
    return "";
  }
}

/**
 * Extrai URL de imagem (absoluta ou relativa) de diferentes formatos de media do Strapi.
 */
export function getImageUrl(imagem: any): string | null {
  if (!imagem) return null;
  
  // Se já for uma string (URL direta), tratamos
  if (typeof imagem === 'string') {
    if (imagem.startsWith("http")) return imagem;
    const STRAPI_URL = import.meta.env.STRAPI_URL?.replace(/\/$/, '');
    const cleanUrl = imagem.startsWith('/') ? imagem : `/${imagem}`;
    return STRAPI_URL ? `${STRAPI_URL}${cleanUrl}` : cleanUrl;
  }

  // Caso o objeto seja um array de imagens, pegamos a primeira
  const media = Array.isArray(imagem) ? imagem[0] : imagem;
  
  // Procuramos a URL em todos os níveis possíveis (v4, v5, normalized, etc.)
  let url = 
    media?.url ?? 
    media?.attributes?.url ?? 
    media?.data?.attributes?.url ?? 
    media?.data?.url ?? 
    media?.file?.url;

  // Se for um objeto com campo 'id' e sem 'url', pode estar dentro de 'foto'
  if (!url && (media?.foto || media?.attributes?.foto)) {
    return getImageUrl(media.foto ?? media.attributes.foto);
  }

  // Se não encontrou, e media.data for um array, tenta o primeiro item
  if (!url && Array.isArray(media?.data)) {
    url = media.data[0]?.attributes?.url ?? media.data[0]?.url;
  }

  if (!url) return null;
  
  // Se for uma URL completa, retornamos
  if (url.startsWith("http")) return url;
  
  // Se for relativa, limpamos e concatenamos com o STRAPI_URL
  const STRAPI_URL = import.meta.env.STRAPI_URL?.replace(/\/$/, '');
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return STRAPI_URL ? `${STRAPI_URL}${cleanUrl}` : cleanUrl;
}

/**
 * Formata datas ISO em português (Portugal).
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Formata nomes em estilo "título" (primeira letra de cada palavra maiúscula).
 */
export function formatTituloPt(nome: string): string {
  if (!nome) return "";
  return nome
    .toLocaleLowerCase("pt-PT")
    .split(" ")
    .filter(Boolean)
    .map(
      (parte) =>
        parte.charAt(0).toLocaleUpperCase("pt-PT") + parte.slice(1),
    )
    .join(" ");
}

/**
 * Mapa de handlers para renderizar diferentes tipos de blocos do Strapi.
 * Segue o Princípio Aberto/Fechado (SOLID).
 */
const blockHandlers: Record<string, (block: any, strapiUrl?: string) => string> = {
  heading: (block) => {
    const text = block.children?.map((c: any) => c.text).join("") ?? "";
    return `<h${block.level}>${text}</h${block.level}>`;
  },
  paragraph: (block) => {
    const text = block.children?.map((c: any) => c.text).join("") ?? "";
    return `<p>${text}</p>`;
  },
  list: (block) => {
    const tag = block.format === "ordered" ? "ol" : "ul";
    const items = block.children
      ?.map(
        (c: any) =>
          `<li>${c.children?.map((x: any) => x.text).join("") ?? ""}</li>`,
      )
      .join("");
    return `<${tag}>${items}</${tag}>`;
  },
  image: (block, strapiUrl) => {
    const img = block.image || block.data;
    const url = img?.url ?? img?.attributes?.url ?? img?.data?.attributes?.url;
    const alt = img?.alternativeText ?? img?.caption ?? "";
    
    if (!url) return "";
    const fullUrl = url.startsWith("http") ? url : `${strapiUrl}${url.startsWith('/') ? url : `/${url}`}`;
    return `<div class="rich-image-container"><img src="${fullUrl}" alt="${alt}" class="rich-image" /></div>`;
  },
};

/**
 * Converte a estrutura de blocos do editor rico do Strapi em HTML válido.
 */
export function renderBlocks(blocks: any): string {
  if (!blocks) return "";
  if (typeof blocks === "string") return blocks;
  if (!Array.isArray(blocks)) return "";
  const STRAPI = import.meta.env.STRAPI_URL?.replace(/\/$/, '');

  return blocks
    .map((block: any) => {
      const handler = blockHandlers[block.type];
      return handler ? handler(block, STRAPI) : `<p>${block.children?.map((c: any) => c.text).join("") ?? ""}</p>`;
    })
    .join("");
}

/**
 * Verifica se uma notícia é privada.
 */
export function isNewsPrivate(noticia: any): boolean {
  if (!noticia) return false;
  const attrs = noticia.attributes ?? noticia;
  return (
    attrs.Privadas === true || attrs.Privadas === "true" ||
    attrs.privadas === true || attrs.privadas === "true" ||
    attrs.privada === true || attrs.privada === "true"
  );
}

/**
 * Verifica se o utilizador está autenticado através dos cookies.
 */
export function checkAuth(cookies: any): boolean {
  return !!cookies.get("user_name")?.value;
}

/**
 * Encapsula o acesso aos dados de uma notícia para exibição (Lei de Deméter).
 * Centraliza a lógica de fallback e formatação.
 */
export function getNoticiaDisplayData(noticia: any) {
  if (!noticia) return null;

  const attrs = noticia.attributes ?? noticia;
  
  return {
    titulo: attrs.titulo ?? "",
    slug: attrs.slug ?? attrs.id?.toString() ?? "",
    dataFormatada: formatDate(attrs.publishedAt),
    imagemUrl: getImageUrl(attrs.capa ?? attrs.imagem),
    autor: attrs.autor ?? null,
    resumo: getRichText(attrs.resumo || attrs.conteudo).slice(0, 140) + "...",
    conteudoHtml: renderBlocks(attrs.conteudo),
    isPrivada: isNewsPrivate(noticia),
    categorias: attrs.categorias ?? []
  };
}
