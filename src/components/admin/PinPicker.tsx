import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

/** Mini mapa com um pino que se arrasta (ou se move com um clique). */
export function PinPicker({
  lng,
  lat,
  onChange,
}: {
  lng: number;
  lat: number;
  onChange: (lng: number, lat: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({ container: box.current, style: MAP_STYLE, center: [lng, lat], zoom: 17 });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const mk = new maplibregl.Marker({ draggable: true, color: "#2437C9" }).setLngLat([lng, lat]).addTo(m);
    marker.current = mk;
    mk.on("dragend", () => {
      const p = mk.getLngLat();
      cb.current(p.lng, p.lat);
    });
    m.on("click", (e) => {
      mk.setLngLat(e.lngLat);
      cb.current(e.lngLat.lng, e.lngLat.lat);
    });
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    marker.current?.setLngLat([lng, lat]);
    map.current?.easeTo({ center: [lng, lat], duration: 300 });
  }, [lng, lat]);

  return <div ref={box} className="h-64 w-full overflow-hidden rounded-md border border-border" />;
}
