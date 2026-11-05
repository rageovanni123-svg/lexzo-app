/**
 * mapSource.ts
 * Pure helpers for building and updating the MapLibre GeoJSON source.
 * Extracted from RestaurantMap so it can be unit-tested in isolation.
 */
import type { Restaurant } from "@/data/restaurants";

export const RESTAURANT_SOURCE_ID = "restaurants-source";
export const RESTAURANT_LAYER_ID = "restaurants-layer";
export const CLUSTER_LAYER_ID = "restaurants-clusters";
export const CLUSTER_COUNT_LAYER_ID = "restaurants-cluster-count";
export const RESTAURANT_COUNT_LAYER_ID = "restaurants-group-count";
export const CLUSTER_COLOR = "#2437C9";

export const GROUP_ICON_ID = "restaurant-pin-grupo";

/** Um ícone por categoria (plaquinha com a inicial). */
export function pinIconId(category: string) {
  return `restaurant-pin-${category}`;
}

export function buildSourceData(
  filteredRestaurants: Restaurant[],
  selectedId: string | null,
): GeoJSON.FeatureCollection {
  const groups = new Map<string, Restaurant[]>();

  for (const restaurant of filteredRestaurants) {
    if (restaurant.id === selectedId) continue;
    const key = `${restaurant.coords[0].toFixed(5)},${restaurant.coords[1].toFixed(5)}`;
    const arr = groups.get(key) ?? [];
    arr.push(restaurant);
    groups.set(key, arr);
  }

  return {
    type: "FeatureCollection",
    features: Array.from(groups.values()).map((arr) => {
      const head = arr[0];
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: head.coords },
        properties: {
          ids: arr.map((r) => r.id).join(","),
          count: arr.length,
          icon: arr.length > 1 ? GROUP_ICON_ID : pinIconId(head.category),
        },
      };
    }),
  };
}
