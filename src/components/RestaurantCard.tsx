import { memo, useEffect, useState } from "react";
import { Star, MapPin, X, Phone, Instagram, Navigation, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Restaurant } from "@/data/restaurants";
import { CATEGORY_EMOJI, priceFromLabel } from "@/data/restaurants";
import { isOpenNow } from "@/lib/hours";
import { safeHttpUrl } from "@/lib/safe-url";

interface Props {
  restaurant: Restaurant | null;
  onClose: () => void;
}

export const RestaurantCard = memo(function RestaurantCard({
  restaurant,
  onClose,
}: Props) {
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
  const ifoodUrl = safeHttpUrl(restaurant.ifoodUrl);

  // Detectors for menu_url-stored social links
  const isIfood = (u?: string) => !!u && /ifood\.com/i.test(u);
  const isFacebook = (u?: string) => !!u && /facebook\.com|fb\.com|fb\.me/i.test(u);
  const isInstagramUrl = (u?: string) => !!u && /instagram\.com/i.test(u);

  const finalIfood = ifoodUrl || (isIfood(restaurant.menuUrl) ? safeHttpUrl(restaurant.menuUrl) : undefined);
  const instagramHandle = restaurant.instagram
    ? restaurant.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[/?#].*$/, "")
    : isInstagramUrl(restaurant.menuUrl)
      ? restaurant.menuUrl!.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "")
      : undefined;
  const instagramUrl = instagramHandle ? `https://instagram.com/${instagramHandle}` : undefined;
  const facebookUrl = isFacebook(restaurant.menuUrl) ? safeHttpUrl(restaurant.menuUrl) : undefined;
  const otherMenuUrl =
    restaurant.menuUrl && !isIfood(restaurant.menuUrl) && !isFacebook(restaurant.menuUrl) && !isInstagramUrl(restaurant.menuUrl)
      ? safeHttpUrl(restaurant.menuUrl)
      : undefined;

  const mapsUrl = restaurant.address
    ? `https://maps.google.com/?q=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`
    : `https://maps.google.com/?q=${restaurant.coords[1]},${restaurant.coords[0]}`;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-xl justify-center"
      style={{
        transform: mounted ? "translateY(0)" : "translateY(120%)",
        opacity: mounted ? 1 : 0,
        transition: "transform 360ms cubic-bezier(0.22,1,0.36,1), opacity 240ms ease",
      }}
    >
      <div
        className="pointer-events-auto w-full overflow-hidden rounded-t-[22px] border-t-[6px] border-primary bg-card text-card-foreground shadow-[0_-12px_40px_-8px_rgba(14,19,48,0.35)] max-h-[85vh] overflow-y-auto"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-10 rounded-full bg-primary/25" />
        </div>

        <div className="px-4 pb-4">
          {/* Header: image + info + close */}
          <div className="flex items-start gap-3">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted ring-2 ring-primary/20">
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
              <div className="flex items-start justify-between gap-2">
                <h2 className="letreiro text-[32px]">{restaurant.name}</h2>
                <button
                  onClick={onClose}
                  className="glass-btn -mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-2 flex items-center gap-2 text-[14px]">
                <span className="rounded-sm bg-gema px-2 py-0.5 text-[13px] font-bold text-gema-foreground">
                  {restaurant.category}
                </span>
                {priceFromLabel(restaurant.priceFrom) && (
                  <span className="font-bold text-foreground">{priceFromLabel(restaurant.priceFrom)}</span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{restaurant.rating.toFixed(1).replace(".", ",")}</span>
                </span>
                {open !== null && (
                  <span className={`inline-flex items-center gap-1.5 font-semibold ${open ? "text-primary" : "text-destructive"}`}>
                    <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${open ? "bg-primary" : "bg-destructive"}`} />
                    {open ? "Aberto agora" : "Fechado"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Delivery pill */}
          {restaurant.delivery && (
            <div className="mt-3">
              <span className="inline-block rounded-sm bg-gema/25 px-2.5 py-1 text-[13px] font-semibold text-foreground">
                Delivery disponível
              </span>
            </div>
          )}

          {/* Address */}
          {restaurant.address && (
            <div className="mt-3 flex items-start gap-2 text-[14px] text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{restaurant.address}</span>
            </div>
          )}

          {/* Quick actions grid */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {restaurant.phone && (
              <QuickAction
                href={`tel:${restaurant.phone.replace(/\D/g, "")}`}
                icon={<Phone className="h-5 w-5 text-primary" />}
                label="Ligar"
              />
            )}
            {restaurant.whatsapp && (
              <QuickAction
                href={`https://wa.me/${restaurant.whatsapp.replace(/\D/g, "")}`}
                icon={<svg viewBox="0 0 24 24" className="h-5 w-5 fill-emerald-500"><path d="M20.52 3.48A11.86 11.86 0 0012.04 0C5.5 0 .2 5.3.2 11.85c0 2.09.55 4.12 1.6 5.92L0 24l6.39-1.66a11.79 11.79 0 005.65 1.44h.01c6.54 0 11.84-5.3 11.84-11.85 0-3.16-1.23-6.13-3.37-8.45zM12.05 21.8h-.01a9.86 9.86 0 01-5.03-1.38l-.36-.21-3.79.99 1.01-3.69-.23-.38a9.84 9.84 0 01-1.52-5.27c0-5.45 4.43-9.88 9.88-9.88 2.64 0 5.12 1.03 6.99 2.9a9.81 9.81 0 012.89 6.99c0 5.45-4.43 9.93-9.83 9.93z"/></svg>}
                label="WhatsApp"
              />
            )}
            {instagramUrl && (
              <QuickAction
                href={instagramUrl}
                icon={<Instagram className="h-5 w-5 text-pink-500" />}
                label="Instagram"
              />
            )}
            {facebookUrl && (
              <QuickAction
                href={facebookUrl}
                icon={<svg viewBox="0 0 24 24" className="h-5 w-5 fill-blue-600"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z"/></svg>}
                label="Facebook"
              />
            )}
            <QuickAction
              href={mapsUrl}
              icon={<Navigation className="h-5 w-5 text-primary" />}
              label="Direções"
            />
          </div>

          {/* iFood / cardápio */}
          {finalIfood && (
            <a
              href={finalIfood}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-[15px] font-semibold text-red-600 hover:bg-red-100"
            >
              <ExternalLink className="h-4 w-4" />
              Pedir no iFood
            </a>
          )}
          {!finalIfood && otherMenuUrl && (
            <a
              href={otherMenuUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-muted px-4 py-3 text-[15px] font-semibold text-foreground hover:opacity-90"
            >
              <ExternalLink className="h-4 w-4" />
              Ver cardápio
            </a>
          )}

          {/* Full page CTA */}
          <Link
            to="/restaurante/$slug"
            params={{ slug: restaurant.slug }}
            className="mt-3 flex items-center justify-center rounded-xl bg-primary px-4 py-3.5 text-[16px] font-bold text-primary-foreground shadow-[0_6px_16px_-6px_rgba(36,55,201,0.6)] transition-transform active:scale-[0.98] hover:opacity-95"
          >
            Ver página completa
          </Link>
        </div>
      </div>
    </div>
  );
});

// ─── Sub-component ─────────────────────────────────────────────────────────────

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("tel:") ? undefined : "_blank"}
      rel="noopener noreferrer"
      className="glass-btn flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 text-[12px] font-medium text-foreground"
    >
      {icon}
      {label}
    </a>
  );
}
