import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useNavigate } from "@tanstack/react-router";

import { categories, type Category, type Restaurant } from "@/data/restaurants";
import { FilterMenu } from "./FilterMenu";
import { LocateButton } from "./LocateButton";
import { RestaurantCard } from "./RestaurantCard";
import { LocationListSheet } from "./LocationListSheet";
import { SearchBar } from "./SearchBar";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useRestaurantFilters } from "@/hooks/useRestaurantFilters";
import { usePhotoMarker, createRestaurantMarkerImage } from "@/hooks/useMapMarkers";
import {
  buildSourceData,
  RESTAURANT_SOURCE_ID,
  RESTAURANT_LAYER_ID,
  CLUSTER_LAYER_ID,
  CLUSTER_COUNT_LAYER_ID,
  RESTAURANT_COUNT_LAYER_ID,
  CLUSTER_COLOR,
  GROUP_ICON_ID,
  pinIconId,
} from "@/lib/mapSource";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const DEFAULT_CENTER: [number, number] = [-48.2766, -18.9186];

export function RestaurantMap() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // ─── Data ───────────────────────────────────────────────────────────────────
  const { data: restaurants = [] } = useRestaurants();
  const {
    category, setCategory,
    price, setPrice,
    delivery, setDelivery,
    search, setSearch,
    filtered,
  } = useRestaurantFilters(restaurants);

  // ─── UI State ───────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [groupRestaurants, setGroupRestaurants] = useState<Restaurant[] | null>(null);

  // Keep stable refs so MapLibre event callbacks always see the latest values
  // without stale closure issues.
  const filteredRef = useRef(filtered);
  const selectedIdRef = useRef(selectedId);
  useEffect(() => { filteredRef.current = filtered; }, [filtered]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  // ─── Init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: 12.5,
      attributionControl: false,
    });
    mapRef.current = map;

    const initLayers = () => {
      // Register pin images
      const registerPins = () => {
        const pins: [string, Category | null][] = [
          [GROUP_ICON_ID, null],
          ...categories.map((c): [string, Category | null] => [pinIconId(c), c]),
        ];
        try {
          for (const [id, cat] of pins) {
            const img = createRestaurantMarkerImage(cat);
            if (!img) continue;
            if (map.hasImage(id)) map.updateImage(id, img);
            else map.addImage(id, img, { pixelRatio: 2 });
          }
        } catch {
          /* mapa já foi removido */
        }
      };
      registerPins();

      // Source
      if (!map.getSource(RESTAURANT_SOURCE_ID)) {
        map.addSource(RESTAURANT_SOURCE_ID, {
          type: "geojson",
          data: buildSourceData(filteredRef.current, selectedIdRef.current),
          cluster: true,
          clusterRadius: 35,
          clusterMaxZoom: 15,
        });
      }

      // Cluster circles
      if (!map.getLayer(CLUSTER_LAYER_ID)) {
        map.addLayer({
          id: CLUSTER_LAYER_ID,
          type: "circle",
          source: RESTAURANT_SOURCE_ID,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": CLUSTER_COLOR,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 3,
            "circle-opacity": 0.95,
            "circle-radius": ["step", ["get", "point_count"], 13, 10, 17, 25, 21, 50, 26],
          },
        });

        map.addLayer({
          id: CLUSTER_COUNT_LAYER_ID,
          type: "symbol",
          source: RESTAURANT_SOURCE_ID,
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["Noto Sans Bold"],
            "text-size": 13,
            "text-allow-overlap": true,
          },
          paint: { "text-color": "#ffffff" },
        });

        map.on("click", CLUSTER_LAYER_ID, async (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER_ID] });
          const clusterId = features[0]?.properties?.cluster_id;
          const src = map.getSource(RESTAURANT_SOURCE_ID) as maplibregl.GeoJSONSource;
          if (clusterId == null || !src) return;
          try {
            const zoom = await src.getClusterExpansionZoom(clusterId);
            const geom = features[0].geometry as GeoJSON.Point;
            map.easeTo({ center: geom.coordinates as [number, number], zoom });
          } catch { /* noop */ }
        });

        map.on("mouseenter", CLUSTER_LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", CLUSTER_LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
      }

      // Individual restaurant pins
      if (!map.getLayer(RESTAURANT_LAYER_ID)) {
        map.addLayer({
          id: RESTAURANT_LAYER_ID,
          type: "symbol",
          source: RESTAURANT_SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          layout: {
            "icon-image": ["get", "icon"],
            "icon-anchor": "bottom",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });

        map.addLayer({
          id: RESTAURANT_COUNT_LAYER_ID,
          type: "symbol",
          source: RESTAURANT_SOURCE_ID,
          filter: ["all", ["!", ["has", "point_count"]], [">", ["get", "count"], 1]],
          layout: {
            "text-field": ["to-string", ["get", "count"]],
            "text-font": ["Noto Sans Bold"],
            "text-size": 13,
            "text-offset": [0, -2.45],
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          },
          paint: {
            "text-color": "#2437C9",
            "text-halo-color": "#FFC629",
            "text-halo-width": 0,
          },
        });

        map.on("click", RESTAURANT_LAYER_ID, (event) => {
          const feature = event.features?.[0];
          const idsRaw = typeof feature?.properties?.ids === "string" ? feature.properties.ids : "";
          const ids = idsRaw.split(",").filter(Boolean);
          const items = ids
            .map((id) => filteredRef.current.find((item) => item.id === id))
            .filter((x): x is Restaurant => Boolean(x));
          if (!items.length) return;

          if (items.length > 1) {
            setGroupRestaurants(items);
            setSelectedId(null);
            const geom = feature!.geometry as GeoJSON.Point;
            map.flyTo({
              center: geom.coordinates as [number, number],
              zoom: Math.max(map.getZoom(), 16),
              speed: 0.9,
              essential: true,
            });
            return;
          }

          const restaurant = items[0];
          setSelectedId(restaurant.id);
          setGroupRestaurants(null);
          map.flyTo({
            center: restaurant.coords,
            zoom: Math.max(map.getZoom(), 15),
            offset: [0, -100],
            speed: 0.9,
            curve: 1.4,
            essential: true,
          });
        });

        map.on("click", (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: [RESTAURANT_LAYER_ID] });
          if (!features.length) {
            setSelectedId(null);
          }
        });

        map.on("mouseenter", RESTAURANT_LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", RESTAURANT_LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
      }
    };

    map.on("load", () => { initLayers(); map.resize(); });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current!);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []); // intentionally empty — map initialised once

  // ─── Keep source in sync with filter/selection changes ─────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(RESTAURANT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(buildSourceData(filtered, selectedId));
  }, [filtered, selectedId]);

  // ─── Deselect when selected restaurant is filtered out ─────────────────────
  useEffect(() => {
    if (selectedId && !filtered.some((r) => r.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filtered, selectedId]);

  // ─── Imperative markers (extracted to hooks) ────────────────────────────────
  const selected = selectedId ? restaurants.find((r) => r.id === selectedId) ?? null : null;

  usePhotoMarker({
    mapRef,
    restaurant: selected,
    onOpenDetails: () => {
      if (selected) navigate({ to: "/restaurante/$slug", params: { slug: selected.slug } });
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleSelectRestaurant = useCallback((id: string) => {
    const r = restaurants.find((x) => x.id === id);
    if (!r) return;
    setSelectedId(id);
    mapRef.current?.flyTo({ center: r.coords, zoom: 15.5, speed: 0.9, offset: [0, -100] });
  }, [restaurants]);

  const handleSelectNeighborhood = useCallback((coords: [number, number]) => {
    mapRef.current?.flyTo({ center: coords, zoom: 15, speed: 0.9 });
  }, []);

  const handleGroupSelect = useCallback((id: string) => {
    const r = restaurants.find((x) => x.id === id);
    if (!r) return;
    setGroupRestaurants(null);
    setSelectedId(id);
    mapRef.current?.flyTo({
      center: r.coords,
      zoom: Math.max(mapRef.current.getZoom(), 16),
      offset: [0, -100],
      speed: 0.9,
    });
  }, [restaurants]);

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-background">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {/* ─── Top overlay: search + filters ─── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 mx-auto max-w-xl">
        <div className="pointer-events-auto px-4 pt-3">
          <h1 className="letreiro text-[34px] text-primary drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]">
            Lexzo
          </h1>
        </div>
        <SearchBar
          restaurants={restaurants}
          value={search}
          onChange={setSearch}
          onSelectNeighborhood={handleSelectNeighborhood}
          onSelectRestaurant={handleSelectRestaurant}
        />
        <div className="mt-2 flex items-center justify-between px-4">
          <span className="pointer-events-auto text-xs font-medium text-foreground/70">
            Uberlândia · {filtered.length} {filtered.length === 1 ? "lugar" : "lugares"}
          </span>
          <FilterMenu
            category={category}
            price={price}
            delivery={delivery}
            onCategory={setCategory}
            onPrice={setPrice}
            onDelivery={setDelivery}
          />
        </div>
      </div>

      {/* ─── Empty state ─── */}
      {filtered.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="mx-6 rounded-2xl p-6 text-center shadow-lg"
            style={{ background: "rgba(255,255,255,0.96)" }}
          >
            <p className="letreiro text-3xl text-primary">Nenhum restaurante</p>
            <p className="mt-2 text-sm text-muted-foreground">Nenhum lugar bate com esses filtros. Remova um filtro ou limpe a busca.</p>
          </div>
        </div>
      )}

      {/* ─── Minha localização (some enquanto o card do restaurante está aberto) ─── */}
      <LocateButton mapRef={mapRef} hidden={!!selected} />

      {/* ─── Version badge ─── */}
      <div className="pointer-events-none absolute bottom-2 left-2 z-20 rounded-md bg-card/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur">
        V 0.01
      </div>

      {/* ─── Mini card ─── */}
      <RestaurantCard
        restaurant={selected}
        onClose={() => setSelectedId(null)}
      />

      {/* ─── Group list sheet ─── */}
      {groupRestaurants && (
        <LocationListSheet
          restaurants={groupRestaurants}
          onClose={() => setGroupRestaurants(null)}
          onSelect={handleGroupSelect}
        />
      )}
    </div>
  );
}
