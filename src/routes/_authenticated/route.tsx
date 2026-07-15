import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

async function getAuthenticatedUser() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      continue;
    }

    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return data.user;

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return null;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getAuthenticatedUser();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
