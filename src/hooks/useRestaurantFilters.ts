/**
 * useRestaurantFilters
 * Centralises all filter state + derived filtered list.
 * Extracted from RestaurantMap to keep that component lean.
 */
import { useMemo, useState } from "react";
import type { Category, Restaurant } from "@/data/restaurants";
import { isOpenNow } from "@/lib/hours";

export interface FilterState {
  category: Category | null;
  delivery: boolean;
  openNow: boolean;
  search: string;
}

/** `tick` muda a cada minuto para reavaliar quem está aberto. */
export function useRestaurantFilters(restaurants: Restaurant[], tick = 0) {
  const [category, setCategory] = useState<Category | null>(null);
  const [delivery, setDelivery] = useState(false);
  const [openNow, setOpenNow] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return restaurants.filter((r) => {
      if (category && r.category !== category) return false;
      if (delivery && !r.delivery) return false;
      if (openNow && isOpenNow(r.hours) !== true) return false;
      if (q) {
        const matches =
          r.name.toLowerCase().includes(q) ||
          r.neighborhood.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurants, category, delivery, openNow, search, tick]);

  return {
    category, setCategory,
    delivery, setDelivery,
    openNow, setOpenNow,
    search, setSearch,
    filtered,
  };
}
