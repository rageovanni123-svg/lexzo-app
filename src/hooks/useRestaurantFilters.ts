/**
 * useRestaurantFilters
 * Centralises all filter state + derived filtered list.
 * Extracted from RestaurantMap to keep that component lean.
 */
import { useMemo, useState } from "react";
import type { Category, Price, Restaurant } from "@/data/restaurants";

export interface FilterState {
  category: Category | null;
  price: Price | null;
  delivery: boolean;
  search: string;
}

export function useRestaurantFilters(restaurants: Restaurant[]) {
  const [category, setCategory] = useState<Category | null>(null);
  const [price, setPrice] = useState<Price | null>(null);
  const [delivery, setDelivery] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return restaurants.filter((r) => {
      if (category && r.category !== category) return false;
      if (price && r.price !== price) return false;
      if (delivery && !r.delivery) return false;
      if (q) {
        const matches =
          r.name.toLowerCase().includes(q) ||
          r.neighborhood.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [restaurants, category, price, delivery, search]);

  return {
    category, setCategory,
    price, setPrice,
    delivery, setDelivery,
    search, setSearch,
    filtered,
  };
}
