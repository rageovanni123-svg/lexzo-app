import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { RestaurantMap } from "@/components/RestaurantMap";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${SITE_NAME} — ${SITE_TAGLINE}` },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:title", content: `${SITE_NAME} — ${SITE_TAGLINE}` },
      { property: "og:description", content: SITE_DESCRIPTION },
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
