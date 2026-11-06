/**
 * useMapMarkers
 * Encapsulates the imperative MapLibre marker management
 * (photo pin for the selected restaurant).
 * This prevents RestaurantMap from mixing declarative React
 * state with raw DOM/GL mutations in the same effect.
 */
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { CATEGORY_EMOJI, type Category, type Restaurant } from "@/data/restaurants";

const PLATE_FILL = "#FFC629"; // gema
const PLATE_EDGE = "#2437C9"; // ultramarino
const PLATE_SHADOW = "rgba(14,19,48,0.35)";

function plate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const INK = PLATE_EDGE;
const GOLD = PLATE_FILL;

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** Desenha o ícone da comida da categoria, centrado em (cx, cy), cabendo em ~18x18. */
function drawGlyph(ctx: CanvasRenderingContext2D, category: Category, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;

  switch (category) {
    case "Italiana": {
      // fatia de pizza com borda e pepperoni
      ctx.beginPath();
      ctx.moveTo(-7.5, -5);
      ctx.lineTo(7.5, -5);
      ctx.lineTo(0, 8.5);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-7.5, -6);
      ctx.lineTo(7.5, -6);
      ctx.stroke();
      dot(ctx, -2.5, -1.5, 1.5, GOLD);
      dot(ctx, 2.5, -0.5, 1.3, GOLD);
      dot(ctx, 0, 3.5, 1.2, GOLD);
      break;
    }
    case "Japonesa": {
      // sushi roll (maki)
      dot(ctx, 0, 0, 8, INK);
      dot(ctx, 0, 0, 5.2, GOLD);
      dot(ctx, 0, 0, 3, INK);
      dot(ctx, 0, 0, 1.2, GOLD);
      break;
    }
    case "Brasileira": {
      // panela de feijoada com vapor
      ctx.beginPath();
      ctx.moveTo(-6.5, -1);
      ctx.lineTo(6.5, -1);
      ctx.lineTo(6.5, 3);
      ctx.quadraticCurveTo(6.5, 8, 2, 8);
      ctx.lineTo(-2, 8);
      ctx.quadraticCurveTo(-6.5, 8, -6.5, 3);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.beginPath(); // alças
      ctx.moveTo(-6.5, 1); ctx.lineTo(-9, 1);
      ctx.moveTo(6.5, 1); ctx.lineTo(9, 1);
      ctx.stroke();
      ctx.lineWidth = 1.6;
      ctx.beginPath(); // vapor
      ctx.moveTo(-2.5, -3); ctx.quadraticCurveTo(-4, -5, -2.5, -7);
      ctx.moveTo(2.5, -3); ctx.quadraticCurveTo(1, -5, 2.5, -7);
      ctx.stroke();
      dot(ctx, -2, 3, 1.1, GOLD);
      dot(ctx, 2, 4.5, 1.1, GOLD);
      break;
    }
    case "Hambúrguer": {
      // pão de cima com gergelim, carne e pão de baixo
      ctx.beginPath();
      ctx.moveTo(-8, -1.5);
      ctx.arc(0, -1.5, 8, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      dot(ctx, -3, -5, 0.9, GOLD);
      dot(ctx, 1, -6, 0.9, GOLD);
      dot(ctx, 4, -4, 0.9, GOLD);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-7.5, 2); ctx.lineTo(7.5, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-8, 5);
      ctx.lineTo(8, 5);
      ctx.lineTo(7, 7);
      ctx.quadraticCurveTo(0, 9.5, -7, 7);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "Café": {
      // xícara com vapor
      ctx.beginPath();
      ctx.moveTo(-6.5, -1);
      ctx.lineTo(5.5, -1);
      ctx.lineTo(4.5, 5);
      ctx.quadraticCurveTo(4, 8, 0, 8);
      ctx.lineTo(-1.5, 8);
      ctx.quadraticCurveTo(-5.5, 8, -6, 5);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(6, 2.5, 2.8, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-3, -3); ctx.quadraticCurveTo(-4.5, -5, -3, -7);
      ctx.moveTo(1, -3); ctx.quadraticCurveTo(-0.5, -5, 1, -7);
      ctx.stroke();
      break;
    }
    case "Vegetariana": {
      // folha com nervura
      ctx.beginPath();
      ctx.moveTo(-7.5, 7.5);
      ctx.quadraticCurveTo(-9, -5, 7.5, -7.5);
      ctx.quadraticCurveTo(9, 5, -7.5, 7.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-8, 8);
      ctx.quadraticCurveTo(-1, 1, 5, -5);
      ctx.stroke();
      break;
    }
    case "Açaí": {
      // tigela com montinho e fatia de banana
      ctx.beginPath();
      ctx.moveTo(-8, 1);
      ctx.lineTo(8, 1);
      ctx.arc(0, 1, 8, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -0.5, 6, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-8.5, 0.3); ctx.lineTo(8.5, 0.3);
      ctx.stroke();
      dot(ctx, -2, -3.5, 1.4, GOLD);
      dot(ctx, 2.5, -2.5, 1.2, GOLD);
      break;
    }
  }
  ctx.restore();
}

/**
 * Desenha o pin como uma plaquinha de esmalte: chapa amarela com borda azul,
 * o desenho da comida da categoria e uma haste. Sem categoria = pin de grupo (duas chapas
 * empilhadas; o número é desenhado por uma camada de texto do mapa).
 */
export function createRestaurantMarkerImage(category: Category | null) {
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

  const grouped = category === null;
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

  if (category) drawGlyph(ctx, category, 17, top + 12);

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
