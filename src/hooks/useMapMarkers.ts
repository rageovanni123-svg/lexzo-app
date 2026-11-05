/**
 * useMapMarkers
 * Encapsulates the imperative MapLibre marker management
 * (photo pin for the selected restaurant).
 * This prevents RestaurantMap from mixing declarative React
 * state with raw DOM/GL mutations in the same effect.
 */
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { CATEGORY_EMOJI, type Restaurant } from "@/data/restaurants";

const PLATE_FILL = "#FFC629"; // gema
const PLATE_EDGE = "#2437C9"; // ultramarino
const PLATE_SHADOW = "rgba(14,19,48,0.35)";

/** Inicial da categoria exibida na plaquinha ("Italiana" -> "I"). */
export function pinLetter(category: string) {
  return category.charAt(0).toUpperCase();
}

function plate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Desenha o pin como uma plaquinha de esmalte: chapa amarela com borda azul,
 * a inicial da categoria e uma haste. Sem letra = pin de grupo (duas chapas
 * empilhadas; o número é desenhado por uma camada de texto do mapa).
 */
export function createRestaurantMarkerImage(letter: string | null) {
  const pr = 2;
  const width = 36 * pr;
  const height = 42 * pr;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.scale(pr, pr);
  ctx.clearRect(0, 0, 36, 42);
  ctx.lineJoin = "round";

  const grouped = letter === null;
  const top = grouped ? 5 : 3;

  // haste
  ctx.shadowColor = PLATE_SHADOW;
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.moveTo(14, top + 22);
  ctx.lineTo(22, top + 22);
  ctx.lineTo(18, 40);
  ctx.closePath();
  ctx.fillStyle = PLATE_EDGE;
  ctx.fill();

  // chapa de trás (só no grupo)
  if (grouped) {
    plate(ctx, 6, 1, 28, 24, 6);
    ctx.fillStyle = PLATE_FILL;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = PLATE_EDGE;
    ctx.stroke();
    ctx.shadowColor = PLATE_SHADOW;
  }

  // chapa da frente
  plate(ctx, 3, top, 28, 24, 6);
  ctx.fillStyle = PLATE_FILL;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = PLATE_EDGE;
  ctx.stroke();

  if (letter) {
    ctx.fillStyle = PLATE_EDGE;
    ctx.font = '800 16px Archivo, system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, 17, top + 12.5);
  }

  return ctx.getImageData(0, 0, width, height);
}

function createPhotoPinElement(restaurant: Restaurant, onClick: () => void): HTMLButtonElement {
  const wrap = document.createElement("button");
  wrap.type = "button";
  wrap.setAttribute("aria-label", `Ver detalhes de ${restaurant.name}`);
  wrap.style.cssText = [
    "appearance:none", "border:none", "background:transparent", "padding:0",
    "cursor:pointer", "display:flex", "flex-direction:column", "align-items:center",
    "transform-origin:center bottom", "filter:drop-shadow(0 6px 14px rgba(0,0,0,0.35))",
  ].join(";");

  const pin = document.createElement("div");
  pin.style.cssText = [
    "position:relative", "width:64px", "height:64px", "border-radius:9999px",
    "background:#2437C9", "padding:4px", "box-sizing:border-box",
  ].join(";");

  const img = document.createElement("img");
  img.src = restaurant.image;
  img.alt = restaurant.name;
  img.style.cssText = ["width:100%", "height:100%", "border-radius:9999px", "object-fit:cover", "display:block"].join(";");
  img.onerror = () => {
    pin.textContent = CATEGORY_EMOJI[restaurant.category] ?? "🍽️";
    pin.style.display = "flex";
    pin.style.alignItems = "center";
    pin.style.justifyContent = "center";
    pin.style.fontSize = "28px";
  };
  pin.appendChild(img);

  const tail = document.createElement("div");
  tail.style.cssText = [
    "width:14px", "height:14px", "background:#2437C9",
    "transform:translateY(-7px) rotate(45deg)", "border-radius:2px",
  ].join(";");

  const label = document.createElement("div");
  label.textContent = restaurant.name;
  label.style.cssText = [
    "margin-top:2px", "color:#fff", "font-weight:700", "font-size:13px",
    "text-shadow:0 1px 4px rgba(0,0,0,0.7)", "white-space:nowrap",
  ].join(";");

  wrap.appendChild(pin);
  wrap.appendChild(tail);
  wrap.appendChild(label);
  wrap.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });

  return wrap;
}

interface UsePhotoMarkerOptions {
  mapRef: React.RefObject<maplibregl.Map | null>;
  restaurant: Restaurant | null;
  onOpenDetails: () => void;
}

/** Manages the "selected restaurant" photo-pin marker imperatively. */
export function usePhotoMarker({ mapRef, restaurant, onOpenDetails }: UsePhotoMarkerOptions) {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRef.current?.remove();
    markerRef.current = null;

    if (restaurant) {
      const el = createPhotoPinElement(restaurant, onOpenDetails);
      markerRef.current = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat(restaurant.coords)
        .addTo(map);
    }

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id]);
}
