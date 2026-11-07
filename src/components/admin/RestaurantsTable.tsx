import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { RestaurantForm } from "./RestaurantForm";
import { RestaurantImport } from "./RestaurantImport";
import { priceFromLabel } from "@/data/restaurants";
import { Pencil, Trash2, Plus, ExternalLink, Upload } from "lucide-react";

interface Row {
  id: string;
  slug: string;
  name: string;
  category: string;
  neighborhood: string;
  price_from: number | string | null;
  lat: number | null;
  lng: number | null;
}

export function RestaurantsTable() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null | undefined>(undefined); // undefined=closed, null=new
  const [importing, setImporting] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, slug, name, category, neighborhood, price_from, lat, lng")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
    qc.invalidateQueries({ queryKey: ["restaurants"] });
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
    return (
      <RestaurantForm
        id={editing}
        onDone={() => {
          setEditing(undefined);
          refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {data ? `${data.length} ${data.length === 1 ? "restaurante" : "restaurantes"}` : ""}
        </p>
        <div className="flex gap-2">
          <Button variant="glass" onClick={() => setImporting(true)}>
            <Upload className="mr-2 h-4 w-4" /> Importar lista
          </Button>
          <Button onClick={() => setEditing(null)}>
            <Plus className="mr-2 h-4 w-4" /> Novo restaurante
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">Erro ao carregar: {(error as Error).message}</p>}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Bairro</th>
              <th className="px-3 py-2">A partir de</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Carregando…</td></tr>
            )}
            {data?.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Nenhum restaurante cadastrado.</td></tr>
            )}
            {data?.map((r) => {
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
                  <td className="px-3 py-2">{r.category}</td>
                  <td className="px-3 py-2">{r.neighborhood}</td>
                  <td className="px-3 py-2">{r.price_from != null ? priceFromLabel(Number(r.price_from))?.replace("a partir de ", "") : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                      <a href={`/restaurante/${encodeURIComponent(r.slug)}`} target="_blank" rel="noopener noreferrer" aria-label="Ver página">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setEditing(r.id)} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
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
