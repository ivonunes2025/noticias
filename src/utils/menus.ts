// src/utils/menus.ts
// Sistema de menus dinâmico com suporte a árvore de 2 níveis via Strapi

export interface MenuItem {
  id: number;
  titulo: string;
  link: string;
  ordem: number;
  abrir_nova_aba: boolean;
  filhos: MenuItem[];
}

export interface Menu {
  id: number;
  nome: string;
  slug: string;
  itens: MenuItem[];
}

/**
 * Normaliza um item de menu vindo do Strapi (v4 ou v5)
 */
function normalizeItem(raw: any): MenuItem {
  const data = raw?.attributes ?? raw;
  return {
    id: raw.id ?? data.id,
    titulo: data.titulo ?? '',
    link: data.link ?? '#',
    ordem: data.ordem ?? 0,
    abrir_nova_aba: data.abrir_nova_aba ?? false,
    filhos: [],
  };
}

/**
 * Busca os slugs das páginas que estão ocultas (visivel === false).
 * Usado para filtrar itens do menu que apontem para essas páginas.
 */
async function getPaginasOcultas(strapiUrl: string): Promise<Set<string>> {
  try {
    const res = await fetch(
      `${strapiUrl}/api/paginas?fields[0]=slug&fields[1]=visivel&pagination[pageSize]=100`
    );
    if (!res.ok) return new Set();

    const json = await res.json();
    const paginas: any[] = json.data ?? [];

    return new Set(
      paginas
        .filter((p: any) => {
          const attrs = p.attributes ?? p;
          return attrs.visivel === false;
        })
        .map((p: any) => {
          const attrs = p.attributes ?? p;
          return attrs.slug ?? '';
        })
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
}

/**
 * Verifica se um link aponta para uma página oculta.
 * Ex: "/natal" → slug "natal" → verifica no Set
 */
function isItemOculto(link: string, paginasOcultas: Set<string>): boolean {
  if (!link || link === '#') return false;
  // Extrai o slug do link: "/natal" → "natal", "/sobre/equipa" → "sobre"
  const slug = link.replace(/^\//, '').split('/')[0];
  return paginasOcultas.has(slug);
}

/**
 * Busca um menu pelo slug com todos os itens e submenus (2 níveis).
 * Filtra automaticamente itens que apontem para páginas com visivel === false.
 */
export async function getMenu(slug: string): Promise<Menu | null> {
  const STRAPI = import.meta.env.STRAPI_URL?.replace(/\/$/, '');
  if (!STRAPI) return null;

  try {
    const params = new URLSearchParams({
      'filters[slug][$eq]': slug,
      'populate[itens][fields][0]': 'titulo',
      'populate[itens][fields][1]': 'link',
      'populate[itens][fields][2]': 'ordem',
      'populate[itens][fields][3]': 'abrir_nova_aba',
      'populate[itens][populate][filhos][fields][0]': 'titulo',
      'populate[itens][populate][filhos][fields][1]': 'link',
      'populate[itens][populate][filhos][fields][2]': 'ordem',
      'populate[itens][populate][filhos][fields][3]': 'abrir_nova_aba',
    });

    // Faz as duas chamadas em paralelo para não aumentar o tempo de resposta
    const [menuRes, paginasOcultas] = await Promise.all([
      fetch(`${STRAPI}/api/menus?${params.toString()}`),
      getPaginasOcultas(STRAPI),
    ]);

    if (!menuRes.ok) {
      console.error(`[getMenu] HTTP ${menuRes.status} ao buscar menu "${slug}"`);
      return null;
    }

    const json = await menuRes.json();
    const raw = json.data?.[0];

    if (!raw) {
      console.warn(`[getMenu] Menu "${slug}" não encontrado no Strapi.`);
      return null;
    }

    const menuData = raw?.attributes ?? raw;

    const itensRaw: any[] =
      menuData.itens?.data ??
      menuData.itens ??
      [];

    // Descobrir quais são filhos para não os duplicar no nível 1
    const idsFilhos = new Set<number>();
    itensRaw.forEach((item: any) => {
      const filhosArr =
        item?.attributes?.filhos?.data ??
        item?.filhos?.data ??
        item?.filhos ??
        [];
      filhosArr.forEach((f: any) => idsFilhos.add(f.id));
    });

    const itensNivel1 = itensRaw
      .filter((item: any) => !idsFilhos.has(item.id))
      .filter((item: any) => {
        // ✅ Remove itens que apontem para páginas ocultas
        const data = item?.attributes ?? item;
        return !isItemOculto(data.link ?? '', paginasOcultas);
      })
      .map((item: any) => {
        const base = normalizeItem(item);

        const filhosRaw: any[] =
          item?.attributes?.filhos?.data ??
          item?.filhos?.data ??
          item?.filhos ??
          [];

        base.filhos = filhosRaw
          .filter((f: any) => {
            // ✅ Remove filhos (dropdown) que apontem para páginas ocultas
            const fData = f?.attributes ?? f;
            return !isItemOculto(fData.link ?? '', paginasOcultas);
          })
          .map(normalizeItem)
          .sort((a: MenuItem, b: MenuItem) => a.ordem - b.ordem);

        return base;
      })
      .sort((a: MenuItem, b: MenuItem) => a.ordem - b.ordem);

    return {
      id: raw.id,
      nome: menuData.nome ?? '',
      slug: menuData.slug ?? slug,
      itens: itensNivel1,
    };

  } catch (e) {
    console.error('[getMenu] Erro inesperado:', e);
    return null;
  }
}

/**
 * Lista todos os menus disponíveis (útil para debug ou selects no backoffice).
 */
export async function getAllMenus(): Promise<Pick<Menu, 'id' | 'nome' | 'slug'>[]> {
  const STRAPI = import.meta.env.STRAPI_URL?.replace(/\/$/, '');
  if (!STRAPI) return [];

  try {
    const res = await fetch(
      `${STRAPI}/api/menus?fields[0]=nome&fields[1]=slug&sort=nome:asc`
    );
    if (!res.ok) return [];

    const json = await res.json();
    return (json.data ?? []).map((m: any) => ({
      id: m.id,
      nome: m?.attributes?.nome ?? m.nome ?? '',
      slug: m?.attributes?.slug ?? m.slug ?? '',
    }));
  } catch {
    return [];
  }
}