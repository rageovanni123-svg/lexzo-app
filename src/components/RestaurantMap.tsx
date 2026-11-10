import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useNavigate } from "@tanstack/react-router";

import { categories, type Category, type Restaurant } from "@/data/restaurants";
import { FilterMenu } from "./FilterMenu";
import { SITE_NAME } from "@/lib/site";
import { LocateButton } from "./LocateButton";
import { RestaurantCard } from "./RestaurantCard";
import { LocationListSheet } from "./LocationListSheet";
import { SearchBar } from "./SearchBar";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useRestaurantFilters } from "@/hooks/useRestaurantFilters";
import { usePhotoMarker, createRestaurantMarkerImage, createClusterMarkerImage } from "@/hooks/useMapMarkers";
import {
  buildSourceData,
  RESTAURANT_SOURCE_ID,
  RESTAURANT_LAYER_ID,
  CLUSTER_LAYER_ID,
  CLUSTER_COUNT_LAYER_ID,
  RESTAURANT_COUNT_LAYER_ID,
  OPEN_STATES,
  groupIconId,
  pinIconId,
  type OpenState,
} from "@/lib/mapSource";
import { isOpenNow } from "@/lib/hours";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
/** Lado (px) do quadrado do aglomerado, por faixa de quantidade (<10, <25, <50, 50+). */
const CLUSTER_SIZES = [26, 34, 42, 52];
const DEFAULT_CENTER: [number, number] = [-48.2766, -18.9186];

export function RestaurantMap() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // ─── Data ───────────────────────────────────────────────────────────────────
  const { data: restaurants = [] } = useRestaurants();
  // Reavalia "aberto agora" a cada minuto.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const {
    category, setCategory,
    delivery, setDelivery,
    openNow, setOpenNow,
    search, setSearch,
    filtered,
  } = useRestaurantFilters(restaurants, tick);

  const openCountAll = useMemo(
    () => restaurants.filter((r) => isOpenNow(r.hours) === true).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [restaurants, tick],
  );
  const openCountShown = useMemo(
    () => filtered.filter((r) => isOpenNow(r.hours) === true).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, tick],
  );

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of restaurants) m[r.category] = (m[r.category] ?? 0) + 1;
    return m;
  }, [restaurants]);

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
        const pins: [string, Category | null, OpenState][] = [];
        for (const st of OPEN_STATES) {
          pins.push([groupIconId(st), null, st]);
          for (const c of categories) pins.push([pinIconId(c, st), c, st]);
        }
        try {
          CLUSTER_SIZES.forEach((size, i) => {
            const img = createClusterMarkerImage(size);
            if (!img) return;
            const id = `cluster-sq-${i}`;
            if (map.hasImage(id)) map.updateImage(id, img);
            else map.addImage(id, img, { pixelRatio: 2 });
          });
          for (const [id, cat, st] of pins) {
            const img = createRestaurantMarkerImage(cat, st);
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
          type: "symbol",
          source: RESTAURANT_SOURCE_ID,
          filter: ["has", "point_count"],
          layout: {
            "icon-image": ["step", ["get", "point_count"], "cluster-sq-0", 10, "cluster-sq-1", 25, "cluster-sq-2", 50, "cluster-sq-3"],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
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
            "text-color": "#0E1330",
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
  }, [filtered, selectedId, tick]);

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
        <h1 className="sr-only">{SITE_NAME}</h1>
        <div className="h-[max(0.75rem,env(safe-area-inset-top))]" />
        <SearchBar
          restaurants={restaurants}
          value={search}
          onChange={setSearch}
          onSelectNeighborhood={handleSelectNeighborhood}
          onSelectRestaurant={handleSelectRestaurant}
        />
        <div className="mt-3 flex items-center justify-between gap-3 px-4">
          <span className="glass pointer-events-auto flex h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium text-foreground">
            {filtered.length} {filtered.length === 1 ? "lugar" : "lugares"}
            {openCountShown > 0 && (
              <>
                {" · "}
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-[#1FA45B] ring-2 ring-white" />
                  {openCountShown} {openCountShown === 1 ? "aberto agora" : "abertos agora"}
                </span>
              </>
            )}
          </span>
          <FilterMenu
            category={category}
            delivery={delivery}
            onCategory={setCategory}
            onDelivery={setDelivery}
            openNow={openNow}
            onOpenNow={setOpenNow}
            openCount={openCountAll}
            counts={categoryCounts}
            total={restaurants.length}
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
            <p className="letreiro text-3xl text-primary">Nenhum lugar encontrado</p>
            <p className="mt-2 text-sm text-muted-foreground">Nada bate com esses filtros. Remova um filtro ou limpe a busca.</p>
          </div>
        </div>
      )}

      {/* ─── Minha localização (sobe quando o card do lugar está aberto) ─── */}
      <LocateButton mapRef={mapRef} raised={!!selected} />

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
