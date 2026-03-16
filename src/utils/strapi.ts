// Helpers partilhados para lidar com respostas do Strapi

// URL base da API do Strapi (lida de variáveis de ambiente e limpa de barras finais)
const STRAPI_BASE = import.meta.env.STRAPI_URL as string | undefined;
const STRAPI = STRAPI_BASE?.replace(/\/$/, '');

// Converte rich text do Strapi (blocos/children) em texto contínuo
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

// Extrai URL de imagem (absoluta ou relativa) de diferentes formatos de media do Strapi
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

// Busca genérica no Strapi com tratamento de erros
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
    return json.data as T;
  } catch (e) {
    console.error(`Erro ao buscar ${path} no Strapi:`, e);
    return null;
  }
}

/**
 * Normaliza objetos do Strapi (v4/v5) para facilitar o acesso às propriedades.
 * Remove a necessidade de aceder sempre a .attributes ou .data.
 */
export function normalize<T = any>(input: any): T {
  if (!input) return input;

  // Se for um array, normaliza cada item
  if (Array.isArray(input)) {
    return input.map(item => normalize(item)) as any;
  }

  // Se for um objeto do tipo { data: [...] } ou { data: {...} }
  if (input.data !== undefined) {
    return normalize(input.data);
  }

  // Se for um objeto do tipo { attributes: {...} }
  let output = { ...input };
  if (input.attributes !== undefined) {
    output = { id: input.id ?? input.attributes.id, ...input.attributes };
    delete (output as any).attributes;
  }

  // Normaliza recursivamente todas as propriedades
  for (const key in output) {
    if (output[key] && typeof output[key] === 'object') {
      output[key] = normalize(output[key]);
    }
  }

  return output as T;
}

// Formata datas ISO em português (Portugal), por exemplo: "12 de março de 2026"
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
 * SEGURANÇA E PRIVACIDADE:
 * Helpers para verificar permissões de acesso a notícias.
 */

// Verifica se uma notícia é privada (suporta vários nomes de campos e formatos)
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

export function isNewsPrivate(noticia: any): boolean {
  if (!noticia) return false;
  const attrs = noticia.attributes ?? noticia;
  return (
    attrs.Privadas === true || attrs.Privadas === "true" ||
    attrs.privadas === true || attrs.privadas === "true" ||
    attrs.privada === true || attrs.privada === "true"
  );
}

// Verifica se o utilizador está autenticado através dos cookies
export function checkAuth(cookies: any): boolean {
  return !!cookies.get("user_name")?.value;
}

// Normaliza a resposta da API do Strapi (remove o wrapper .data.attributes se existir)
export function normalizeStrapi(data: any): any {
  if (!data) return null;
  if (Array.isArray(data)) return data.map(item => item?.attributes ?? item);
  return data?.attributes ?? data;
}

// Formata nomes em estilo "título" (primeira letra de cada palavra maiúscula)
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
 * RENDERIZAÇÃO DE BLOCOS:
 * Converte a estrutura de blocos do editor rico do Strapi em HTML válido.
 */
export function renderBlocks(blocks: any): string {
  if (!blocks) return "";
  if (typeof blocks === "string") return blocks;
  if (!Array.isArray(blocks)) return "";
  return blocks
    .map((block: any) => {
      // Caso seja uma imagem dentro dos blocos (Strapi Rich Text Blocks)
      if (block.type === "image") {
        const img = block.image || block.data;
        const url = img?.url ?? img?.attributes?.url ?? img?.data?.attributes?.url;
        const alt = img?.alternativeText ?? img?.caption ?? "";
        
        if (!url) return "";
        const fullUrl = url.startsWith("http") ? url : `${STRAPI}${url.startsWith('/') ? url : `/${url}`}`;
        return `<div class="rich-image-container"><img src="${fullUrl}" alt="${alt}" class="rich-image" /></div>`;
      }

      const text = block.children?.map((c: any) => c.text).join("") ?? "";
      switch (block.type) {
        case "heading":
          return `<h${block.level}>${text}</h${block.level}>`;
        case "paragraph":
          return `<p>${text}</p>`;
        case "list": {
          const tag = block.format === "ordered" ? "ol" : "ul";
          const items = block.children
            ?.map(
              (c: any) =>
                `<li>${c.children?.map((x: any) => x.text).join("") ?? ""}</li>`,
            )
            .join("");
          return `<${tag}>${items}</${tag}>`;
        }
        default:
          return `<p>${text}</p>`;
      }
    })
    .join("");
}

