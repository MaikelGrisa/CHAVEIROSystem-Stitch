import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/usuario")({
  component: UsuarioPage,
});

function UsuarioPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", u.user.id)
        .maybeSingle();
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      return { user: u.user, profile: prof, roles: (roles || []).map(r => r.role) };
    },
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="card-surface relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-primary/10 to-transparent p-5">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-primary to-primary/40" />
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/15"><User className="size-5 text-primary" /></div>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold whitespace-nowrap truncate">Usuário</h1>
            <p className="text-sm text-muted-foreground">Seus dados cadastrais (somente leitura)</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados da conta</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Carregando...</p>}
          {!isLoading && data && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Nome</dt>
                <dd className="font-medium">{data.profile?.display_name || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{data.profile?.email || data.user.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Login via</dt>
                <dd><Badge variant="outline" className="capitalize">{data.profile?.provider || "email"}</Badge></dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Papel</dt>
                <dd><Badge variant="secondary">{data.roles.includes("admin") ? "admin" : (data.roles[0] || "user")}</Badge></dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Acesso</dt>
                <dd>
                  {data.profile?.approved
                    ? <Badge className="bg-green-600 hover:bg-green-600">Aprovado</Badge>
                    : <Badge variant="destructive">Pendente</Badge>}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Cadastrado em</dt>
                <dd className="font-medium">{data.profile?.created_at ? new Date(data.profile.created_at).toLocaleString("pt-BR") : "—"}</dd>
              </div>
            </dl>
          )}
          <p className="text-xs text-muted-foreground mt-6">
            Para alterar seus dados, solicite ao administrador.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
