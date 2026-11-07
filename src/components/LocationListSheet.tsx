import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { Restaurant } from "@/data/restaurants";
import { CATEGORY_EMOJI, priceFromLabel } from "@/data/restaurants";

interface Props {
  restaurants: Restaurant[];
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function LocationListSheet({ restaurants, onClose, onSelect }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const sharedAddress = restaurants[0]?.address ?? restaurants[0]?.neighborhood ?? "Neste local";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: "rgba(0,0,0,0.45)",
          opacity: mounted ? 1 : 0,
          transition: "opacity 240ms ease",
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="pointer-events-auto fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[80dvh] max-w-xl flex-col overflow-hidden rounded-t-3xl"
        style={{
          background: "#0E1330",
          color: "#F3F5F7",
          transform: mounted ? "translateY(0)" : "translateY(100%)",
          transition: "transform 380ms cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: "0 -18px 48px -12px rgba(0,0,0,0.55)",
        }}
      >
        {/* Grabber */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1.5 w-10 rounded-full" style={{ background: "#3B4580" }} />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-2 pb-3">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "#262E66" }}
            aria-label="Fechar"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] uppercase tracking-wide" style={{ color: "#A9B1D6" }}>
              {restaurants.length} restaurantes neste local
            </p>
            <p className="truncate text-[15px] font-semibold">{sharedAddress}</p>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          <ul className="flex flex-col gap-2">
            {restaurants.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => onSelect(r.id)}
                    className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-transform active:scale-[0.98]"
                    style={{ background: "#171D45", border: "1px solid #262E66" }}
                  >
                    {/* Thumbnail */}
                    <div
                      className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-800"
                    >
                      <img
                        src={r.image}
                        alt={r.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const t = e.currentTarget;
                          t.style.display = "none";
                          const parent = t.parentElement;
                          if (parent) {
                            parent.textContent = CATEGORY_EMOJI[r.category] ?? "🍽️";
                            parent.style.display = "flex";
                            parent.style.alignItems = "center";
                            parent.style.justifyContent = "center";
                            parent.style.fontSize = "28px";
                          }
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold">{r.name}</p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px]" style={{ color: "#A9B1D6" }}>
                        <span>{r.category}</span>
                        {priceFromLabel(r.priceFrom) && (
                          <>
                            <span style={{ color: "#6B74A6" }}>·</span>
                            <span>{priceFromLabel(r.priceFrom)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}