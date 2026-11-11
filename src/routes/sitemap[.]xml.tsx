import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const today = new Date().toISOString().slice(0, 10);

        // Slugs reais, direto do banco (a policy de leitura é pública).
        const { data, error } = await supabase
          .from("restaurants")
          .select("*")
          .order("slug");
        if (error) {
          return new Response("Sitemap indisponível", { status: 503 });
        }

        const entry = (path: string, lastmod: string, changefreq: string, priority: string) =>
          `  <url>\n    <loc>${escapeXml(origin + path)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

        const urls = [
          entry("/", today, "daily", "1.0"),
          ...(data ?? []).filter((r) => !r.archived).map((r) =>
            entry(
              `/restaurante/${encodeURIComponent(r.slug)}`,
              (r.updated_at ?? today).slice(0, 10),
              "weekly",
              "0.8",
            ),
          ),
        ].join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
