// src/utils/strapi/normalize.ts
// Lógica de normalização de dados do Strapi (v4/v5)

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

/**
 * Normaliza a resposta da API do Strapi (remove o wrapper .data.attributes se existir).
 * Versão simplificada para casos específicos.
 */
export function normalizeStrapi(data: any): any {
  if (!data) return null;
  if (Array.isArray(data)) return data.map(item => item?.attributes ?? item);
  return data?.attributes ?? data;
}
