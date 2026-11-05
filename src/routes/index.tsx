import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { RestaurantMap } from "@/components/RestaurantMap";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Onde Comer — Uberlândia" },
      { name: "description", content: "Descubra os melhores restaurantes de Uberlândia em um mapa rápido e elegante." },
      { property: "og:title", content: "Onde Comer — Uberlândia" },
      { property: "og:description", content: "Mapa de restaurantes de Uberlândia. Decida em segundos." },
    ],
  }),
  component: Index,
  ssr: false,
});

function Index() {
  return (
    <Suspense fallback={null}>
      <RestaurantMap />
    </Suspense>
  );
}
