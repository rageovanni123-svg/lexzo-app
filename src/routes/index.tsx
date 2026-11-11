import { createFileRoute } from "@tanstack/react-router";
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

/** O mapa em si fica no layout raiz (veja __root.tsx), para não recarregar ao voltar da página de um lugar. */
function Index() {
  return null;
}
