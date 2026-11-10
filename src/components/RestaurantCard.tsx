import { memo, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Restaurant } from "@/data/restaurants";
import { CATEGORY_EMOJI, priceFromLabel } from "@/data/restaurants";
import { getTodayHours, isOpenNow } from "@/lib/hours";

interface Props {
  restaurant: Restaurant | null;
  onClose: () => void;
}

/** Horário em que fecha hoje ("18:00–23:00" -> "23:00"), ou null se não der para ler. */
function closingTime(restaurant: Restaurant): string | null {
  const today = getTodayHours(restaurant.hours);
  const end = today?.split("–")[1]?.trim();
  return end && /^\d{1,2}:\d{2}$/.test(end) ? end : null;
}

/** Card compacto do lugar selecionado: foto, nome, status e acesso à página completa. */
export const RestaurantCard = memo(function RestaurantCard({ restaurant, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
    if (restaurant) {
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    }
    setMounted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id]);

  if (!restaurant) return null;

  const open = isOpenNow(restaurant.hours);
  const closes = open ? closingTime(restaurant) : null;
  const price = priceFromLabel(restaurant.priceFrom);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-xl px-4 pb-[max(1.75rem,env(safe-area-inset-bottom))]"
      style={{
        transform: mounted ? "translateY(0)" : "translateY(120%)",
        opacity: mounted ? 1 : 0,
        transition: "transform 360ms cubic-bezier(0.22,1,0.36,1), opacity 240ms ease",
      }}
    >
      <div className="pointer-events-auto flex flex-col gap-3 rounded-[22px] border border-white/95 bg-white/90 p-3.5 text-card-foreground shadow-[0_14px_40px_rgba(14,19,48,0.2)] supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[14px] bg-muted">
            {!imgError ? (
              <img
                src={restaurant.image}
                alt={restaurant.name}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl">
                {CATEGORY_EMOJI[restaurant.category] ?? "🍽️"}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="letreiro truncate text-[26px] leading-tight">{restaurant.name}</h2>
            <p className="truncate text-[13px] text-muted-foreground">
              {restaurant.category} · {restaurant.neighborhood}
            </p>
            {open !== null && (
              <p
                className={`mt-1 flex items-center gap-1.5 text-[12px] font-semibold ${open ? "text-[#167A44]" : "text-destructive"}`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${open ? "bg-[#1FA45B]" : "bg-destructive"}`}
                />
                {open ? `Aberto agora${closes ? ` · fecha às ${closes}` : ""}` : "Fechado"}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 self-start items-center justify-center rounded-full text-muted-foreground"
            aria-label="Fechar"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/restaurante/$slug"
            params={{ slug: restaurant.slug }}
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-primary text-[15px] font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            Ver detalhes
          </Link>
          {price && <span className="px-1.5 text-[13px] font-semibold text-primary">{price}</span>}
        </div>
      </div>
    </div>
  );
});
