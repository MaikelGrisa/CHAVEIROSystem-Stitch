import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { updateOrganization } from "@/lib/orgs.functions";
import { useBranding } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/organizacao")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: role } = await supabase
      .from("user_roles").select("role")
      .eq("user_id", userData.user.id).in("role", ["admin", "super_admin"]);
    if (!role || role.length === 0) throw redirect({ to: "/movimentacoes" });
  },
  component: OrgPage,
});

function OrgPage() {
  const nav = useNavigate();
  const { org, refresh } = useBranding();
  const update = useServerFn(updateOrganization);
  const [f, setF] = useState({
    name: "", cnpj: "", phone: "", email: "",
    street: "", neighborhood: "", city: "", state: "", zip: "",
    primary_color: "#eab308", logo_url: "", delete_pin: "",
  });

  useEffect(() => {
    if (!org) return;
    setF({
      name: org.name ?? "",
      cnpj: org.cnpj ?? "", phone: org.phone ?? "", email: org.email ?? "",
      street: org.street ?? "", neighborhood: org.neighborhood ?? "",
      city: org.city ?? "", state: org.state ?? "", zip: org.zip ?? "",
      primary_color: org.primary_color ?? "#eab308",
      logo_url: org.logo_url ?? "",
      delete_pin: "",
    });
  }, [org?.id]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function save() {
    if (!org) return;
    try {
      await update({ data: { id: org.id, patch: {
        name: f.name,
        cnpj: f.cnpj || null, phone: f.phone || null, email: f.email || null,
        street: f.street || null, neighborhood: f.neighborhood || null,
        city: f.city || null, state: f.state || null, zip: f.zip || null,
        primary_color: f.primary_color || null,
        logo_url: f.logo_url || null,
        ...(f.delete_pin.trim() ? { delete_pin: f.delete_pin.trim() } : {}),
      }}});
      toast.success("Organização atualizada");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/admin" })}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold">Dados da Empresa</h1>
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Nome da empresa" value={f.name} onChange={set("name")} />
          <Field label="CNPJ" value={f.cnpj} onChange={set("cnpj")} />
          <Field label="Telefone" value={f.phone} onChange={set("phone")} />
          <Field label="E-mail" value={f.email} onChange={set("email")} />
          <Field label="CEP" value={f.zip} onChange={set("zip")} />
          <Field label="Rua" value={f.street} onChange={set("street")} />
          <Field label="Bairro" value={f.neighborhood} onChange={set("neighborhood")} />
          <Field label="Cidade" value={f.city} onChange={set("city")} />
          <Field label="Estado" value={f.state} onChange={set("state")} />
          <Field label="Cor primária" type="color" value={f.primary_color} onChange={set("primary_color")} />
          <Field label="URL da logo (personalizada)" value={f.logo_url} onChange={set("logo_url")} placeholder="https://…" />
          <Field label="PIN de exclusão (em branco = manter)" value={f.delete_pin} onChange={set("delete_pin")} placeholder="Deixe em branco para manter" />
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={save} className="gap-2"><Save className="size-4" /> Salvar</Button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input {...props} />
    </div>
  );
}
