import { categories, prices, type Category, type Price } from "@/data/restaurants";

interface Props {
  category: Category | null;
  price: Price | null;
  delivery: boolean;
  search: string;
  onCategory: (c: Category | null) => void;
  onPrice: (p: Price | null) => void;
  onDelivery: (d: boolean) => void;
  onSearch: (s: string) => void;
}

export function FilterPills({
  category,
  price,
  delivery,
  search,
  onCategory,
  onPrice,
  onDelivery,
  onSearch,
}: Props) {
  return (
    <div className="pointer-events-auto flex flex-col gap-1.5 px-4 pt-1 pb-2">
      {/* Filter pills */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        <Pill active={delivery} onClick={() => onDelivery(!delivery)}>
          Delivery
        </Pill>
        <div className="w-px shrink-0 self-stretch bg-border/60" />
        {categories.map((c) => (
          <Pill key={c} active={category === c} onClick={() => onCategory(category === c ? null : c)}>
            {c}
          </Pill>
        ))}
        <div className="w-px shrink-0 self-stretch bg-border/60" />
        {prices.map((p) => (
          <Pill key={p} active={price === p} onClick={() => onPrice(price === p ? null : p)}>
            {p}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${
        active
          ? "border border-primary bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(36,55,201,0.4)] transition-transform active:scale-95"
          : "glass-btn text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
