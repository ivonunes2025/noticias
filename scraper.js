import axios from 'axios';
import * as cheerio from 'cheerio';

const STRAPI_URL = 'http://localhost:1337';
const STRAPI_TOKEN = 'a9be33cd670cf2889bb3a99104f00c0e2efabdb7d5365614028f9b689bf00552185702fe55ddb7cb9fe8ee680064ef5e4222e9dff9df26582c5bc93da6b057752074bbda446f058542b193fda3d58ae6da8013e086db5460dfdf105e6a5d8b5617cb45152d4e5b43a8cf4be93710dffc8e75a48b8f27dc3ebb2921e87d11740b';

async function scrapeNoticias() {
  const { data } = await axios.get('https://www.publico.pt', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-PT,pt;q=0.9',
    }
  });

  const $ = cheerio.load(data);
  const noticias = [];

  $('article').each((i, el) => {
    const tituloEl = $(el).find('h2, h3').first();
    const titulo = tituloEl.text().trim();
    const conteudo = $(el).find('p').first().text().trim();

    if (!titulo || titulo.length < 10) return;

    const slug = titulo.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 100);

    if (slug && !noticias.find(n => n.slug === slug)) {
      noticias.push({
        titulo,
        conteudo: conteudo || titulo,
        slug,
      });
    }
  });

  return noticias;
}

async function enviarParaStrapi(noticia) {
  try {
    await axios.post(
      `${STRAPI_URL}/api/noticias`,
      { data: noticia },
      {
        headers: {
          Authorization: `Bearer ${STRAPI_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error(`✗ Erro "${noticia.titulo}":`, err.response?.data?.error?.message ?? err.message);
  }
}

async function main() {
  console.log('A fazer scraping do Público...');
  const noticias = await scrapeNoticias();
  console.log(`Encontradas ${noticias.length} notícias`);

  for (const noticia of noticias) {
    await enviarParaStrapi(noticia);
    console.log(`✓ Enviada: ${noticia.titulo}`);
  }

  console.log('Concluído!');
}

main();