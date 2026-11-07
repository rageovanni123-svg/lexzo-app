import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Restaurant, Category } from "@/data/restaurants";

// ─── DB row ───────────────────────────────────────────────────────────────────

export interface DbRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  neighborhood: string;
  price_from: number | string | null;
  delivery: boolean;
  image: string | null;
  lng: number | null;
  lat: number | null;
  phone: string | null;
  whatsapp: string | null;
  ifood_url: string | null;
  menu_url: string | null;
  instagram: string | null;
  address: string | null;
  hours_weekdays: string | null;
  hours_weekends: string | null;
  gallery: string[] | null;
  description: string | null;
  updated_at: string | null;
}

export const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80";

/** Converte uma linha do banco no formato usado pelo app. */
export function rowToRestaurant(r: DbRow): Restaurant {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.category as Category,
    neighborhood: r.neighborhood,
    priceFrom: r.price_from != null && r.price_from !== "" ? Number(r.price_from) : undefined,
    delivery: r.delivery,
    image: r.image || DEFAULT_IMAGE,
    coords: [r.lng as number, r.lat as number],
    phone: r.phone ?? undefined,
    whatsapp: r.whatsapp ?? undefined,
    ifoodUrl: r.ifood_url ?? undefined,
    menuUrl: r.menu_url ?? undefined,
    instagram: r.instagram ?? undefined,
    address: r.address ?? undefined,
    hours: r.hours_weekdays
      ? { weekdays: r.hours_weekdays, weekends: r.hours_weekends ?? undefined }
      : undefined,
    gallery: Array.isArray(r.gallery) ? r.gallery.filter(Boolean) : [],
    description: r.description ?? undefined,
    updatedAt: r.updated_at ?? undefined,
  };
}

// ─── Query ────────────────────────────────────────────────────────────────────

async function fetchRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase.from("restaurants").select("*").order("name");
  if (error) throw error;
  return (data as DbRow[])
    .filter((r) => r.lat != null && r.lng != null)
    .map(rowToRestaurant);
}

export function useRestaurants() {
  return useQuery({
    queryKey: ["restaurants"],
    queryFn: fetchRestaurants,
    staleTime: 5 * 60_000, // 5 min — dados mudam pouco
    gcTime: 15 * 60_000,
    retry: 1,
  });
}
