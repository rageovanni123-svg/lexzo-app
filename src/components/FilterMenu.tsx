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
              className="absolute inset-0 bg-[#0E1330]/10"
            />
            <aside
              className="absolute right-0 top-0 flex h-full w-[min(84vw,320px)] flex-col border-l border-white/70 bg-white/90 text-[#0E1330] shadow-[-12px_0_40px_rgba(14,19,48,0.18)] supports-[backdrop-filter]:bg-white/60 supports-[backdrop-filter]:backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150"
            >
              <div className="flex items-center gap-3 px-5 pb-3 pt-5">
                <Menu className="h-5 w-5 text-[#5A6182]" />
                <span className="letreiro text-2xl text-[#2437C9]">Lexzo</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-[#5A6182] hover:bg-[#0E1330]/5 hover:text-[#0E1330]"
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
                          isOpen ? "bg-white/70 ring-1 ring-[#2437C9]/15" : "hover:bg-[#2437C9]/5"
                        } ${s.active ? "text-[#0E1330]" : "text-[#0E1330]/50"}`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1 truncate">{s.label}</span>
                        {!s.active && (
                          <span className="rounded-full bg-[#FFC629] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0E1330]">
                            Em breve
                          </span>
                        )}
                        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isOpen && (
                        <div className="py-1 pl-5">
                          {!s.active && (
                            <p className="mb-1 px-3 text-xs leading-snug text-[#5A6182]">
                              Esta seção está em desenvolvimento e chega em breve.
                            </p>
                          )}

                          {s.active && (
                            <SubItem
                              label="Todos os restaurantes"
                              selected={category === null}
                              onClick={() => onCategory(null)}
                            />
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
                              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[#5A6182]">
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
                                        ? "bg-[#2437C9] text-white"
                                        : "bg-white/80 text-[#0E1330] ring-1 ring-[#0E1330]/10 hover:bg-white"
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
                <div className="border-t border-[#0E1330]/10 p-4">
                  <button
                    type="button"
                    onClick={clear}
                    className="w-full rounded-xl bg-[#2437C9] py-2.5 text-sm font-semibold text-white hover:bg-[#1c2ba8]"
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
          ? "cursor-not-allowed text-[#0E1330]/35"
          : selected
            ? "bg-[#2437C9]/10 font-semibold text-[#2437C9]"
            : "text-[#0E1330]/80 hover:bg-[#2437C9]/5"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          selected ? "bg-[#2437C9] shadow-[0_0_0_3px_rgba(36,55,201,0.2)]" : "bg-[#0E1330]/25"
        }`}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}
