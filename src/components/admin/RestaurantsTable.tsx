import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { RestaurantForm } from "./RestaurantForm";
import { RestaurantImport } from "./RestaurantImport";
import { priceFromLabel } from "@/data/restaurants";
import { Pencil, Trash2, Plus, ExternalLink, Upload, Archive, ArchiveRestore } from "lucide-react";
import { LinkBadges } from "./LinkBadges";

interface Row {
  id: string;
  slug: string;
  name: string;
  category: string;
  neighborhood: string;
  price_from: number | string | null;
  lat: number | null;
  lng: number | null;
  archived?: boolean | null;
  instagram?: string | null;
  menu_url?: string | null;
  ifood_url?: string | null;
}

export function RestaurantsTable() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null | undefined>(undefined); // undefined=closed, null=new
  const [importing, setImporting] = useState(false);
  const [tab, setTab] = useState<"active" | "archived">("active");
  const savedScroll = useRef<number | null>(null);

  // Guarda onde a lista estava ao abrir o formulário/importação e volta pra lá ao fechar.
  const openEditing = (id: string | null) => {
    savedScroll.current = window.scrollY;
    setEditing(id);
  };
  const openImporting = () => {
    savedScroll.current = window.scrollY;
    setImporting(true);
  };
  const listVisible = editing === undefined && !importing;
  useEffect(() => {
    if (!listVisible || savedScroll.current == null) return;
    const y = savedScroll.current;
    savedScroll.current = null;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }, [listVisible]);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
    qc.invalidateQueries({ queryKey: ["restaurants"] });
  };

  const setArchived = async (id: string, archived: boolean) => {
    const { error } = await supabase.from("restaurants").update({ archived }).eq("id", id);
    if (error) {
      alert(
        /archived/i.test(error.message)
          ? "Falta rodar o SQL de arquivamento no Supabase (supabase/migrations/20261111120000_archived.sql)."
          : error.message,
      );
    } else refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este restaurante?")) return;
    const { data: deleted, error } = await supabase
      .from("restaurants")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) alert(error.message);
    else if (!deleted) alert("Não foi possível excluir. Confirme se sua conta tem permissão de administrador.");
    else refresh();
  };

  if (importing) {
    return (
      <RestaurantImport
        onDone={() => {
          setImporting(false);
          refresh();
        }}
      />
    );
  }

  if (editing !== undefined) {
    // Navegação entre cadastros: segue a ordem da lista da aba atual (por nome).
    const ids = (data ?? [])
      .filter((r) => (tab === "archived" ? !!r.archived : !r.archived))
      .map((r) => r.id);
    const idx = editing ? ids.indexOf(editing) : -1;
    return (
      <RestaurantForm
        id={editing}
        nav={
          idx >= 0
            ? {
                position: idx + 1,
                total: ids.length,
                prevId: idx > 0 ? ids[idx - 1] : null,
                nextId: idx < ids.length - 1 ? ids[idx + 1] : null,
                go: (nid) => setEditing(nid),
              }
            : undefined
        }
        onDone={() => {
          setEditing(undefined);
          refresh();
        }}
      />
    );
  }

  const activeCount = data?.filter((r) => !r.archived).length ?? 0;
  const archivedCount = data?.filter((r) => r.archived).length ?? 0;
  const rows = data?.filter((r) => (tab === "archived" ? !!r.archived : !r.archived));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" className="flex gap-1 rounded-full bg-muted p-1 text-sm">
          {(["active", "archived"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`h-9 rounded-full px-4 font-medium transition-colors ${
                tab === t ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t === "active" ? `Ativos (${activeCount})` : `Arquivados (${archivedCount})`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="glass" onClick={openImporting}>
            <Upload className="mr-2 h-4 w-4" /> Importar lista
          </Button>
          <Button onClick={() => openEditing(null)}>
            <Plus className="mr-2 h-4 w-4" /> Novo restaurante
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">Erro ao carregar: {(error as Error).message}</p>}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Bairro</th>
              <th className="px-3 py-2">A partir de</th>
              <th className="hidden px-3 py-2 md:table-cell">Links</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Carregando…</td></tr>
            )}
            {data && rows?.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">{tab === "archived" ? "Nenhum restaurante arquivado." : "Nenhum restaurante cadastrado."}</td></tr>
            )}
            {rows?.map((r) => {
              const noLoc = r.lat == null || r.lng == null;
              return (
                <tr
                  key={r.id}
                  className={noLoc ? "bg-destructive/10 hover:bg-destructive/20" : "hover:bg-muted/30"}
                  title={noLoc ? "Sem localização — clique em editar para definir no mapa" : undefined}
                >
                  <td className="px-3 py-2 font-medium">
                    {noLoc && <span className="mr-1 text-destructive">●</span>}
                    {r.name}
                  </td>
                  <td className="px-3 py-2">
                    {r.category}
                    {/* No celular os ícones ficam junto da categoria; no computador há uma coluna própria. */}
                    <div className="mt-1.5 md:hidden"><LinkBadges instagram={r.instagram} menuUrl={r.menu_url} ifoodUrl={r.ifood_url} /></div>
                  </td>
                  <td className="px-3 py-2">{r.neighborhood}</td>
                  <td className="px-3 py-2">{r.price_from != null ? priceFromLabel(Number(r.price_from))?.replace("a partir de ", "") : "—"}</td>
                  <td className="hidden px-3 py-2 md:table-cell"><LinkBadges instagram={r.instagram} menuUrl={r.menu_url} ifoodUrl={r.ifood_url} /></td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                      <a href={`/restaurante/${encodeURIComponent(r.slug)}`} target="_blank" rel="noopener noreferrer" aria-label="Ver página">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEditing(r.id)} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setArchived(r.id, !r.archived)}
                      aria-label={r.archived ? "Desarquivar" : "Arquivar"}
                      title={r.archived ? "Desarquivar (volta ao mapa)" : "Arquivar (some do mapa, fica guardado)"}
                    >
                      {r.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => remove(r.id)} aria-label="Excluir">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
