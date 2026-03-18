// Configurações globais do site para evitar repetição de strings e links
export const SITE_CONFIG = {
  nome: "Notícias Básicas",
  descricao: "A sua fonte diária de informação clara, rigorosa e independente.",
  ano: new Date().getFullYear(),
  linksLegais: {
    termos: "/termos-e-condicoes",
    privacidade: "/privacidade",
    livroReclamacoes: "https://www.livroreclamacoes.pt",
  },
  redesSociais: {
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    website: "https://noticiasbasicas.pt",
  },
  ui: {
    home: {
      destaque: "Em Destaque",
      ultimas: "Últimas",
      paraSi: "Para Si",
      verTodas: "Ver todas →",
    },
    auth: {
      entrar: "Entrar",
      registar: "Registar",
      sair: "Sair",
      perfil: "O Meu Perfil",
    },
    search: {
      placeholder: "Pesquisar...",
      resultados: "Resultados da pesquisa",
      nenhum: "Não há resultados.",
    },
    common: {
      voltar: "Voltar",
      categorias: "Categorias",
      contacto: "Contacto",
    }
  }
};
