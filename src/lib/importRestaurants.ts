import { categories, slugify } from "@/data/restaurants";
import { NEIGHBORHOODS, NEIGHBORHOOD_BY_NAME } from "@/data/neighborhoods";
import { safeHttpUrl } from "@/lib/safe-url";
import { DEFAULT_CITY } from "@/lib/site";

/** Faixa de coordenadas aceita (Uberlândia e arredores). Fora disso o pin é considerado errado. */
export const BOUNDS = { latMin: -19.1, latMax: -18.8, lngMin: -48.5, lngMax: -48.1 };

export type LocStatus =
  | "ok" // veio com coordenadas válidas
  | "geocoded" // achada pelo endereço (conferir)
  | "approx" // só o centro do bairro (precisa ajustar)
  | "none" // sem localização (precisa ajustar)
  | "manual"; // ajustada à mão no mapa

export interface ImportRow {
  slug: string;
  name: string;
  category: string;
  neighborhood: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  ifood_url: string | null;
  menu_url: string | null;
  hours_weekdays: string | null;
  hours_weekends: string | null;
  delivery: boolean;
  price_from: number | null;
  description: string | null;
  image: null;
  gallery: string[];
}

export interface ImportItem {
  key: number;
  row: ImportRow;
  loc: LocStatus;
  errors: string[]; // impedem importar
  warnings: string[]; // só avisam
  confidence: string | null;
  notes: string | null;
  mapsUrl: string | null;
  duplicate: boolean;
  include: boolean;
}

export function inBounds(lat: number, lng: number): boolean {
  return lat >= BOUNDS.latMin && lat <= BOUNDS.latMax && lng >= BOUNDS.lngMin && lng <= BOUNDS.lngMax;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const str = (v: unknown): string | null => {
  if (v == null) return null;
  const t = String(v).trim();
  return t === "" || t.toLowerCase() === "null" ? null : t;
};

const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

function hours(v: unknown, label: string, warnings: string[]): string | null {
  const t = str(v);
  if (!t) return null;
  const fixed = t.replace(/\s*[-—–]\s*/, "–").replace(/\s+/g, "");
  const m = fixed.match(/^(\d{1,2}):(\d{2})–(\d{1,2}):(\d{2})$/);
  if (!m) {
    warnings.push(`${label} "${t}" fora do formato 11:00–23:00 — ignorado`);
    return null;
  }
  const p = (h: string) => h.padStart(2, "0");
  return `${p(m[1])}:${m[2]}–${p(m[3])}:${m[4]}`;
}

/** Aceita JSON puro, com ```json … ``` ou com texto antes/depois do array. */
export function parseImportText(text: string): { items: ImportItem[]; error?: string } {
  let src = text.trim();
  const fence = src.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) src = fence[1].trim();
  if (!src.startsWith("[")) {
    const a = src.indexOf("[");
    const b = src.lastIndexOf("]");
    if (a >= 0 && b > a) src = src.slice(a, b + 1);
  }
  let data: unknown;
  try {
    data = JSON.parse(src);
  } catch {
    return { items: [], error: "Não consegui ler o texto como JSON. Cole a lista completa, começando em [ e terminando em ]." };
  }
  if (!Array.isArray(data) || data.length === 0) {
    return { items: [], error: "O JSON precisa ser uma lista (array) com pelo menos 1 estabelecimento." };
  }

  const items: ImportItem[] = data.map((raw, i) => {
    const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const errors: string[] = [];
    const warnings: string[] = [];

    const name = str(o.name) ?? "";
    if (!name) errors.push("sem nome");
    const slug = slugify(name);

    const catRaw = str(o.category);
    const cat = categories.find((c) => catRaw && norm(c) === norm(catRaw));
    if (!cat) errors.push(`categoria inválida (${catRaw ?? "vazia"}) — use: ${categories.join(", ")}`);

    const nbRaw = str(o.neighborhood) ?? "";
    const nb = NEIGHBORHOODS.find((n) => norm(n.name) === norm(nbRaw));
    if (!nbRaw) errors.push("sem bairro");
    else if (!nb) warnings.push(`bairro "${nbRaw}" não está na lista do app`);

    let lat = num(o.lat);
    let lng = num(o.lng);
    let loc: LocStatus = "ok";
    if (lat == null || lng == null) {
      loc = "none";
      lat = lng = null;
    } else if (!inBounds(lat, lng)) {
      warnings.push(`coordenadas (${lat}, ${lng}) fora de Uberlândia — descartadas`);
      loc = "none";
      lat = lng = null;
    }

    const wa = (str(o.whatsapp) ?? "").replace(/\D/g, "");
    let whatsapp: string | null = null;
    if (wa) {
      if (/^55\d{10,11}$/.test(wa)) whatsapp = wa;
      else warnings.push("WhatsApp fora do formato 5534999999999 — ignorado");
    }

    const ig = str(o.instagram);
    const instagram = ig
      ? ig.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[/?#].*$/, "") || null
      : null;

    const pf = num(o.price_from);
    const price_from = pf != null && pf >= 0 ? pf : null;

    const row: ImportRow = {
      slug,
      name,
      category: cat ?? "",
      neighborhood: nb?.name ?? nbRaw,
      address: str(o.address),
      lat,
      lng,
      phone: str(o.phone),
      whatsapp,
      instagram,
      ifood_url: safeHttpUrl(str(o.ifood_url)) ?? null,
      menu_url: safeHttpUrl(str(o.menu_url)) ?? null,
      hours_weekdays: hours(o.hours_weekdays, "Horário da semana", warnings),
      hours_weekends: hours(o.hours_weekends, "Horário do fim de semana", warnings),
      delivery: o.delivery === true,
      price_from,
      description: (str(o.description) ?? "").slice(0, 300) || null,
      image: null,
      gallery: [],
    };

    return {
      key: i,
      row,
      loc,
      errors,
      warnings,
      confidence: str(o._confianca),
      notes: str(o._observacoes),
      mapsUrl: safeHttpUrl(str(o._maps_url)) ?? null,
      duplicate: false,
      include: errors.length === 0,
    };
  });

  // slugs repetidos dentro da própria lista
  const seen = new Set<string>();
  for (const it of items) {
    if (!it.row.slug) continue;
    if (seen.has(it.row.slug)) {
      it.errors.push("nome repetido na lista");
      it.include = false;
    }
    seen.add(it.row.slug);
  }
  return { items };
}

/** Tira "Piso 1", "Loja 117", parênteses e CEP para o geocodificador entender melhor. */
export function cleanAddress(addr: string): string {
  return addr
    .replace(/\(.*?\)/g, "")
    .replace(/,?\s*(piso|loja|lojas|sala|andar|bloco)\s*[^,-]*/gi, "")
    .replace(/\b\d{5}-?\d{3}\b/g, "")
    .replace(/\s*-\s*/g, ", ")
    .replace(/(,\s*){2,}/g, ", ")
    .replace(/[\s,]+$/g, "")
    .trim();
}

interface Hit {
  lat: number;
  lng: number;
}

async function nominatim(q: string): Promise<Hit | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("viewbox", `${BOUNDS.lngMin},${BOUNDS.latMax},${BOUNDS.lngMax},${BOUNDS.latMin}`);
  url.searchParams.set("bounded", "1");
  url.searchParams.set("q", q);
  const res = await fetch(url.toString(), { headers: { "Accept-Language": "pt-BR" } });
  if (!res.ok) throw new Error("Falha na busca de endereço");
  const arr = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!arr.length) return null;
  const lat = parseFloat(arr[0].lat);
  const lng = parseFloat(arr[0].lon);
  return Number.isFinite(lat) && Number.isFinite(lng) && inBounds(lat, lng) ? { lat, lng } : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Descobre onde fica o lugar: 1) pelo endereço; 2) pelo nome + bairro; 3) centro do bairro (aproximado).
 * O Nominatim pede no máximo 1 busca por segundo — por isso o intervalo entre chamadas.
 */
export async function locate(row: ImportRow): Promise<{ lat: number; lng: number; loc: LocStatus } | null> {
  const city = `${DEFAULT_CITY.name}, ${DEFAULT_CITY.region}`;
  const queries: string[] = [];
  if (row.address) queries.push(cleanAddress(row.address));
  queries.push(`${row.name.replace(/\(.*?\)/g, "").trim()}, ${row.neighborhood}, ${city}`);

  for (const q of queries) {
    const hit = await nominatim(q);
    await sleep(1100);
    if (hit) return { ...hit, loc: "geocoded" };
  }
  const n = NEIGHBORHOOD_BY_NAME[row.neighborhood];
  if (n) return { lng: n.coords[0], lat: n.coords[1], loc: "approx" };
  return null;
}
