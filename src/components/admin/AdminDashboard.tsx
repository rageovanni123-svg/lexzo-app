import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RestaurantsTable } from "./RestaurantsTable";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";

export function AdminDashboard({ email }: { email: string }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-10 rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="flex items-center gap-2 text-base font-semibold">
              <Logo className="text-[22px]" />
              <span className="text-muted-foreground">Admin</span>
            </h1>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
          <Button variant="glass" size="sm" onClick={() => supabase.auth.signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <RestaurantsTable />
      </main>
    </div>
  );
}
