import { Globe, ShoppingBag } from "lucide-react";
import { FaInstagram } from "react-icons/fa";

const filled = (v?: string | null) => !!v && v.trim() !== "";

/** Mostra se o cadastro já tem Instagram, site (Cardápio URL) e link do iFood. */
export function LinkBadges({
  instagram,
  menuUrl,
  ifoodUrl,
}: {
  instagram?: string | null;
  menuUrl?: string | null;
  ifoodUrl?: string | null;
}) {
  const items = [
    { label: "Instagram", ok: filled(instagram), Icon: FaInstagram },
    { label: "Site / cardápio", ok: filled(menuUrl), Icon: Globe },
    { label: "iFood", ok: filled(ifoodUrl), Icon: ShoppingBag },
  ];
  return (
    <div className="flex items-center gap-1">
      {items.map(({ label, ok, Icon }) => (
        <span
          key={label}
          role="img"
          aria-label={`${label}: ${ok ? "preenchido" : "vazio"}`}
          title={`${label}: ${ok ? "preenchido" : "vazio"}`}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${
            ok ? "bg-primary text-primary-foreground" : "border border-dashed border-border text-muted-foreground/40"
          }`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      ))}
    </div>
  );
}
