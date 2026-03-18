// src/utils/menus.ts

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

export async function getMenu(slug: string): Promise<Menu | null> {
  const STRAPI = import.meta.env.STRAPI_URL?.replace(/\/$/, '');
  if (!STRAPI) return null;

  try {
    // ✅ URL correta que já testámos e funciona no teu Strapi v5
    const url = `${STRAPI}/api/menus?filters[slug][$eq]=${slug}&populate[itens][populate]=filhos`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();

    // ✅ Strapi v5 — os dados vêm directamente sem .attributes
    const raw = json.data?.[0];
    if (!raw) return null;

    const todosItens: any[] = raw.itens ?? [];

    // Filtra apenas itens de nível 1 (sem pai)
    // Um item é nível 1 se nenhum outro item o tem como filho
    const idsFilhos = new Set<number>();
    todosItens.forEach((item: any) => {
      const filhos = item.filhos ?? [];
      filhos.forEach((f: any) => idsFilhos.add(f.id));
    });

    const itensNivel1 = todosItens
      .filter((item: any) => !idsFilhos.has(item.id))
      .map((item: any) => ({
        id: item.id,
        titulo: item.titulo ?? '',
        link: item.link ?? '#',
        ordem: item.ordem ?? 0,
        abrir_nova_aba: item.abrir_nova_aba ?? false,
        filhos: (item.filhos ?? [])
          .map((f: any) => ({
            id: f.id,
            titulo: f.titulo ?? '',
            link: f.link ?? '#',
            ordem: f.ordem ?? 0,
            abrir_nova_aba: f.abrir_nova_aba ?? false,
            filhos: [],
          }))
          .sort((a: MenuItem, b: MenuItem) => a.ordem - b.ordem),
      }))
      .sort((a: MenuItem, b: MenuItem) => a.ordem - b.ordem);

    return {
      id: raw.id,
      nome: raw.nome ?? '',
      slug: raw.slug ?? slug,
      itens: itensNivel1,
    };

  } catch (e) {
    console.error('Erro ao buscar menu:', e);
    return null;
  }
}