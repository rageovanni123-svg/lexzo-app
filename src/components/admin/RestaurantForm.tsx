import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_CITY } from "@/lib/site";
import { Switch } from "@/components/ui/switch";
import { NEIGHBORHOODS, NEIGHBORHOOD_BY_NAME } from "@/data/neighborhoods";
import { categories, slugify } from "@/data/restaurants";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

interface FormState {
  name: string;
  slug: string;
  category: string;
  neighborhood: string;
  showPrice: boolean;
  price_from: string;
  delivery: boolean;
  rating: number;
  image: string;
  lng: number;
  lat: number;
  phone: string;
  whatsapp: string;
  ifood_url: string;
  menu_url: string;
  instagram: string;
  address: string;
  hours_weekdays: string;
  hours_weekends: string;
  gallery: string[];
  description: string;
}

const empty: FormState = {
  name: "",
  slug: "",
  category: categories[0],
  neighborhood: NEIGHBORHOODS[0].name,
  showPrice: false,
  price_from: "",
  delivery: false,
  rating: 4.5,
  image: "",
  lng: NEIGHBORHOODS[0].coords[0],
  lat: NEIGHBORHOODS[0].coords[1],
  phone: "",
  whatsapp: "",
  ifood_url: "",
  menu_url: "",
  instagram: "",
  address: "",
  hours_weekdays: "",
  hours_weekends: "",
  gallery: [],
  description: "",
};

export function RestaurantForm({ id, onDone }: { id: string | null; onDone: () => void }) {
  const [f, setF] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(Boolean(id));
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // Load existing
  useEffect(() => {
    if (!id) return;
    supabase.from("restaurants").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) {
        // Coerce nullable string columns to "" so .trim() never blows up.
        const stringKeys: (keyof FormState)[] = [
          "name","slug","category","neighborhood","image","phone","whatsapp",
          "ifood_url","menu_url","instagram","address","hours_weekdays","hours_weekends","description",
        ];
        const cleaned: Record<string, unknown> = { ...data };
        for (const k of stringKeys) {
          if (cleaned[k as string] == null) cleaned[k as string] = "";
        }
        const merged = { ...empty, ...cleaned } as FormState;
        const rawPrice = (data as { price_from?: number | string | null }).price_from;
        merged.showPrice = rawPrice != null;
        merged.price_from = rawPrice != null ? String(rawPrice) : "";
        if (data.lat == null || data.lng == null) {
          merged.lat = empty.lat;
          merged.lng = empty.lng;
        }
        const rawGallery = (data as { gallery?: unknown }).gallery;
        merged.gallery = Array.isArray(rawGallery)
          ? (rawGallery as unknown[]).filter((u): u is string => typeof u === "string")
          : [];
        setF(merged);
      }
    });
  }, [id]);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [f.lng, f.lat],
      zoom: 13,
    });
    mapRef.current = map;
    markerRef.current = new maplibregl.Marker({ draggable: true, color: "#2437C9" })
      .setLngLat([f.lng, f.lat])
      .addTo(map);
    markerRef.current.on("dragend", () => {
      const ll = markerRef.current!.getLngLat();
      setF((s) => ({ ...s, lng: ll.lng, lat: ll.lat }));
    });
    map.on("click", (e) => {
      markerRef.current!.setLngLat(e.lngLat);
      setF((s) => ({ ...s, lng: e.lngLat.lng, lat: e.lngLat.lat }));
    });
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker when coords change externally
  useEffect(() => {
    markerRef.current?.setLngLat([f.lng, f.lat]);
  }, [f.lng, f.lat]);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  const onName = (name: string) => {
    setF((s) => ({ ...s, name, ...(slugEdited ? {} : { slug: slugify(name) }) }));
  };

  const onNeighborhood = (name: string) => {
    const n = NEIGHBORHOOD_BY_NAME[name];
    setF((s) => ({ ...s, neighborhood: name, ...(n ? { lng: n.coords[0], lat: n.coords[1] } : {}) }));
    if (n) mapRef.current?.flyTo({ center: n.coords, zoom: 14 });
  };

  const searchAddress = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchErr(null);
    try {
      // Nominatim (OpenStreetMap) — gratuito, sem chave. Viés para a cidade padrão (DEFAULT_CITY).
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");
      url.searchParams.set("countrycodes", "br");
      url.searchParams.set("q", `${q}, ${DEFAULT_CITY.name}, ${DEFAULT_CITY.region}`);
      const res = await fetch(url.toString(), { headers: { "Accept-Language": "pt-BR" } });
      if (!res.ok) throw new Error("Falha na busca");
      const arr = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (!arr.length) {
        setSearchErr("Endereço não encontrado");
        return;
      }
      const lat = parseFloat(arr[0].lat);
      const lng = parseFloat(arr[0].lon);
      setF((s) => ({ ...s, lat, lng, address: s.address || arr[0].display_name }));
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 17 });
    } catch (e) {
      setSearchErr(e instanceof Error ? e.message : "Erro na busca");
    } finally {
      setSearching(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    const isHttp = (v: string) => v === "" || /^https?:\/\//i.test(v.trim());
    if (!isHttp(f.image) || !isHttp(f.ifood_url) || !isHttp(f.menu_url)) {
      setSaving(false);
      setErr("URLs (imagem, iFood, cardápio) devem começar com http:// ou https://");
      return;
    }
    if (f.instagram && /^https?:/i.test(f.instagram) && !/instagram\.com\//i.test(f.instagram)) {
      setSaving(false);
      setErr("URL do Instagram inválida");
      return;
    }
    // Normaliza Instagram: aceita @handle, handle ou URL completa do perfil → guarda só o handle
    let instagramHandle = f.instagram.trim();
    if (instagramHandle) {
      instagramHandle = instagramHandle
        .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
        .replace(/^@/, "")
        .replace(/[/?#].*$/, "");
    }
    const cleanGallery = (f.gallery ?? []).map((u) => (u ?? "").trim()).filter((u) => u.length > 0);
    if (cleanGallery.some((u) => !/^https?:\/\//i.test(u))) {
      setSaving(false);
      setErr("Todas as URLs da galeria devem começar com http:// ou https://");
      return;
    }
    const slug = slugify(f.slug || f.name);
    if (!slug) {
      setSaving(false);
      setErr("Informe o nome (ou um slug) para gerar o endereço da página");
      return;
    }
    const { showPrice, price_from, ...rest } = f;
    const priceNumber = showPrice && price_from.trim() !== "" ? Number(price_from.replace(",", ".")) : null;
    if (showPrice && (priceNumber === null || !Number.isFinite(priceNumber) || priceNumber < 0)) {
      setErr("Informe um preço válido (ex.: 25 ou 24,90) ou desligue “Mostrar a partir de”.");
      setSaving(false);
      return;
    }
    const payload = { ...rest, price_from: priceNumber, slug, instagram: instagramHandle || null, image: f.image || null, gallery: cleanGallery };
    const { error } = id
      ? await supabase.from("restaurants").update(payload).eq("id", id)
      : await supabase.from("restaurants").insert(payload);
    setSaving(false);
    if (error) {
      setErr(
        error.code === "23505"
          ? `Já existe um restaurante com o endereço "${slug}". Altere o slug e tente de novo.`
          : error.message,
      );
    } else onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{id ? "Editar restaurante" : "Novo restaurante"}</h2>
        <Button type="button" variant="glass" onClick={onDone}>Cancelar</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome"><Input value={f.name} onChange={(e) => onName(e.target.value)} required /></Field>
        <Field label="Endereço da página (slug)">
          <Input
            value={f.slug}
            onChange={(e) => {
              setSlugEdited(true);
              setField("slug", slugify(e.target.value));
            }}
            placeholder="trattoria-bella"
            required
          />
          <p className="text-xs text-muted-foreground">
            /restaurante/{f.slug || "…"} — mudar depois quebra links já indexados no Google.
          </p>
        </Field>
        <Field label="Categoria">
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.category} onChange={(e) => setField("category", e.target.value)}>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Bairro">
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.neighborhood} onChange={(e) => onNeighborhood(e.target.value)}>
            {NEIGHBORHOODS.map((n) => <option key={n.name}>{n.name}</option>)}
          </select>
        </Field>
        <Field label="Preço">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={f.showPrice} onCheckedChange={(v) => setField("showPrice", v)} />
            Mostrar “a partir de” na página
          </label>
          {f.showPrice && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">a partir de R$</span>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={f.price_from}
                onChange={(e) => setField("price_from", e.target.value)}
                placeholder="25"
                className="max-w-[140px]"
              />
            </div>
          )}
        </Field>
        <Field label="Endereço"><Input value={f.address} onChange={(e) => setField("address", e.target.value)} /></Field>
        <Field label="Imagem (URL)"><Input value={f.image} onChange={(e) => setField("image", e.target.value)} /></Field>
        <Field label="Telefone"><Input value={f.phone} onChange={(e) => setField("phone", e.target.value)} /></Field>
        <Field label="WhatsApp (E.164 sem +)"><Input value={f.whatsapp} onChange={(e) => setField("whatsapp", e.target.value)} placeholder="5534999999999" /></Field>
        <Field label="iFood URL"><Input value={f.ifood_url} onChange={(e) => setField("ifood_url", e.target.value)} /></Field>
        <Field label="Cardápio URL"><Input value={f.menu_url} onChange={(e) => setField("menu_url", e.target.value)} /></Field>
        <Field label="Instagram (@handle ou URL)"><Input value={f.instagram} onChange={(e) => setField("instagram", e.target.value)} placeholder="@perfil ou https://instagram.com/perfil" /></Field>
        <Field label="Avaliação (0-5)"><Input type="number" step="0.1" min="0" max="5" value={f.rating} onChange={(e) => setField("rating", Number(e.target.value))} /></Field>
        <Field label="Horário semana"><Input value={f.hours_weekdays} onChange={(e) => setField("hours_weekdays", e.target.value)} placeholder="11:00–23:00" /></Field>
        <Field label="Horário fim de semana"><Input value={f.hours_weekends} onChange={(e) => setField("hours_weekends", e.target.value)} placeholder="12:00–00:00" /></Field>

        <div className="md:col-span-2">
          <Field label="Descrição (breve)">
            <textarea
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={f.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Uma breve descrição do restaurante (1-2 frases)"
              maxLength={300}
            />
          </Field>
        </div>

        <div className="flex items-center gap-6 md:col-span-2">
          <label className="flex items-center gap-2"><Switch checked={f.delivery} onCheckedChange={(v) => setField("delivery", v)} /> Delivery</label>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Localização (clique no mapa ou arraste o pino)</Label>
        <div className="mb-2 flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                searchAddress();
              }
            }}
            placeholder="Buscar endereço (ex: Av. Rondon Pacheco, 1234)"
          />
          <Button type="button" variant="outline" onClick={searchAddress} disabled={searching}>
            {searching ? "Buscando…" : "Buscar"}
          </Button>
        </div>
        {searchErr && <p className="mb-2 text-xs text-destructive">{searchErr}</p>}
        <div ref={containerRef} className="h-72 w-full overflow-hidden rounded-lg border border-border" />
        <p className="mt-1 text-xs text-muted-foreground">lng: {f.lng.toFixed(5)} · lat: {f.lat.toFixed(5)}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Galeria de fotos (URLs)</Label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setF((s) => ({ ...s, gallery: [...s.gallery, ""] }))}
            >
              + Adicionar foto
            </Button>
          </div>
        </div>
        {f.gallery.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma foto na galeria. Clique em "Adicionar foto" para incluir.</p>
        )}
        <div className="space-y-2">
          {f.gallery.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                {url && /^https?:\/\//i.test(url) && (
                  <img src={url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <Input
                value={url}
                placeholder="https://…"
                onChange={(e) =>
                  setF((s) => {
                    const g = [...s.gallery];
                    g[i] = e.target.value;
                    return { ...s, gallery: g };
                  })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setF((s) => ({ ...s, gallery: s.gallery.filter((_, idx) => idx !== i) }))}
              >
                Remover
              </Button>
            </div>
          ))}
        </div>
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
