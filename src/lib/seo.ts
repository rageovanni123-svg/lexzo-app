import { priceFromLabel, type Restaurant } from "@/data/restaurants";
import { safeHttpUrl } from "@/lib/safe-url";
import { DEFAULT_CITY } from "@/lib/site";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const WEEKEND = ["Saturday", "Sunday"];

/** "11:00–23:00" | "11–23" | "12:00-00:00" -> { opens: "11:00", closes: "23:00" } */
function parseRange(text?: string): { opens: string; closes: string } | null {
  const m = text?.match(/(\d{1,2})(?::(\d{2}))?\s*[–—-]\s*(\d{1,2})(?::(\d{2}))?/);
  if (!m) return null;
  const fmt = (h: string, min?: string) => `${h.padStart(2, "0")}:${min ?? "00"}`;
  return { opens: fmt(m[1], m[2]), closes: fmt(m[3], m[4]) };
}

function openingHours(r: Restaurant) {
  if (!r.hours) return undefined;
  const week = parseRange(r.hours.weekdays);
  if (!week) return undefined;
  const weekend = parseRange(r.hours.weekends);

  const specs = [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: weekend ? WEEKDAYS : [...WEEKDAYS, ...WEEKEND],
      ...week,
    },
  ];
  if (weekend) {
    specs.push({ "@type": "OpeningHoursSpecification", dayOfWeek: WEEKEND, ...weekend });
  }
  return specs;
}

export function instagramHandle(r: Pick<Restaurant, "instagram" | "menuUrl">): string | undefined {
  const isInstagramUrl = (u?: string) => !!u && /instagram\.com/i.test(u);
  const clean = (v: string) =>
    v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[/?#].*$/, "");
  if (r.instagram) return clean(r.instagram) || undefined;
  if (isInstagramUrl(r.menuUrl)) return clean(r.menuUrl!) || undefined;
  return undefined;
}

export function facebookUrl(r: Pick<Restaurant, "menuUrl">): string | undefined {
  return r.menuUrl && /facebook\.com|fb\.com|fb\.me/i.test(r.menuUrl) ? safeHttpUrl(r.menuUrl) : undefined;
}

/** Link do cardápio/site próprio (menuUrl que não é iFood nem rede social). */
export function siteUrl(r: Pick<Restaurant, "menuUrl">): string | undefined {
  const u = r.menuUrl;
  if (!u || /ifood\.com|facebook\.com|fb\.com|fb\.me|instagram\.com/i.test(u)) return undefined;
  return safeHttpUrl(u);
}

export function ifoodUrl(r: Pick<Restaurant, "ifoodUrl" | "menuUrl">): string | undefined {
  if (r.ifoodUrl) return safeHttpUrl(r.ifoodUrl);
  return r.menuUrl && /ifood\.com/i.test(r.menuUrl) ? safeHttpUrl(r.menuUrl) : undefined;
}

export function restaurantDescription(r: Restaurant): string {
  if (r.description) return r.description;
  return `${r.name}: restaurante de comida ${r.category.toLowerCase()} no bairro ${r.neighborhood}, ${DEFAULT_CITY.name}${
    r.delivery ? ", com delivery" : ""
  }.`;
}

/**
 * JSON-LD schema.org/Restaurant. Devolve uma string já segura para ir dentro de <script>:
 * "<" é escapado para que um texto com "</script>" cadastrado no admin não feche a tag.
 *
 * Obs.: o app não tem nota/avaliação, então nunca emite aggregateRating.
 */
export function restaurantJsonLd(r: Restaurant): string {
  const images = [r.image, ...(r.gallery ?? [])].map(safeHttpUrl).filter((u): u is string => !!u);
  const ig = instagramHandle(r);
  const fb = facebookUrl(r);
  const sameAs = [ig ? `https://instagram.com/${ig}` : undefined, fb].filter(Boolean);
  const [lng, lat] = r.coords;

  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: r.name,
    description: restaurantDescription(r),
    image: images.length ? images : undefined,
    servesCuisine: r.category,
    priceRange: priceFromLabel(r.priceFrom),
    telephone: r.phone,
    address: r.address
      ? {
          "@type": "PostalAddress",
          streetAddress: r.address,
          addressLocality: DEFAULT_CITY.name,
          addressRegion: DEFAULT_CITY.region,
          addressCountry: "BR",
        }
      : undefined,
    geo:
      Number.isFinite(lat) && Number.isFinite(lng)
        ? { "@type": "GeoCoordinates", latitude: lat, longitude: lng }
        : undefined,
    openingHoursSpecification: openingHours(r),
    hasMenu: siteUrl(r),
    sameAs: sameAs.length ? sameAs : undefined,
  };

  return JSON.stringify(data).replace(/</g, "\\u003c");
}
