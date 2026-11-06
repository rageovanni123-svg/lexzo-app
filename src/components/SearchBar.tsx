import { useMemo, useState, useRef, useEffect } from "react";
import { Search, MapPin, Store, X } from "lucide-react";
import { NEIGHBORHOODS } from "@/data/neighborhoods";
import type { Restaurant } from "@/data/restaurants";

interface Props {
  restaurants: Restaurant[];
  value: string;
  onChange: (q: string) => void;
  onSelectNeighborhood: (coords: [number, number], name: string) => void;
  onSelectRestaurant?: (id: string) => void;
}

type Suggestion =
  | { kind: "neighborhood"; label: string; coords: [number, number] }
  | { kind: "restaurant"; label: string; id: string; sublabel: string };

export function SearchBar({ restaurants, value, onChange, onSelectNeighborhood, onSelectRestaurant }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const nq = norm(q);

    const nbs: Suggestion[] = NEIGHBORHOODS.filter((n) => norm(n.name).includes(nq))
      .slice(0, 5)
      .map((n) => ({ kind: "neighborhood", label: n.name, coords: n.coords }));

    const rs: Suggestion[] = restaurants
      .filter((r) => norm(r.name).includes(nq))
      .slice(0, 6)
      .map((r) => ({ kind: "restaurant", label: r.name, id: r.id, sublabel: `${r.category} · ${r.neighborhood}` }));

    return [...rs, ...nbs];
  }, [value, restaurants]);

  return (
    <div ref={wrapRef} className="pointer-events-auto relative mx-4 mt-3">
      <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar bairro ou lugar…"
          className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          aria-label="Buscar"
        />
        {value && (
          <button
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="rounded-full p-1 text-muted-foreground hover:text-foreground"
            aria-label="Limpar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-auto rounded-2xl bg-card shadow-[var(--shadow-card)]">
          <ul className="divide-y divide-border">
            {suggestions.map((s, i) => (
              <li key={`${s.kind}-${i}`}>
                <button
                  onClick={() => {
                    setOpen(false);
                    if (s.kind === "neighborhood") {
                      onChange(s.label);
                      onSelectNeighborhood(s.coords, s.label);
                    } else {
                      onChange("");
                      onSelectRestaurant?.(s.id);
                    }
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted"
                >
                  {s.kind === "neighborhood" && <MapPin className="h-4 w-4 text-primary" />}
                  {s.kind === "restaurant" && <Store className="h-4 w-4 text-primary" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.label}</p>
                    {s.kind === "restaurant" && (
                      <p className="truncate text-xs text-muted-foreground">{s.sublabel}</p>
                    )}
                    {s.kind === "neighborhood" && (
                      <p className="text-xs text-muted-foreground">Bairro</p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
