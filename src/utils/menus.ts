
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
  // Strapi v5: dados directos | Strapi v4: { id, attributes: { ... } }
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
 * Busca um menu pelo slug com todos os itens e submenus (2 níveis).
 * Compatível com a tua estrutura:
 *   Menu  → itens (oneToMany → Menu Item)
 *   Menu Item → filhos (oneToMany → self), pai (manyToOne → self)
 */
export async function getMenu(slug: string): Promise<Menu | null> {
  const STRAPI = import.meta.env.STRAPI_URL?.replace(/\/$/, '');
  if (!STRAPI) return null;

  try {
    const params = new URLSearchParams({
      'filters[slug][$eq]': slug,
      // Campos dos itens de nível 1
      'populate[itens][fields][0]': 'titulo',
      'populate[itens][fields][1]': 'link',
      'populate[itens][fields][2]': 'ordem',
      'populate[itens][fields][3]': 'abrir_nova_aba',
      // Campos dos filhos de nível 2 (dropdown)
      'populate[itens][populate][filhos][fields][0]': 'titulo',
      'populate[itens][populate][filhos][fields][1]': 'link',
      'populate[itens][populate][filhos][fields][2]': 'ordem',
      'populate[itens][populate][filhos][fields][3]': 'abrir_nova_aba',
    });

    const url = `${STRAPI}/api/menus?${params.toString()}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`[getMenu] HTTP ${res.status} ao buscar menu "${slug}"`);
      return null;
    }

    const json = await res.json();

    // Suporte a Strapi v4 e v5
    const raw = json.data?.[0];
    if (!raw) {
      console.warn(`[getMenu] Menu "${slug}" não encontrado no Strapi.`);
      return null;
    }

    const menuData = raw?.attributes ?? raw;

    // Itens — formato v4: { data: [...] } | formato v5: [...] directo
    const itensRaw: any[] =
      menuData.itens?.data ??
      menuData.itens ??
      [];

    // ── Filtrar apenas itens de nível 1 ──
    // Um item é nível 1 se nenhum outro item o tem como filho.
    // Garante que submenus não aparecem duplicados no topo da navbar.
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
      .map((item: any) => {
        const base = normalizeItem(item);

        // Obter filhos (nível 2)
        const filhosRaw: any[] =
          item?.attributes?.filhos?.data ??
          item?.filhos?.data ??
          item?.filhos ??
          [];

        base.filhos = filhosRaw
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