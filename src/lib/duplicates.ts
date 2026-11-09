import { supabase } from "@/integrations/supabase/client";

/** Detecção de possíveis estabelecimentos duplicados (cadastro manual e importação). */

export interface Known {
  id?: string;
  name: string;
  slug?: string | null;
  phone?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface Match {
  other: Known;
  reason: string;
}

const strip = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// palavras genéricas que não identificam o lugar
const GENERIC = new Set([
  "restaurante", "pizzaria", "lanchonete", "hamburgueria", "padaria", "cafe", "cafeteria",
  "sorveteria", "acaiteria", "churrascaria", "pastelaria", "doceria", "confeitaria",
  "bar", "e", "da", "de", "do", "das", "dos", "the", "ltda", "me", "eireli",
]);

export function nameTokens(name: string): string[] {
  const t = strip(name)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const keep = t.filter((w) => !GENERIC.has(w));
  return keep.length ? keep : t;
}

export const normName = (name: string) => nameTokens(name).join(" ");

export function phoneKey(phone?: string | null): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 8 ? d.slice(-8) : null;
}

export function distanceM(a: Known, b: Known): number | null {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function overlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sb = new Set(b);
  const inter = a.filter((x) => sb.has(x)).length;
  return inter / new Set([...a, ...b]).size;
}

/** Compara um candidato com um outro cadastro; devolve o motivo ou null. */
export function compare(c: Known, o: Known): string | null {
  if (c.id && c.id === o.id) return null;
  const pc = phoneKey(c.phone);
  if (pc && pc === phoneKey(o.phone)) return "mesmo telefone";

  const nc = normName(c.name);
  const no = normName(o.name);
  if (!nc || !no) return null;

  const dist = distanceM(c, o);
  const sameNb =
    !!c.neighborhood && !!o.neighborhood && strip(c.neighborhood) === strip(o.neighborhood);
  const near = dist != null ? dist <= 300 : sameNb;

  if (nc === no && (near || dist == null)) return "mesmo nome na mesma região";
  const contains = nc.length >= 4 && no.length >= 4 && (nc.includes(no) || no.includes(nc));
  if (contains && near) return "nome parecido na mesma região";
  if (dist != null && dist <= 50 && overlap(nameTokens(c.name), nameTokens(o.name)) >= 0.5)
    return "mesmo local, nome parecido";
  return null;
}

export function findDuplicate(c: Known, pool: Known[]): Match | null {
  for (const o of pool) {
    const reason = compare(c, o);
    if (reason) return { other: o, reason };
  }
  return null;
}

/** Carrega todos os cadastros existentes (em páginas de 1000). */
export async function fetchKnown(): Promise<Known[]> {
  const out: Known[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id,name,slug,phone,address,neighborhood,lat,lng")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as Known[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}
