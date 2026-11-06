import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const AdminLogin = lazy(() =>
  import("@/components/admin/AdminLogin").then((m) => ({ default: m.AdminLogin }))
);
const AdminDashboard = lazy(() =>
  import("@/components/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard }))
);

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel Admin — Placeali" },
      { name: "description", content: "Gerencie restaurantes, veja métricas e edite o catálogo." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
  ssr: false,
});

function AdminPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          Carregando…
        </div>
      }
    >
      {userEmail ? <AdminDashboard email={userEmail} /> : <AdminLogin />}
    </Suspense>
  );
}
