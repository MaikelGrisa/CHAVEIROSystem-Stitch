import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

async function hasRestoredSession() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Chaveiro System — Gestão para Chaveiros" },
      { name: "description", content: "Controle de estoque, movimentações mensais e relatórios em PDF para chaveiros." },
    ],
  }),
  beforeLoad: async () => {
    throw redirect({ to: (await hasRestoredSession()) ? "/movimentacoes" : "/auth" });
  },
});
