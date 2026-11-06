/** Endereço público do site. Troque aqui quando o domínio próprio estiver ligado. */
export const SITE_URL = "https://lexzo-app.vercel.app";
export const SITE_NAME = "Placeali";

/** Frase curta usada nos títulos e descrições gerais (sem cidade e sem categoria). */
export const SITE_TAGLINE = "Encontre lugares no mapa";
export const SITE_DESCRIPTION =
  "Encontre lugares no mapa: veja informações, contato, horários e como chegar. Começando pelos restaurantes.";

/**
 * Única cidade cadastrada por enquanto. Só é usada em dados de cada lugar (endereço no Google,
 * busca de endereço no admin). Quando houver mais cidades, isso vira uma coluna `city` no banco.
 */
export const DEFAULT_CITY = { name: "Uberlândia", region: "MG" };
