import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { MapPin, Phone, ArrowLeft, ExternalLink } from "lucide-react";
import { FaWhatsapp, FaInstagram, FaFacebook } from "react-icons/fa";
import { InstagramPreview } from "@/components/InstagramPreview";
import { PhoneActions } from "@/components/PhoneActions";
import { rowToRestaurant, type DbRow } from "@/hooks/useRestaurants";
import { isOpenNow, getTodayHours } from "@/lib/hours";
import { supabase } from "@/integrations/supabase/client";
import {
  facebookUrl as getFacebookUrl,
  ifoodUrl as getIfoodUrl,
  instagramHandle as getInstagramHandle,
  siteUrl as getSiteUrl,
  restaurantDescription,
  restaurantJsonLd,
} from "@/lib/seo";
import { safeHttpUrl } from "@/lib/safe-url";
import { DEFAULT_CITY, SITE_NAME } from "@/lib/site";
import { priceFromLabel, slugify, type Restaurant } from "@/data/restaurants";

export const Route = createFileRoute("/restaurante/$slug")({
  loader: async ({ params }): Promise<{ restaurant: Restaurant | null }> => {
    const target = slugify(params.slug);
    if (!target) return { restaurant: null };

    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", target)
      .maybeSingle();
    if (error) throw error;
    if (!data || (data as DbRow).archived) return { restaurant: null };

    // Qualquer variação de caixa/acentos na URL redireciona para o endereço canônico.
    if (params.slug !== target) {
      throw redirect({ to: "/restaurante/$slug", params: { slug: target } });
    }
    return { restaurant: rowToRestaurant(data as DbRow) };
  },
  head: ({ loaderData }) => {
    const r = loaderData?.restaurant;
    if (!r) {
      return {
        meta: [
          { title: "Lugar não encontrado | Logoaki" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${r.name} — ${r.category} em ${r.neighborhood}, ${DEFAULT_CITY.name} | ${SITE_NAME}`;
    const description = restaurantDescription(r);
    const image = safeHttpUrl(r.image);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "restaurant.restaurant" },
        ...(image ? [{ property: "og:image", content: image }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        ...(image ? [{ name: "twitter:image", content: image }] : []),
      ],
      scripts: [{ type: "application/ld+json", children: restaurantJsonLd(r) }],
    };
  },
  component: RestaurantPage,
});

function RestaurantPage() {
  const { restaurant: r } = Route.useLoaderData();

  if (!r) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <h1 className="text-2xl font-bold">Restaurante não encontrado</h1>
        <Link to="/" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          Voltar ao mapa
        </Link>
      </div>
    );
  }

  return <RestaurantContent r={r} />;
}

function RestaurantContent({ r }: { r: Restaurant }) {
  // Todos os links vêm do admin: só http(s) passa (ver lib/seo.ts e lib/safe-url.ts).
  const ifoodUrl = getIfoodUrl(r);
  const facebookUrl = getFacebookUrl(r);
  const instagramHandle = getInstagramHandle(r);
  const facebookHandle = facebookUrl
    ? facebookUrl.replace(/^https?:\/\/(www\.)?(facebook\.com|fb\.com|fb\.me)\//i, "/").replace(/[/?#]+$/, "")
    : undefined;
  const siteUrl = getSiteUrl(r);

  const open = isOpenNow(r.hours);
  const todayHours = getTodayHours(r.hours);
  const day = new Date().getDay();
  const todayIsWeekend = day === 0 || day === 6;

  const mapsUrl = r.address
    ? `https://maps.google.com/?q=${encodeURIComponent(`${r.name} ${r.address}`)}`
    : `https://maps.google.com/?q=${r.coords[1]},${r.coords[0]}`;
  const hasInfo = Boolean(r.address || r.hours || r.phone);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      {/* Barra do topo (vidro) */}
      <div className="glass sticky top-0 z-30 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-2.5">
          <Link
            to="/"
            className="glass-btn inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground"
            aria-label="Voltar ao mapa"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="letreiro min-w-0 truncate text-[24px] text-primary">{r.name}</span>
        </div>
      </div>

      <div className="relative mx-auto max-w-2xl px-5 pb-12 pt-5">
        {/* Placa de esmalte: o elemento de destaque da página */}
        <header className="placa px-7 pb-10 pt-9">
          <div>
            <div className="min-w-0">
              <span className="inline-block rounded-sm bg-gema px-2 py-0.5 text-[13px] font-bold text-gema-foreground">
                {r.category}
              </span>
              <h1 className="letreiro mt-3 break-words text-[clamp(2.75rem,15vw,4.75rem)]">{r.name}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 pr-20 text-[14px] text-primary-foreground/90">
                <span>{r.neighborhood}</span>
                {priceFromLabel(r.priceFrom) && <span className="font-bold">{priceFromLabel(r.priceFrom)}</span>}
              </div>
            </div>
          </div>
          {/* A foto "pendurada" no canto da placa deixa o nome ocupar a largura toda */}
          <img
            src={r.image}
            alt={r.name}
            loading="lazy"
            className="absolute -bottom-7 right-6 z-10 h-[72px] w-[72px] rounded-full border-[3px] border-white bg-muted object-cover shadow-md sm:h-20 sm:w-20"
          />
        </header>

        {/* Situação */}
        <div className="mt-10 flex flex-wrap gap-2">
          {open !== null && (
            <span
              className={`inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-[13px] font-semibold ${
                open ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              }`}
            >
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${open ? "bg-primary" : "bg-destructive"}`} />
              {open ? `Aberto agora${todayHours ? `, hoje ${todayHours.split(",")[0]}` : ""}` : "Fechado agora"}
            </span>
          )}
          {r.delivery && (
            <span className="inline-flex items-center gap-2 rounded-sm bg-gema px-3 py-1.5 text-[13px] font-bold text-gema-foreground">
              Delivery {ifoodUrl ? "pelo iFood" : "disponível"}
            </span>
          )}
        </div>

        {/* Contato rápido */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {r.phone && (
            <PhoneActions name={r.name} phone={r.phone} whatsapp={r.whatsapp}>
              {(open) => (
                <button
                  type="button"
                  onClick={open}
                  aria-label="Ligar ou chamar no WhatsApp"
                  title="Ligar ou chamar no WhatsApp"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Phone className="h-5 w-5" />
                </button>
              )}
            </PhoneActions>
          )}
          {r.whatsapp && (
            <IconCircle
              href={`https://wa.me/${r.whatsapp.replace(/\D/g, "")}`}
              label="WhatsApp"
              color="bg-[#25D366] text-white hover:bg-[#1ebe5a] focus-visible:ring-[#25D366]/50"
            >
              <FaWhatsapp className="h-5 w-5" />
            </IconCircle>
          )}
          {instagramHandle && (
            <IconCircle
              href={`https://instagram.com/${instagramHandle}`}
              label="Instagram"
              color="bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white hover:opacity-90 focus-visible:ring-[#d62976]/50"
            >
              <FaInstagram className="h-5 w-5" />
            </IconCircle>
          )}
          {facebookUrl && (
            <IconCircle
              href={facebookUrl}
              label="Facebook"
              color="bg-[#1877F2] text-white hover:bg-[#1462c4] focus-visible:ring-[#1877F2]/50"
            >
              <FaFacebook className="h-5 w-5" />
            </IconCircle>
          )}
          <IconCircle href={mapsUrl} label="Como chegar" color="glass-btn text-foreground focus-visible:ring-border">
            <MapPin className="h-5 w-5" />
          </IconCircle>
        </div>

        {/* Descrição */}
        {r.description && (
          <p className="mt-5 rounded-r-lg border-l-4 border-gema bg-card p-4 text-[15px] leading-relaxed text-foreground/90 shadow-sm">
            {r.description}
          </p>
        )}

        {/* Ações principais */}
        {(ifoodUrl || siteUrl) && (
          <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {ifoodUrl && (
              <a
                href={ifoodUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA1D2C] px-5 py-3.5 text-[16px] font-bold text-white shadow-sm transition-transform hover:brightness-95 active:scale-[0.98]"
              >
                Pedir no iFood
              </a>
            )}
            {siteUrl && (
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-[16px] font-bold text-primary-foreground shadow-[0_6px_16px_-6px_rgba(36,55,201,0.6)] transition-transform hover:opacity-95 active:scale-[0.98]"
              >
                <ExternalLink className="h-4 w-4" /> Site do restaurante
              </a>
            )}
          </div>
        )}

        {/* Prévia do Instagram (só aparece quando o lugar tem Instagram) */}
        {instagramHandle && <InstagramPreview handle={instagramHandle} />}

        {/* Outras redes sociais */}
        {facebookHandle && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[14px]">
            {facebookHandle && (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-btn inline-flex items-center gap-2 rounded-full px-3 py-1.5"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1877F2] text-white">
                  <FaFacebook className="h-3.5 w-3.5" />
                </span>
                <span className="font-medium text-foreground">{facebookHandle}</span>
              </a>
            )}
          </div>
        )}

        {/* Informações em linhas de cardápio: rótulo ........ valor */}
        {hasInfo && (
          <section className="mt-6 rounded-2xl bg-card px-5 pb-2 pt-4 shadow-sm">
            <h2 className="letreiro text-[30px] text-primary">Informações</h2>
            <dl className="mt-1 divide-y divide-dashed divide-border text-[15px]">
              {r.address && (
                <MenuRow label="Endereço">
                  {r.address}{" "}
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whitespace-nowrap font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Como chegar
                  </a>
                </MenuRow>
              )}
              {r.hours && (
                <>
                  <MenuRow label={r.hours.weekends ? "Seg a sex" : "Todos os dias"} today={!todayIsWeekend || !r.hours.weekends}>
                    {r.hours.weekdays}
                  </MenuRow>
                  {r.hours.weekends && (
                    <MenuRow label="Sáb e dom" today={todayIsWeekend}>
                      {r.hours.weekends}
                    </MenuRow>
                  )}
                </>
              )}
              {r.phone && (
                <MenuRow label="Telefone">
                  <PhoneActions name={r.name} phone={r.phone} whatsapp={r.whatsapp}>
                    {(open) => (
                      <button type="button" onClick={open} className="font-semibold text-primary hover:underline">
                        {r.phone}
                      </button>
                    )}
                  </PhoneActions>
                </MenuRow>
              )}
            </dl>
          </section>
        )}

        {/* Galeria (só aparece se houver fotos) */}
        {r.gallery && r.gallery.length > 0 && (
          <section className="mt-4 rounded-2xl bg-card p-5 shadow-sm">
            <h2 className="letreiro mb-3 text-[30px] text-primary">Fotos</h2>
            <div className="grid grid-cols-3 gap-2">
              {r.gallery.map((src, i) => {
                const safe = safeHttpUrl(src);
                if (!safe) return null;
                return (
                  <a
                    key={i}
                    href={safe}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block aspect-square overflow-hidden rounded-lg bg-muted"
                  >
                    <img
                      src={safe}
                      alt={`${r.name}, foto ${i + 1}`}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function MenuRow({
  label,
  today,
  children,
}: {
  label: string;
  today?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="cardapio-row">
      <dt className="cardapio-label">
        {label}
        {today && (
          <span className="ml-2 rounded-sm bg-gema px-1.5 py-0.5 align-middle text-[11px] font-bold text-gema-foreground">
            hoje
          </span>
        )}
      </dt>
      <span aria-hidden="true" className="cardapio-leader" />
      <dd className="cardapio-value">{children}</dd>
    </div>
  );
}

function IconCircle({
  href,
  label,
  color,
  children,
}: {
  href: string;
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("tel:") ? undefined : "_blank"}
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${color}`}
    >
      {children}
    </a>
  );
}
