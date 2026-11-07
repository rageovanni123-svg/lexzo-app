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
  errors: string[]; // impedem importar (não dá para corrigir na tela)
  warnings: string[]; // só avisam
  source: "lista" | "google";
  /** Começa desmarcado (ex.: fechado temporariamente). */
  startOff: boolean;
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
  if (/^fechado$/i.test(t)) return "Fechado";
  const fixed = t.replace(/\s*[-—–]\s*/, "–").replace(/\s+/g, "");
  const m = fixed.match(/^(\d{1,2}):(\d{2})–(\d{1,2}):(\d{2})$/);
  if (!m) {
    warnings.push(`${label} "${t}" fora do formato 11:00–23:00 — ignorado`);
    return null;
  }
  const p = (h: string) => h.padStart(2, "0");
  return `${p(m[1])}:${m[2]}–${p(m[3])}:${m[4]}`;
}

/** O que ainda falta preencher/corrigir na tela de revisão (impede importar). */
export function problems(it: ImportItem): string[] {
  const out = [...it.errors];
  if (!categories.some((c) => c === it.row.category)) out.push("escolha a categoria");
  if (!it.row.neighborhood.trim()) out.push("escolha o bairro");
  return out;
}

// ── Formato do rastreador "Google Maps / Places" (Apify) ──────────────────────────────

const DAYS_WEEK = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira"];
const DAYS_END = ["sábado", "domingo"];

function cleanUrl(u: unknown): string | null {
  const t = str(u);
  if (!t) return null;
  try {
    const url = new URL(t);
    for (const k of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|igsh|gclid|hl$|_aem|mibextid)/i.test(k)) url.searchParams.delete(k);
    }
    return safeHttpUrl(url.toString().replace(/\?$/, "")) ?? null;
  } catch {
    return safeHttpUrl(t) ?? null;
  }
}

function brPhone(v: unknown): string | null {
  const t = str(v);
  if (!t) return null;
  const d = t.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return t;
}

/** "18:00 to 00:00" -> "18:00–00:00" | "Fechado" | "Atendimento 24 horas" -> "00:00–23:59" | "?…" (não dá para representar) */
function googleDay(h: string): string {
  if (/fechado/i.test(h)) return "Fechado";
  if (/24\s*horas/i.test(h)) return "00:00–23:59";
  const m = h.trim().match(/^(\d{1,2}):(\d{2})\s*(?:to|às|-|–)\s*(\d{1,2}):(\d{2})$/i);
  if (m) {
    const p = (x: string) => x.padStart(2, "0");
    return `${p(m[1])}:${m[2]}–${p(m[3])}:${m[4]}`;
  }
  return `?${h}`;
}

function pickHours(values: string[], label: string, warnings: string[]): string | null {
  if (!values.length) return null;
  const count = new Map<string, number>();
  for (const v of values) count.set(v, (count.get(v) ?? 0) + 1);
  const ranked = [...count.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    const aw = a[0] === "Fechado" || a[0].startsWith("?") ? 1 : 0; // em empate, prefere um horário "de verdade"
    const bw = b[0] === "Fechado" || b[0].startsWith("?") ? 1 : 0;
    return aw - bw;
  });
  const top = ranked[0][0];
  if (top.startsWith("?")) {
    warnings.push(`${label}: horário com intervalo ("${top.slice(1)}") — preencha à mão`);
    return null;
  }
  if (ranked.length > 1) {
    const others = ranked.slice(1).map(([v]) => v.replace(/^\?/, "")).join(" / ");
    warnings.push(`${label}: horários diferentes (${top} e ${others}); usei ${top}`);
  }
  return top;
}

function googleHours(list: unknown, warnings: string[]): { weekdays: string | null; weekends: string | null } {
  if (!Array.isArray(list) || !list.length) return { weekdays: null, weekends: null };
  const byDay = new Map<string, string>();
  for (const e of list as Array<{ day?: string; hours?: string }>) {
    if (e?.day && e?.hours) byDay.set(norm(e.day), googleDay(e.hours));
  }
  const get = (days: string[]) => days.map((d) => byDay.get(norm(d))).filter((v): v is string => !!v);
  return {
    weekdays: pickHours(get(DAYS_WEEK), "Semana", warnings),
    weekends: pickHours(get(DAYS_END), "Fim de semana", warnings),
  };
}

const BURGER_TITLE = /hamb[uú]rg|burger|burguer|smash/i;

function googleCategory(o: Record<string, unknown>): string | null {
  const title = str(o.title) ?? "";
  const cats = [str(o.categoryName), ...(Array.isArray(o.categories) ? o.categories.map(str) : [])]
    .filter((c): c is string => !!c)
    .map(norm);
  const has = (re: RegExp) => cats.some((c) => re.test(c));
  if (BURGER_TITLE.test(title) || has(/hamburguer/)) return "Hambúrguer";
  if (has(/pizzaria|italian|massa/)) return "Italiana";
  if (has(/japon|sushi|temaki/)) return "Japonesa";
  if (has(/vegetarian|vegano/)) return "Vegetariana";
  if (has(/acai|sorveteria/)) return "Açaí";
  if (has(/cafeteria|^cafe$/)) return "Café";
  if (has(/lanchonete|sanduich|fast.?food|cachorro|diner|pastelaria/)) return "Hambúrguer";
  if (has(/restaurante|churrascaria|buffet|comida/)) return "Brasileira";
  return null;
}

/** Converte uma ficha do rastreador do Google para o formato simples usado pelo importador. */
function fromGooglePlace(o: Record<string, unknown>): Record<string, unknown> {
  const loc = (o.location ?? {}) as { lat?: unknown; lng?: unknown };
  const website = cleanUrl(o.website);
  const menu = cleanUrl(o.menu);
  const isIg = (u: string | null) => !!u && /instagram\.com/i.test(u);
  const isFb = (u: string | null) => !!u && /facebook\.com|fb\.com|fb\.me/i.test(u);
  const isIfood = (u: string | null) => !!u && /ifood\.com/i.test(u);

  const igList = Array.isArray(o.instagrams) ? (o.instagrams as unknown[]) : [];
  const fbList = Array.isArray(o.facebooks) ? (o.facebooks as unknown[]) : [];
  const instagram = str(igList[0]) ?? (isIg(website) ? website : null);
  const facebook = cleanUrl(fbList[0]) ?? (isFb(website) ? website : null);
  const own = (u: string | null) => (u && !isIg(u) && !isFb(u) && !isIfood(u) ? u : null);

  const info = (o.additionalInfo ?? {}) as Record<string, Array<Record<string, boolean>>>;
  const service = info["Opções de serviço"] ?? [];
  const delivery = service.some((x) => x && x["Entrega"] === true);

  const nb = str(o.neighborhood);
  const neighborhood = nb && !/^\d+$/.test(nb) && norm(nb) !== "uberlandia" ? nb : null;

  const warn: string[] = [];
  const h = googleHours(o.openingHours, warn);

  return {
    name: o.title,
    category: googleCategory(o),
    neighborhood,
    address: str(o.address)?.replace(/,\s*Brasil$/i, "") ?? null,
    lat: loc.lat,
    lng: loc.lng,
    phone: brPhone(o.phone),
    whatsapp: null,
    instagram,
    ifood_url: isIfood(website) ? website : isIfood(menu) ? menu : null,
    menu_url: own(menu) ?? own(website) ?? facebook,
    hours_weekdays: h.weekdays,
    hours_weekends: h.weekends,
    delivery,
    _maps_url: o.url,
    _warnings: warn,
    _permanentlyClosed: o.permanentlyClosed === true,
    _temporarilyClosed: o.temporarilyClosed === true,
    _categoryName: str(o.categoryName),
  };
}

const NB_ALIAS: Record<string, string> = { "jardim canaa": "Canaã" };

/** "JARDIM BOTÂNICO" / "jardim panorama" -> "Jardim Botânico" / "Jardim Panorama" (só quando estiver todo em maiúsculas ou minúsculas). */
function tidyNeighborhood(v: string): string {
  const t = v.trim();
  if (t !== t.toUpperCase() && t !== t.toLowerCase()) return t;
  return t.toLowerCase().replace(/(^|\s)(\S)/g, (_m, sp: string, ch: string) => sp + ch.toUpperCase());
}

const NOT_A_PLACE = /ponto de [oô]nibus|bus stop/i;

/** Aceita JSON puro, com ```json … ``` ou com texto antes/depois do array. Lê dois formatos: o nosso e o do rastreador do Google. */
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
    let o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const google = "title" in o && ("location" in o || "placeId" in o);
    const errors: string[] = [];
    const warnings: string[] = [];
    let startOff = false;

    if (google) {
      const g = fromGooglePlace(o);
      warnings.push(...(g._warnings as string[]));
      if (g._permanentlyClosed) errors.push("fechado permanentemente no Google");
      if (g._temporarilyClosed) {
        warnings.push("fechado temporariamente no Google — começa desmarcado");
        startOff = true;
      }
      if (NOT_A_PLACE.test(String(g._categoryName ?? ""))) errors.push("não parece um estabelecimento (ponto de ônibus)");
      if (!g.category && g._categoryName) warnings.push(`categoria do Google "${g._categoryName}" sem equivalente — escolha uma`);
      o = g;
    }

    const name = str(o.name) ?? "";
    if (!name) errors.push("sem nome");
    const slug = slugify(name);

    const catRaw = str(o.category);
    const cat = categories.find((c) => catRaw && norm(c) === norm(catRaw));

    const nbRaw0 = str(o.neighborhood) ?? "";
    const nbRaw = NB_ALIAS[norm(nbRaw0)] ?? tidyNeighborhood(nbRaw0);
    const nb = NEIGHBORHOODS.find((n) => norm(n.name) === norm(nbRaw));

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

    const pf = google ? null : num(o.price_from);
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
      source: google ? ("google" as const) : ("lista" as const),
      startOff,
      confidence: google ? "dados do Google Maps" : str(o._confianca),
      notes: str(o._observacoes),
      mapsUrl: safeHttpUrl(str(o._maps_url)) ?? null,
      duplicate: false,
      include: false,
    };
  });

  // Nomes repetidos (ex.: redes com várias unidades): acrescenta o bairro; se ainda repetir, um número.
  const byName = new Map<string, ImportItem[]>();
  for (const it of items) {
    if (!it.row.slug) continue;
    byName.set(it.row.slug, [...(byName.get(it.row.slug) ?? []), it]);
  }
  const used = new Set<string>();
  for (const group of byName.values()) {
    if (group.length > 1) {
      for (const it of group) {
        const withNb = slugify(`${it.row.name} ${it.row.neighborhood}`);
        if (withNb) it.row.slug = withNb;
      }
    }
  }
  for (const it of items) {
    if (!it.row.slug) continue;
    let slug = it.row.slug;
    let n = 2;
    while (used.has(slug)) slug = `${it.row.slug}-${n++}`;
    used.add(slug);
    it.row.slug = slug;
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
