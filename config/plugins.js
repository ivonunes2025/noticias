module.exports = {
  menus: {
    enabled: true,
  },
  navigation: {
    enabled: true,
    config: {
      contentTypes: [
        'api::noticia.noticia',
        'api::about.about',
        'api::contacto.contacto',
        'api::categoria.categoria',
      ],
    },
  },
};