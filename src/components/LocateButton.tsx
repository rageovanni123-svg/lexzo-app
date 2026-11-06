import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Loader2, LocateFixed } from "lucide-react";

interface Props {
  mapRef: React.RefObject<maplibregl.Map | null>;
  /** Esconde o botão (ex.: card do restaurante aberto) sem apagar o pin da pessoa. */
  hidden?: boolean;
}

function createUserDot(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "user-dot";
  el.setAttribute("aria-label", "Você está aqui");
  const pulse = document.createElement("span");
  pulse.className = "user-dot-pulse";
  const core = document.createElement("span");
  core.className = "user-dot-core";
  el.append(pulse, core);
  return el;
}

/**
 * Botão "minha localização": pede a posição do aparelho, centraliza o mapa nela
 * e marca o ponto com um pin azul pulsante.
 */
export function LocateButton({ mapRef, hidden }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      markerRef.current?.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const say = (text: string) => {
    setMessage(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), 5000);
  };

  const locate = () => {
    const map = mapRef.current;
    if (!map || loading) return;
    if (!("geolocation" in navigator)) {
      say("Este aparelho não oferece localização.");
      return;
    }
    setMessage(null);
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        const lngLat: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        if (markerRef.current) {
          markerRef.current.setLngLat(lngLat);
        } else {
          markerRef.current = new maplibregl.Marker({ element: createUserDot(), anchor: "center" })
            .setLngLat(lngLat)
            .addTo(map);
        }
        map.flyTo({ center: lngLat, zoom: Math.max(map.getZoom(), 15.5), speed: 1.2 });
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          say("Localização bloqueada. Libere o acesso nas configurações do navegador e tente de novo.");
        } else if (err.code === err.TIMEOUT) {
          say("Demorou demais para achar sua posição. Tente de novo.");
        } else {
          say("Não consegui descobrir onde você está agora.");
        }
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  };

  return (
    <div
      className={`pointer-events-none absolute bottom-6 right-4 z-20 flex-col items-end gap-2 ${hidden ? "hidden" : "flex"}`}
    >
      {message && (
        <p
          role="status"
          className="glass pointer-events-auto max-w-[240px] rounded-2xl px-3 py-2 text-xs font-medium text-foreground"
        >
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={locate}
        disabled={loading}
        aria-label="Ir para minha localização"
        className="glass-btn pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full text-primary"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}
      </button>
    </div>
  );
}
