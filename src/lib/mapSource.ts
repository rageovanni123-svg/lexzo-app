/**
 * mapSource.ts
 * Pure helpers for building and updating the MapLibre GeoJSON source.
 * Extracted from RestaurantMap so it can be unit-tested in isolation.
 */
import type { Restaurant } from "@/data/restaurants";
import { isOpenNow } from "@/lib/hours";

export const RESTAURANT_SOURCE_ID = "restaurants-source";
export const RESTAURANT_LAYER_ID = "restaurants-layer";
export const CLUSTER_LAYER_ID = "restaurants-clusters";
export const CLUSTER_COUNT_LAYER_ID = "restaurants-cluster-count";
export const RESTAURANT_COUNT_LAYER_ID = "restaurants-group-count";
export const CLUSTER_COLOR = "#2437C9";

/** aberto agora / fechado agora / sem horário cadastrado (não afirmamos nada). */
export type OpenState = "open" | "closed" | "unknown";
export const OPEN_STATES: OpenState[] = ["open", "closed", "unknown"];

export function openState(r: Restaurant): OpenState {
  const v = isOpenNow(r.hours);
  return v === true ? "open" : v === false ? "closed" : "unknown";
}

/** Estado de um grupo de pins no mesmo ponto: aberto se algum estiver aberto; fechado só se todos estiverem. */
export function groupState(list: Restaurant[]): OpenState {
  const states = list.map(openState);
  if (states.includes("open")) return "open";
  return states.every((s) => s === "closed") ? "closed" : "unknown";
}

export const GROUP_ICON_ID = "restaurant-pin-grupo";

/** Um ícone por categoria e por estado (plaquinha com o desenho da comida). */
export function pinIconId(category: string, state: OpenState = "unknown") {
  return `restaurant-pin-${category}${state === "unknown" ? "" : `-${state}`}`;
}

export function groupIconId(state: OpenState = "unknown") {
  return state === "unknown" ? GROUP_ICON_ID : `${GROUP_ICON_ID}-${state}`;
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
          icon: arr.length > 1 ? groupIconId(groupState(arr)) : pinIconId(head.category, openState(head)),
        },
      };
    }),
  };
}
