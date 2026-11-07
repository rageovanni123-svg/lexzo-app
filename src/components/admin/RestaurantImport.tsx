import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { categories } from "@/data/restaurants";
import { NEIGHBORHOODS, NEIGHBORHOOD_BY_NAME } from "@/data/neighborhoods";
import { locate, parseImportText, problems, type ImportItem, type LocStatus } from "@/lib/importRestaurants";
import { PinPicker } from "./PinPicker";
import { ArrowLeft, MapPin, Upload } from "lucide-react";

const STATUS: Record<LocStatus, { label: string; cls: string }> = {
  ok: { label: "Localização recebida", cls: "bg-primary/10 text-primary" },
  geocoded: { label: "Achada pelo endereço — confira no mapa", cls: "bg-[#FFC629]/40 text-foreground" },
  approx: { label: "Só o bairro — ajuste o pino", cls: "bg-destructive/10 text-destructive" },
  none: { label: "Sem localização — ajuste o pino", cls: "bg-destructive/10 text-destructive" },
  manual: { label: "Pino ajustado por você", cls: "bg-primary/10 text-primary" },
};

const ready = (it: ImportItem) =>
  problems(it).length === 0 && !it.duplicate && (it.loc === "ok" || it.loc === "geocoded" || it.loc === "manual");

const chunk = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

type Filter = "todos" | "atencao" | "prontos";

export function RestaurantImport({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<ImportItem[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<Filter>("todos");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const patch = (key: number, fn: (it: ImportItem) => ImportItem) =>
    setItems((prev) => prev && prev.map((it) => (it.key === key ? fn(it) : it)));

  /** Depois de editar um campo, marca o item automaticamente se ele ficou pronto. */
  const edit = (key: number, fn: (it: ImportItem) => ImportItem) =>
    patch(key, (it) => {
      const next = fn(it);
      return { ...next, include: ready(next) && (next.include || !next.startOff) };
    });

  const onFile = async (f: File | undefined) => {
    if (f) setText(await f.text());
  };

  const analyze = async () => {
    setMsg(null);
    const { items: parsed, error } = parseImportText(text);
    if (error) {
      setMsg(error);
      return;
    }

    // já existe no banco? (em blocos, para não estourar o tamanho do endereço da consulta)
    const slugs = parsed.map((p) => p.row.slug).filter(Boolean);
    const have = new Set<string>();
    for (const part of chunk(slugs, 50)) {
      const { data: existing, error: qErr } = await supabase.from("restaurants").select("slug").in("slug", part);
      if (qErr) {
        setMsg(`Erro ao consultar o banco: ${qErr.message}`);
        return;
      }
      for (const r of existing ?? []) have.add(r.slug as string);
    }
    const start = parsed.map((p) => {
      const next = { ...p, duplicate: have.has(p.row.slug) };
      return { ...next, include: ready(next) && !next.startOff };
    });
    setItems(start);
    setFilter("todos");

    // acha a localização dos que vieram sem coordenadas (1 busca/segundo)
    const need = start.filter((p) => p.loc === "none" && p.errors.length === 0 && !p.duplicate);
    for (let i = 0; i < need.length; i++) {
      if (!alive.current) return;
      setProgress(`Buscando localização ${i + 1} de ${need.length}…`);
      try {
        const hit = await locate(need[i].row);
        if (hit && alive.current) {
          patch(need[i].key, (it) => {
            const next = { ...it, loc: hit.loc, row: { ...it.row, lat: hit.lat, lng: hit.lng } };
            return { ...next, include: hit.loc === "geocoded" && ready(next) && !next.startOff };
          });
        }
      } catch {
        /* segue para o próximo; ficará "sem localização" */
      }
    }
    setProgress(null);
  };

  const chosen = useMemo(() => (items ?? []).filter((it) => it.include && ready(it)), [items]);

  const save = async () => {
    if (!chosen.length) return;
    setSaving(true);
    setMsg(null);
    let saved = 0;
    for (const part of chunk(chosen, 100)) {
      const { error } = await supabase.from("restaurants").insert(part.map((it) => it.row));
      if (error) {
        setSaving(false);
        setMsg(
          `${saved ? `${saved} importados, mas ` : ""}erro ao salvar: ${
            error.code === "23505" ? "algum nome já existe no banco (analise a lista de novo para ver quais)" : error.message
          }`,
        );
        return;
      }
      saved += part.length;
    }
    setSaving(false);
    onDone();
  };

  // ── Tela 1: colar o JSON ────────────────────────────────────────────────
  if (!items) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Importar estabelecimentos</h2>
          <Button type="button" variant="glass" onClick={onDone}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Envie o arquivo (.json) ou cole a lista. Aceita a lista da outra IA e também o arquivo exportado do rastreador
          do Google Maps. Nada é salvo ainda: você revisa tudo antes de confirmar.
        </p>
        <textarea
          className="min-h-[220px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='[ { "name": "…", "category": "…", … } ]'
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={analyze} disabled={!text.trim()}>
            Analisar lista
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary">
            <Upload className="h-4 w-4" /> Enviar arquivo (.json ou .txt)
            <input type="file" accept=".json,.txt,text/plain,application/json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {text && <span className="text-xs text-muted-foreground">{Math.round(text.length / 1024)} KB carregados</span>}
        </div>
        {msg && <p className="text-sm text-destructive">{msg}</p>}
      </div>
    );
  }

  // ── Tela 2: revisar ─────────────────────────────────────────────────────
  const total = items.length;
  const readyCount = items.filter(ready).length;
  const attention = (it: ImportItem) => !ready(it) || it.warnings.length > 0 || it.duplicate;
  const shown = items.filter((it) => (filter === "todos" ? true : filter === "atencao" ? attention(it) : ready(it)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Revisar antes de importar</h2>
        <Button type="button" variant="glass" onClick={() => { setItems(null); setProgress(null); setMsg(null); }}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Trocar a lista
        </Button>
      </div>

      {progress && <p className="rounded-md bg-muted px-3 py-2 text-sm">{progress}</p>}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          {total} na lista · {readyCount} prontos · {total - readyCount} precisam de ajuste
        </span>
        <span className="mx-1 text-border">|</span>
        {(["todos", "atencao", "prontos"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f ? "bg-primary text-primary-foreground" : "glass-btn"}`}
          >
            {f === "todos" ? "Todos" : f === "atencao" ? "Com aviso ou pendência" : "Prontos"}
          </button>
        ))}
        <span className="mx-1 text-border">|</span>
        <button
          type="button"
          className="text-xs text-primary underline"
          onClick={() => setItems((prev) => prev && prev.map((it) => ({ ...it, include: ready(it) && !it.startOff })))}
        >
          Marcar todos os prontos
        </button>
        <button
          type="button"
          className="text-xs text-primary underline"
          onClick={() => setItems((prev) => prev && prev.map((it) => ({ ...it, include: false })))}
        >
          Desmarcar todos
        </button>
      </div>

      <ul className="space-y-3">
        {shown.map((it) => {
          const st = STATUS[it.loc];
          const isReady = ready(it);
          const hasPin = it.row.lat != null && it.row.lng != null;
          const probs = problems(it);
          const nbKnown = Boolean(NEIGHBORHOOD_BY_NAME[it.row.neighborhood]);
          return (
            <li key={it.key} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[#2437C9]"
                  checked={it.include && isReady}
                  disabled={!isReady}
                  onChange={(e) => patch(it.key, (x) => ({ ...x, include: e.target.checked }))}
                  aria-label={`Importar ${it.row.name}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold">{it.row.name || "(sem nome)"}</p>
                  {it.row.address && <p className="text-xs text-muted-foreground">{it.row.address}</p>}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Categoria"
                      className={`h-8 rounded-md border bg-background px-2 text-xs ${categories.some((c) => c === it.row.category) ? "border-input" : "border-destructive"}`}
                      value={it.row.category}
                      onChange={(e) => edit(it.key, (x) => ({ ...x, row: { ...x.row, category: e.target.value } }))}
                    >
                      <option value="">— categoria —</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Bairro"
                      className={`h-8 max-w-[200px] rounded-md border bg-background px-2 text-xs ${it.row.neighborhood ? "border-input" : "border-destructive"}`}
                      value={it.row.neighborhood}
                      onChange={(e) => edit(it.key, (x) => ({ ...x, row: { ...x.row, neighborhood: e.target.value } }))}
                    >
                      <option value="">— bairro —</option>
                      {it.row.neighborhood && !nbKnown && <option value={it.row.neighborhood}>{it.row.neighborhood}</option>}
                      {NEIGHBORHOODS.map((n) => (
                        <option key={n.name} value={n.name}>{n.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${st.cls}`}>{st.label}</span>
                    {it.duplicate && <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">Já existe no app</span>}
                    {it.confidence && <span className="text-muted-foreground">{it.confidence}</span>}
                    {it.mapsUrl && (
                      <a href={it.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        ver no Google Maps
                      </a>
                    )}
                  </div>
                  {probs.map((e) => (
                    <p key={e} className="mt-1 text-xs text-destructive">✕ {e}</p>
                  ))}
                  {it.warnings.map((w) => (
                    <p key={w} className="mt-1 text-xs text-muted-foreground">⚠ {w}</p>
                  ))}
                  {it.notes && <p className="mt-1 text-xs text-muted-foreground">Obs. da IA: {it.notes}</p>}
                </div>
                {hasPin && (
                  <Button
                    type="button"
                    size="sm"
                    variant="glass"
                    onClick={() => setOpenKey(openKey === it.key ? null : it.key)}
                  >
                    <MapPin className="mr-1 h-4 w-4" /> {openKey === it.key ? "Fechar mapa" : "Ver / ajustar pino"}
                  </Button>
                )}
              </div>

              {openKey === it.key && hasPin && (
                <div className="mt-3">
                  <PinPicker
                    lng={it.row.lng as number}
                    lat={it.row.lat as number}
                    onChange={(lng, lat) =>
                      edit(it.key, (x) => ({ ...x, loc: "manual", row: { ...x.row, lng, lat } }))
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Arraste o pino ou clique no mapa para o ponto exato da entrada do estabelecimento.
                  </p>
                </div>
              )}
            </li>
          );
        })}
        {shown.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Nada neste filtro.</li>}
      </ul>

      {msg && <p className="text-sm text-destructive">{msg}</p>}

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-border bg-background/90 px-4 py-3 backdrop-blur">
        <p className="text-sm text-muted-foreground">{chosen.length} marcados para importar</p>
        <Button type="button" onClick={save} disabled={saving || !!progress || chosen.length === 0}>
          {saving ? "Salvando…" : `Importar ${chosen.length}`}
        </Button>
      </div>
    </div>
  );
}
