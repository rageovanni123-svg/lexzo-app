import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Menu, SlidersHorizontal, X } from "lucide-react";
import { prices, type Category, type Price } from "@/data/restaurants";
import { SECTIONS } from "@/data/sections";

interface Props {
  category: Category | null;
  price: Price | null;
  delivery: boolean;
  onCategory: (c: Category | null) => void;
  onPrice: (p: Price | null) => void;
  onDelivery: (d: boolean) => void;
}

/**
 * Botão redondo de filtros + painel lateral com seções e subseções.
 * Só "Restaurantes" está ativo; as outras seções aparecem como "Em breve".
 */
export function FilterMenu({ category, price, delivery, onCategory, onPrice, onDelivery }: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>("restaurantes");

  const activeCount = (category ? 1 : 0) + (price ? 1 : 0) + (delivery ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const clear = () => {
    onCategory(null);
    onPrice(null);
    onDelivery(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-btn pointer-events-auto relative flex h-11 w-11 items-center justify-center rounded-full text-foreground"
        aria-label="Abrir filtros"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <SlidersHorizontal className="h-5 w-5" />
        {activeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
            {activeCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Filtros">
            <button
              type="button"
              aria-label="Fechar filtros"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-[#0E1330]/40"
            />
            <aside
              className="absolute right-0 top-0 flex h-full w-[min(84vw,320px)] flex-col text-white shadow-2xl"
              style={{
                background: "linear-gradient(180deg, #0E1330 0%, #131b57 55%, #2437C9 170%)",
              }}
            >
              <div className="flex items-center gap-3 px-5 pb-3 pt-5">
                <Menu className="h-5 w-5 text-white/70" />
                <span className="letreiro text-2xl">Lexzo</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 pb-4">
                {SECTIONS.map((s) => {
                  const isOpen = expanded === s.id;
                  const Icon = s.icon;
                  return (
                    <div key={s.id} className="mb-0.5">
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : s.id)}
                        aria-expanded={isOpen}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium transition-colors ${
                          isOpen ? "bg-white/10 ring-1 ring-white/10" : "hover:bg-white/5"
                        } ${s.active ? "text-white" : "text-white/55"}`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1 truncate">{s.label}</span>
                        {!s.active && (
                          <span className="rounded-full bg-[#FFC629]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FFC629]">
                            Em breve
                          </span>
                        )}
                        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isOpen && (
                        <div className="py-1 pl-5">
                          {!s.active && (
                            <p className="mb-1 px-3 text-xs leading-snug text-white/50">
                              Esta seção está em desenvolvimento e chega em breve.
                            </p>
                          )}

                          {s.active && (
                            <SubItem
                              label="Delivery"
                              selected={delivery}
                              onClick={() => onDelivery(!delivery)}
                            />
                          )}

                          {s.items.map((it) => {
                            if (!s.active || !it.category) {
                              return <SubItem key={it.label} label={it.label} disabled />;
                            }
                            const c = it.category as Category;
                            return (
                              <SubItem
                                key={it.label}
                                label={it.label}
                                selected={category === c}
                                onClick={() => onCategory(category === c ? null : c)}
                              />
                            );
                          })}

                          {s.active && (
                            <div className="mt-2 px-3">
                              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-white/50">
                                Faixa de preço
                              </p>
                              <div className="flex gap-2">
                                {prices.map((p) => (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => onPrice(price === p ? null : p)}
                                    className={`rounded-full px-3.5 py-1 text-sm font-semibold transition-colors ${
                                      price === p
                                        ? "bg-[#FFC629] text-[#0E1330]"
                                        : "bg-white/10 text-white/80 hover:bg-white/15"
                                    }`}
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>

              {activeCount > 0 && (
                <div className="border-t border-white/10 p-4">
                  <button
                    type="button"
                    onClick={clear}
                    className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-semibold hover:bg-white/15"
                  >
                    Limpar filtros ({activeCount})
                  </button>
                </div>
              )}
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}

function SubItem({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={disabled ? undefined : !!selected}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        disabled
          ? "cursor-not-allowed text-white/35"
          : selected
            ? "bg-white/10 font-semibold text-white"
            : "text-white/80 hover:bg-white/5"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          selected ? "bg-[#FFC629] shadow-[0_0_0_3px_rgba(255,198,41,0.25)]" : "bg-white/35"
        }`}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}
