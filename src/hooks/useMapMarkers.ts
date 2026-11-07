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
    case "Pizza": {
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
    case "Lanches": {
      // cachorro-quente na diagonal: pão, salsicha (sai pelas pontas) e pão
      ctx.rotate(-0.5);
      ctx.beginPath();
      ctx.roundRect(-7.5, -6.6, 15, 4.6, [4, 4, 1.5, 1.5]);
      ctx.fill();
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.moveTo(-9.3, 0.1); ctx.lineTo(9.3, 0.1);
      ctx.stroke();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-6, 0.1); ctx.lineTo(-4.3, -1.2); ctx.lineTo(-2.6, 1.4); ctx.lineTo(-0.9, -1.2);
      ctx.lineTo(0.8, 1.4); ctx.lineTo(2.5, -1.2); ctx.lineTo(4.2, 1.4); ctx.lineTo(5.6, 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(-7.5, 2.9, 15, 4.6, [1.5, 1.5, 4, 4]);
      ctx.fill();
      break;
    }
    case "Italiana": {
      // prato de macarrão: ninho enrolado
      dot(ctx, 0, 0, 8.2, INK);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 5; a += 0.2) {
        const r = 0.8 + a * 0.43;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      break;
    }
    case "Marmita": {
      // marmitex com tampa e divisória
      ctx.beginPath();
      ctx.roundRect(-8, -5.5, 16, 13.5, 2.5);
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-8, -1.5); ctx.lineTo(8, -1.5);
      ctx.moveTo(0, -1.5); ctx.lineTo(0, 8);
      ctx.stroke();
      break;
    }
    case "Carnes": {
      // bife com osso em T
      ctx.beginPath();
      ctx.moveTo(-7, -2);
      ctx.bezierCurveTo(-8, -7.5, 2, -8.5, 6, -5);
      ctx.bezierCurveTo(10, -1.5, 8.5, 5, 3, 7);
      ctx.bezierCurveTo(-3, 9, -8, 4.5, -7, -2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(-3.2, -2.2); ctx.lineTo(4.6, -2.2);
      ctx.moveTo(0.6, -2.2); ctx.lineTo(0.6, 4.4);
      ctx.stroke();
      break;
    }
    case "Saudável": {
      // maçã com folha
      dot(ctx, 0, 2.2, 6.3, INK);
      dot(ctx, -2.6, 0.6, 1.1, GOLD);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -3.2); ctx.lineTo(0.8, -7.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(3.6, -6.6, 3.2, 1.6, -0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "Árabe": {
      // espetinho na diagonal
      ctx.rotate(-0.75);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-9, 0); ctx.lineTo(9, 0);
      ctx.stroke();
      for (const x of [-5.6, -1.6, 2.4]) {
        ctx.beginPath();
        ctx.roundRect(x - 0.2, -3.6, 3.6, 7.2, 1.5);
        ctx.fill();
      }
      break;
    }
    case "Chinesa": {
      // caixinha de yakissoba com alça
      ctx.beginPath();
      ctx.moveTo(-7, -2.5); ctx.lineTo(7, -2.5); ctx.lineTo(5, 8); ctx.lineTo(-5, 8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(-7.8, -4.8, 15.6, 2.6, 1.2);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -4.6, 4.2, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-5.4, 2.2); ctx.lineTo(5.4, 2.2);
      ctx.stroke();
      break;
    }
    case "Mexicana": {
      // taco
      ctx.beginPath();
      ctx.moveTo(-8, 5.5);
      ctx.arc(0, 5.5, 8, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 5.5, 4.8, Math.PI, 0);
      ctx.stroke();
      dot(ctx, -3.2, -3.6, 1.8, INK);
      dot(ctx, 0, -4.4, 1.8, INK);
      dot(ctx, 3.2, -3.6, 1.8, INK);
      break;
    }
    case "Pastel": {
      // pastel com borda frisada
      ctx.beginPath();
      ctx.roundRect(-8, -4.5, 16, 11, 2.5);
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([1.4, 1.6]);
      ctx.beginPath();
      ctx.roundRect(-5.9, -2.4, 11.8, 6.8, 1);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case "Doces e Bolos": {
      // cupcake com cereja
      ctx.beginPath();
      ctx.moveTo(-5.2, 1.8); ctx.lineTo(5.2, 1.8); ctx.lineTo(3.8, 8.5); ctx.lineTo(-3.8, 8.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-1.8, 3.4); ctx.lineTo(-1.4, 7.2);
      ctx.moveTo(1.8, 3.4); ctx.lineTo(1.4, 7.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-7, 0.2);
      ctx.arc(0, 0.2, 7, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      dot(ctx, 0, -7.4, 1.7, INK);
      break;
    }
    case "Sorvetes": {
      // casquinha com bola
      dot(ctx, 0, -2.6, 5.4, INK);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-6, 2.6); ctx.lineTo(6, 2.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4.6, 3.4); ctx.lineTo(4.6, 3.4); ctx.lineTo(0, 9.6);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "Padaria": {
      // pão italiano com cortes
      ctx.rotate(-0.6);
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 4.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (const x of [-4.2, 0, 4.2]) {
        ctx.moveTo(x - 0.8, -2.4);
        ctx.lineTo(x + 0.8, 2.4);
      }
      ctx.stroke();
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
