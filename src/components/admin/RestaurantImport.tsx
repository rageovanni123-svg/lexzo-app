import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { locate, parseImportText, type ImportItem, type LocStatus } from "@/lib/importRestaurants";
import { PinPicker } from "./PinPicker";
import { ArrowLeft, MapPin, Upload } from "lucide-react";

const STATUS: Record<LocStatus, { label: string; cls: string }> = {
  ok: { label: "Coordenadas recebidas", cls: "bg-primary/10 text-primary" },
  geocoded: { label: "Achada pelo endereço — confira no mapa", cls: "bg-[#FFC629]/40 text-foreground" },
  approx: { label: "Só o bairro — ajuste o pino", cls: "bg-destructive/10 text-destructive" },
  none: { label: "Sem localização — ajuste o pino", cls: "bg-destructive/10 text-destructive" },
  manual: { label: "Pino ajustado por você", cls: "bg-primary/10 text-primary" },
};

const canImport = (it: ImportItem) =>
  it.errors.length === 0 && !it.duplicate && (it.loc === "ok" || it.loc === "geocoded" || it.loc === "manual");

export function RestaurantImport({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<ImportItem[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const patch = (key: number, fn: (it: ImportItem) => ImportItem) =>
    setItems((prev) => prev && prev.map((it) => (it.key === key ? fn(it) : it)));

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

    // já existe no banco?
    const slugs = parsed.map((p) => p.row.slug).filter(Boolean);
    const { data: existing, error: qErr } = await supabase.from("restaurants").select("slug").in("slug", slugs);
    if (qErr) {
      setMsg(`Erro ao consultar o banco: ${qErr.message}`);
      return;
    }
    const have = new Set((existing ?? []).map((r) => r.slug as string));
    const start = parsed.map((p) => {
      const duplicate = have.has(p.row.slug);
      return { ...p, duplicate, include: p.errors.length === 0 && !duplicate };
    });
    setItems(start);

    // acha a localização dos que vieram sem coordenadas (1 busca/segundo)
    const need = start.filter((p) => p.loc === "none" && p.errors.length === 0 && !p.duplicate);
    for (let i = 0; i < need.length; i++) {
      if (!alive.current) return;
      setProgress(`Buscando localização ${i + 1} de ${need.length}…`);
      try {
        const hit = await locate(need[i].row);
        if (hit && alive.current) {
          patch(need[i].key, (it) => ({
            ...it,
            loc: hit.loc,
            row: { ...it.row, lat: hit.lat, lng: hit.lng },
            include: hit.loc === "geocoded",
          }));
        }
      } catch {
        /* segue para o próximo; ficará "sem localização" */
      }
    }
    setProgress(null);
  };

  const save = async () => {
    if (!items) return;
    const chosen = items.filter((it) => it.include && canImport(it));
    if (!chosen.length) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from("restaurants").insert(chosen.map((it) => it.row));
    setSaving(false);
    if (error) {
      setMsg(
        error.code === "23505"
          ? "Algum nome já existe no banco. Reanalise a lista para ver quais."
          : `Erro ao salvar: ${error.message}`,
      );
      return;
    }
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
          Cole abaixo a lista (JSON) que a outra IA devolveu, ou envie o arquivo. Nada é salvo ainda: você revisa
          cada pino no mapa antes de confirmar.
        </p>
        <textarea
          className="min-h-[260px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
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
        </div>
        {msg && <p className="text-sm text-destructive">{msg}</p>}
      </div>
    );
  }

  // ── Tela 2: revisar ─────────────────────────────────────────────────────
  const ready = items.filter((it) => it.include && canImport(it)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Revisar antes de importar</h2>
        <Button type="button" variant="glass" onClick={() => { setItems(null); setProgress(null); }}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Colar outra lista
        </Button>
      </div>

      {progress && <p className="rounded-md bg-muted px-3 py-2 text-sm">{progress}</p>}

      <ul className="space-y-3">
        {items.map((it) => {
          const st = STATUS[it.loc];
          const blocked = !canImport(it);
          const hasPin = it.row.lat != null && it.row.lng != null;
          return (
            <li key={it.key} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[#2437C9]"
                  checked={it.include && !blocked}
                  disabled={blocked}
                  onChange={(e) => patch(it.key, (x) => ({ ...x, include: e.target.checked }))}
                  aria-label={`Importar ${it.row.name}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{it.row.name || "(sem nome)"}</p>
                  <p className="text-xs text-muted-foreground">
                    {it.row.category || "—"} · {it.row.neighborhood || "—"}
                    {it.row.address ? ` · ${it.row.address}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${st.cls}`}>{st.label}</span>
                    {it.duplicate && <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">Já existe no app</span>}
                    {it.confidence && <span className="text-muted-foreground">confiança da IA: {it.confidence}</span>}
                    {it.mapsUrl && (
                      <a href={it.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        ver no Google Maps
                      </a>
                    )}
                  </div>
                  {it.errors.map((e) => (
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
                      patch(it.key, (x) => ({
                        ...x,
                        loc: "manual",
                        row: { ...x.row, lng, lat },
                        include: x.errors.length === 0 && !x.duplicate,
                      }))
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
      </ul>

      {msg && <p className="text-sm text-destructive">{msg}</p>}

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-border bg-background/90 px-4 py-3 backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {ready} de {items.length} prontos para importar
        </p>
        <Button type="button" onClick={save} disabled={saving || !!progress || ready === 0}>
          {saving ? "Salvando…" : `Importar ${ready}`}
        </Button>
      </div>
    </div>
  );
}
