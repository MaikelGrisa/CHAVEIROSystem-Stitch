import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { LogOut, Plus, Trash2, Pencil, Building2, CreditCard, Sparkles, Rocket } from "lucide-react";
import {
  createOrganizationWithAdmin,
  updateOrganization,
  deleteOrganization,
  getOrgAdmin,
  resetOrgAdminPassword,
  updateOrganizationSubscription,
} from "@/lib/orgs.functions";
import logoUrl from "@/assets/super-admin-logo.png";
import { BrandLogoImg } from "@/components/BrandLogoImg";

export const Route = createFileRoute("/super-admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!role) throw redirect({ to: "/movimentacoes" });
  },
  component: SuperAdminPage,
});

type Org = {
  id: string; name: string; slug: string;
  cnpj: string | null; phone: string | null; email: string | null;
 street: string | null; neighborhood: string | null; city: string | null;
 state: string | null; zip: string | null;
 logo_url: string | null; primary_color: string | null; website: string | null;
  is_active: boolean;
  subscription_plan: "trial" | "monthly" | "semiannual" | "annual" | "free_lifetime";
  subscription_status: "trial" | "active" | "expired" | "blocked";
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  blocked_reason: string | null;
  blocked_at: string | null;
};

type SignupRequest = {
  id: string;
  nome_cliente: string;
  nome_fantasia: string;
  cnpj: string | null;
  whatsapp: string | null;
  rua: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  status: string;
  created_at: string;
};


function SuperAdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createOrganizationWithAdmin);
  const update = useServerFn(updateOrganization);
  const remove = useServerFn(deleteOrganization);
  const resetPass = useServerFn(resetOrgAdminPassword);
  const updateSub = useServerFn(updateOrganizationSubscription);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["all-orgs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Org[];
    },
  });

  const [editing, setEditing] = useState<Org | null>(null);
  const [subscribing, setSubscribing] = useState<Org | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [activating, setActivating] = useState<SignupRequest | null>(null);

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["signup-requests", "pending"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("signup_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SignupRequest[];
    },
  });


  // Force GO green as the primary color in the Super Admin panel
  useEffect(() => {
    const root = document.documentElement;
    const GREEN = "#16a34a";
    const keys = ["--primary", "--ring", "--accent", "--sidebar-primary", "--sidebar-ring"];
    const prev: Record<string, string> = {};
    keys.forEach((k) => { prev[k] = root.style.getPropertyValue(k); root.style.setProperty(k, GREEN); });
    const prevFg = root.style.getPropertyValue("--primary-foreground");
    root.style.setProperty("--primary-foreground", "#ffffff");
    return () => {
      keys.forEach((k) => { if (prev[k]) root.style.setProperty(k, prev[k]); else root.style.removeProperty(k); });
      if (prevFg) root.style.setProperty("--primary-foreground", prevFg); else root.style.removeProperty("--primary-foreground");
    };
  }, []);


  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Super Admin" className="h-10 w-auto object-contain" />
            <div>
              <h1 className="font-bold text-lg leading-tight">Painel Super Admin</h1>
              <p className="text-xs text-muted-foreground">Gestão de organizações (tenants)</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut} size="sm" className="gap-2">
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="size-5" /> Organizações
          </h2>
          <Button onClick={() => setShowNew(true)} className="gap-2">
            <Plus className="size-4" /> Nova organização
          </Button>
        </div>

        {isLoading && <p className="text-muted-foreground">Carregando…</p>}

        {pendingRequests.length > 0 && (
          <Card className="p-4 space-y-3 border-green-500/40 bg-green-50/50 dark:bg-green-950/20">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-green-600" />
              <h3 className="font-semibold">
                Cadastros pendentes — Teste 7 DIAS ({pendingRequests.length})
              </h3>
            </div>
            <div className="space-y-2">
              {pendingRequests.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-md bg-card border"
                >
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="font-medium truncate">
                      {r.nome_fantasia}{" "}
                      <span className="text-muted-foreground font-normal">
                        · {r.nome_cliente}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[r.cnpj && `CNPJ ${r.cnpj}`, r.whatsapp && `WhatsApp ${r.whatsapp}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[r.rua, r.bairro, r.cidade, r.uf, r.cep]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Recebido em {new Date(r.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        setActivating(r);
                        setShowNew(true);
                      }}
                    >
                      <Rocket className="size-3" /> Ativar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!confirm("Descartar este cadastro?")) return;
                        const { error } = await (supabase as any)
                          .from("signup_requests")
                          .delete()
                          .eq("id", r.id);
                        if (error) toast.error(error.message);
                        else {
                          toast.success("Cadastro descartado");
                          qc.invalidateQueries({ queryKey: ["signup-requests", "pending"] });
                        }
                      }}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}


        <div className="-mx-4 sm:mx-0 overflow-x-auto sm:overflow-visible">
          <div className="grid gap-3 px-4 sm:px-0 min-w-[720px] sm:min-w-0">
            {orgs.map((o) => (
              <Card key={o.id} className="p-4 flex items-start justify-between gap-4 flex-nowrap">
                <div className="flex items-start gap-3 flex-1 min-w-0 flex-nowrap">
                  {o.logo_url ? (
                    <BrandLogoImg
                      src={o.logo_url}
                      alt={o.name}
                      className="w-12 h-12 rounded-md shrink-0 object-contain bg-white"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-md shrink-0 flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: o.primary_color || "#eab308" }}
                    >
                      {o.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold flex items-center gap-2 flex-wrap">
                      {o.name}
                      <SubBadge org={o} />
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                      slug: {o.slug}{o.cnpj ? ` · CNPJ ${o.cnpj}` : ""}
                    </div>
                    {(o.city || o.state) && (
                      <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                        {[o.street, o.neighborhood, o.city, o.state, o.zip].filter(Boolean).join(", ")}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                      Plano: <strong>{planLabel(o.subscription_plan)}</strong>
                      {o.subscription_expires_at && o.subscription_plan !== "free_lifetime" && (
                        <> · vence em {new Date(o.subscription_expires_at).toLocaleDateString("pt-BR")}</>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 flex-nowrap justify-end">
                  <Button size="sm" variant="outline" onClick={() => setSubscribing(o)} className="gap-1">
                    <CreditCard className="size-3" /> Assinatura
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(o)} className="gap-1">
                    <Pencil className="size-3" /> Editar
                  </Button>
                  {o.id !== "00000000-0000-0000-0000-000000000001" && (
                    <Button
                      size="sm" variant="destructive"
                      onClick={async () => {
                        if (!confirm(`Excluir "${o.name}"? Todos os dados dessa organização serão perdidos.`)) return;
                        try {
                          await remove({ data: { id: o.id } });
                          toast.success("Organização excluída");
                          qc.invalidateQueries({ queryKey: ["all-orgs"] });
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Erro");
                        }
                      }}
                      className="gap-1"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

      </main>

      {subscribing && (
        <SubscriptionDialog
          org={subscribing}
          onClose={() => setSubscribing(null)}
          onSave={async (payload) => {
            try {
              await supabase.auth.refreshSession().catch(() => {});
              await updateSub({ data: payload });
              toast.success("Assinatura atualizada");
              qc.invalidateQueries({ queryKey: ["all-orgs"] });
              setSubscribing(null);
            } catch (e: any) {
              toast.error(e?.message || "Erro ao salvar assinatura");
            }
          }}
        />
      )}

      {showNew && (
        <NewOrgDialog
          initial={
            activating
              ? {
                  name: activating.nome_fantasia,
                  cnpj: activating.cnpj ?? "",
                  phone: activating.whatsapp ?? "",
                  street: activating.rua ?? "",
                  neighborhood: activating.bairro ?? "",
                  city: activating.cidade ?? "",
                  state: activating.uf ?? "",
                  zip: activating.cep ?? "",
                  admin_display_name: activating.nome_cliente,
                }
              : undefined
          }
          onClose={() => {
            setShowNew(false);
            setActivating(null);
          }}
          onCreate={async (payload) => {
            try {
              await supabase.auth.refreshSession().catch(() => {});
              await create({ data: payload });
              if (activating) {
                await (supabase as any)
                  .from("signup_requests")
                  .update({
                    status: "activated",
                    activated_at: new Date().toISOString(),
                  })
                  .eq("id", activating.id);
                qc.invalidateQueries({ queryKey: ["signup-requests", "pending"] });
              }
              toast.success(`Organização criada. Login do admin: ${payload.admin_nickname}`);
              qc.invalidateQueries({ queryKey: ["all-orgs"] });
              setShowNew(false);
              setActivating(null);
            } catch (e: any) {
              const msg = e?.message || e?.body?.message || (typeof e === "string" ? e : "Erro ao salvar");
              toast.error(msg);
              console.error("[super-admin create]", e);
            }
          }}
        />
      )}


      {editing && (
        <EditOrgDialog
          org={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch, newPassword) => {
            try {
              await supabase.auth.refreshSession().catch(() => {});
              await update({ data: { id: editing.id, patch } });
              if (newPassword && newPassword.length >= 6) {
                await resetPass({ data: { organization_id: editing.id, new_password: newPassword } });
                toast.success("Organização atualizada e senha do admin redefinida");
              } else {
                toast.success("Organização atualizada");
              }
              qc.invalidateQueries({ queryKey: ["all-orgs"] });
              setEditing(null);
            } catch (e: any) {
              const msg = e?.message || e?.body?.message || (typeof e === "string" ? e : "Erro ao salvar");
              toast.error(msg);
              console.error("[super-admin update]", e);
            }
          }}
        />
      )}

    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {props.type === "password" ? (
        <PasswordInput {...(props as React.ComponentProps<typeof PasswordInput>)} />
      ) : (
        <Input {...props} />
      )}
    </div>
  );
}

function slugify(s: string) {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function NewOrgDialog({
  onClose,
  onCreate,
  initial,
}: {
  onClose: () => void;
  onCreate: (p: any) => void;
  initial?: Partial<{
    name: string; cnpj: string; phone: string; email: string; website: string;
    street: string; neighborhood: string; city: string; state: string; zip: string;
    admin_display_name: string;
  }>;
}) {
  const [f, setF] = useState({
    name: initial?.name ?? "",
    slug: initial?.name ? slugify(initial.name) : "",
    cnpj: initial?.cnpj ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    website: initial?.website ?? "",
    street: initial?.street ?? "",
    neighborhood: initial?.neighborhood ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    zip: initial?.zip ?? "",
    primary_color: "#eab308", logo_url: "",
    admin_pin: "1234", delete_pin: "1234",
    admin_nickname: "", admin_password: "",
    admin_display_name: initial?.admin_display_name ?? "",
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  function handleName(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    setF((prev) => ({
      ...prev,
      name,
      slug: prev.slug && prev.slug !== slugify(prev.name) ? prev.slug : slugify(name),
    }));
  }

  function handleSubmit() {
    const errs: string[] = [];
    if (!f.name.trim()) errs.push("Nome obrigatório");
    const slug = (f.slug || slugify(f.name)).toLowerCase();
    if (!/^[a-z0-9-]{2,}$/.test(slug)) errs.push("Slug inválido (use só letras minúsculas, números e hífen)");
    if (!f.admin_display_name.trim()) errs.push("Nome do admin obrigatório");
    if (!/^[a-z0-9._-]{3,}$/i.test(f.admin_nickname)) errs.push("Login do admin inválido (mín 3 caracteres, sem espaços)");
    if (f.admin_password.length < 6) errs.push("Senha do admin precisa de pelo menos 6 caracteres");
    if ((f.admin_pin || "").length < 4) errs.push("PIN de entrada na tela ADM precisa de pelo menos 4 caracteres");
    if ((f.delete_pin || "").length < 4) errs.push("PIN de exclusão precisa de pelo menos 4 caracteres");
    if (errs.length) { toast.error(errs.join(" · ")); return; }
    const color = /^#[0-9a-fA-F]{6}$/.test(f.primary_color) ? f.primary_color : "#eab308";
    onCreate({
      ...f,
      slug,
      name: f.name.trim(),
      admin_nickname: f.admin_nickname.trim().toLowerCase(),
      admin_display_name: f.admin_display_name.trim(),
      primary_color: color,
    });
  }


  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full my-8">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Nova organização (tenant)</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nome *" value={f.name} onChange={handleName} />
            <Field label="Slug * (auto)" value={f.slug} onChange={(e) => setF({ ...f, slug: slugify(e.target.value) })} placeholder="minha-loja" />
            <Field label="CNPJ" value={f.cnpj} onChange={set("cnpj")} />
            <Field label="Telefone" value={f.phone} onChange={set("phone")} />
            <Field label="E-mail" value={f.email} onChange={set("email")} />
            <Field label="Site" value={f.website} onChange={set("website")} placeholder="https://…" />
            <Field label="CEP" value={f.zip} onChange={set("zip")} />
            <Field label="Rua" value={f.street} onChange={set("street")} />
            <Field label="Bairro" value={f.neighborhood} onChange={set("neighborhood")} />
            <Field label="Cidade" value={f.city} onChange={set("city")} />
            <Field label="Estado" value={f.state} onChange={set("state")} />
            <Field label="Cor primária" type="color" value={f.primary_color} onChange={set("primary_color")} />
          </div>
          <LogoInput value={f.logo_url} onChange={(v) => setF({ ...f, logo_url: v })} />
          <div className="border-t pt-3 space-y-3 bg-orange-50 dark:bg-orange-950/20 -mx-6 px-6 py-3">
            <h3 className="font-semibold text-sm">🔐 PINs desta organização</h3>
            <p className="text-xs text-muted-foreground">A senha do admin (abaixo) serve para <strong>login</strong>. Os PINs abaixo são separados e usados dentro do app do tenant. Mín 4 caracteres cada.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>PIN de entrada na tela ADM *</Label>
                <Input value={f.admin_pin} onChange={set("admin_pin")} placeholder="ex: 1234" maxLength={10} />
              </div>
              <div className="space-y-1">
                <Label>PIN de exclusão *</Label>
                <Input value={f.delete_pin} onChange={set("delete_pin")} placeholder="ex: 4321" maxLength={10} />
              </div>
            </div>
          </div>
          <div className="border-t pt-3 space-y-3">
            <h3 className="font-semibold text-sm">Usuário Administrador dessa organização</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nome do admin *" value={f.admin_display_name} onChange={set("admin_display_name")} />
              <Field label="Login (nickname) *" value={f.admin_nickname} onChange={set("admin_nickname")} placeholder="admin_loja" />
              <Field label="Senha * (mín 6)" type="password" value={f.admin_password} onChange={set("admin_password")} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-card border-t -mx-6 px-6 py-3">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit}>Criar organização</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Compress/resize any image (handles large mobile photos safely, HEIC excluded).
      const bitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Formato de imagem não suportado"));
        img.src = URL.createObjectURL(file);
      });
      const MAX = 512;
      const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      if (dataUrl.length > 350_000) {
        // fallback: reduce quality more
        onChange(canvas.toDataURL("image/jpeg", 0.6));
      } else {
        onChange(dataUrl);
      }
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível processar a imagem");
    } finally {
      e.target.value = "";
    }
  }
  return (
    <div className="space-y-2 border-t pt-3">
      <Label>Logo da organização</Label>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Input placeholder="URL https://…" value={value.startsWith("data:") ? "" : value} onChange={(e) => onChange(e.target.value)} />
        <span className="text-xs text-muted-foreground">ou</span>
        <Input type="file" accept="image/*" onChange={handleFile} className="sm:max-w-[220px]" />
      </div>
      {value && <img src={value} alt="preview" className="h-16 object-contain border rounded p-1 bg-white" />}
    </div>
  );
}


function EditOrgDialog({ org, onClose, onSave }: { org: Org; onClose: () => void; onSave: (patch: any, newPassword: string) => void }) {
  const [f, setF] = useState({
    name: org.name, cnpj: org.cnpj ?? "", phone: org.phone ?? "", email: org.email ?? "",
    website: org.website ?? "",
    street: org.street ?? "", neighborhood: org.neighborhood ?? "", city: org.city ?? "",
    state: org.state ?? "", zip: org.zip ?? "",
    primary_color: org.primary_color ?? "#eab308", logo_url: org.logo_url ?? "",
    admin_pin: "",
    delete_pin: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const getAdmin = useServerFn(getOrgAdmin);
  const { data: adminInfo } = useQuery({
    queryKey: ["org-admin", org.id],
    queryFn: () => getAdmin({ data: { organization_id: org.id } }),
  });
  const admin = adminInfo?.admin;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full my-8">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Editar organização</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nome" value={f.name} onChange={set("name")} />
            <Field label="CNPJ" value={f.cnpj} onChange={set("cnpj")} />
            <Field label="Telefone" value={f.phone} onChange={set("phone")} />
            <Field label="E-mail" value={f.email} onChange={set("email")} />
            <Field label="Site" value={f.website} onChange={set("website")} placeholder="https://…" />
            <Field label="CEP" value={f.zip} onChange={set("zip")} />
            <Field label="Rua" value={f.street} onChange={set("street")} />
            <Field label="Bairro" value={f.neighborhood} onChange={set("neighborhood")} />
            <Field label="Cidade" value={f.city} onChange={set("city")} />
            <Field label="Estado" value={f.state} onChange={set("state")} />
            <Field label="Cor primária" type="color" value={f.primary_color} onChange={set("primary_color")} />
            <Field label="PIN de entrada na tela ADM (em branco = manter)" value={f.admin_pin} onChange={set("admin_pin")} placeholder="Deixe em branco para manter" />
            <Field label="PIN de exclusão (em branco = manter)" value={f.delete_pin} onChange={set("delete_pin")} placeholder="Deixe em branco para manter" />
          </div>
          <LogoInput value={f.logo_url} onChange={(v) => setF({ ...f, logo_url: v })} />

          <div className="border-t pt-3 space-y-3 bg-orange-50 dark:bg-orange-950/20 -mx-6 px-6 py-3">
            <h3 className="font-semibold text-sm">🔐 Credenciais de login do admin</h3>
            {admin ? (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nome do admin</Label>
                  <Input value={admin.display_name} disabled />
                </div>
                <div className="space-y-1">
                  <Label>Login (usuário)</Label>
                  <Input value={admin.nickname} disabled />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Nova senha de login (opcional — mín 6 caracteres)</Label>
                  <PasswordInput
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Deixe em branco para manter a senha atual"
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">Por segurança, a senha atual não pode ser exibida. Preencha aqui para redefini-la.</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Carregando dados do admin…</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-card border-t -mx-6 px-6 py-3">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => onSave({
              name: f.name.trim(),
              cnpj: f.cnpj || null,
              phone: f.phone || null,
              email: f.email || null,
              website: f.website || null,
              street: f.street || null,
              neighborhood: f.neighborhood || null,
              city: f.city || null,
              state: f.state || null,
              zip: f.zip || null,
              primary_color: /^#[0-9a-fA-F]{6}$/.test(f.primary_color) ? f.primary_color : "#eab308",
              logo_url: f.logo_url || null,
              ...(f.admin_pin.trim() ? { admin_pin: f.admin_pin.trim() } : {}),
              ...(f.delete_pin.trim() ? { delete_pin: f.delete_pin.trim() } : {}),
            }, newPassword)}>Salvar</Button>

          </div>
        </div>
      </div>
    </div>
  );
}

function planLabel(p: Org["subscription_plan"]) {
  return {
    trial: "Teste 7 dias",
    monthly: "Mensal",
    semiannual: "Semestral",
    annual: "Anual",
    free_lifetime: "Gratuito vitalício",
  }[p];
}

function SubBadge({ org }: { org: Org }) {
  const expired = org.subscription_expires_at && new Date(org.subscription_expires_at) <= new Date();
  const effective = expired && org.subscription_status !== "blocked" ? "expired" : org.subscription_status;
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Ativa", cls: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
    trial: { label: "Teste", cls: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
    expired: { label: "Expirada", cls: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" },
    blocked: { label: "Bloqueada", cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  };
  const b = map[effective] ?? map.active;
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${b.cls}`}>{b.label}</span>;
}

type SubPayload = {
  organization_id: string;
  plan: Org["subscription_plan"];
  status: Org["subscription_status"];
  expires_at: string | null;
  blocked_reason: string | null;
};

function SubscriptionDialog({ org, onClose, onSave }: { org: Org; onClose: () => void; onSave: (p: SubPayload) => void }) {
  const initialExpires = org.subscription_expires_at
    ? org.subscription_expires_at.slice(0, 10)
    : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const [plan, setPlan] = useState<Org["subscription_plan"]>(org.subscription_plan);
  const [status, setStatus] = useState<Org["subscription_status"]>(org.subscription_status);
  const [expiresAt, setExpiresAt] = useState<string>(initialExpires);
  const [reason, setReason] = useState<string>(org.blocked_reason ?? "");

  function applyPlan(newPlan: Org["subscription_plan"]) {
    setPlan(newPlan);
    const now = new Date();
    if (newPlan === "trial") {
      setExpiresAt(new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10));
      setStatus("trial");
    } else if (newPlan === "monthly") {
      setExpiresAt(new Date(now.setMonth(now.getMonth() + 1)).toISOString().slice(0, 10));
      setStatus("active");
    } else if (newPlan === "semiannual") {
      setExpiresAt(new Date(now.setMonth(now.getMonth() + 6)).toISOString().slice(0, 10));
      setStatus("active");
    } else if (newPlan === "annual") {
      setExpiresAt(new Date(now.setFullYear(now.getFullYear() + 1)).toISOString().slice(0, 10));
      setStatus("active");
    } else if (newPlan === "free_lifetime") {
      setStatus("active");
    }
  }

  function submit() {
    const payload: SubPayload = {
      organization_id: org.id,
      plan,
      status,
      expires_at: plan === "free_lifetime" ? null : new Date(expiresAt + "T23:59:59").toISOString(),
      blocked_reason: status === "blocked" ? (reason.trim() || "Bloqueado pelo Super Admin") : null,
    };
    onSave(payload);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full my-8">
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Assinatura</h2>
            <p className="text-sm text-muted-foreground">{org.name}</p>
          </div>

          <div className="space-y-2">
            <Label>Plano</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["trial", "Teste 7 dias"],
                ["monthly", "Mensal"],
                ["semiannual", "Semestral"],
                ["annual", "Anual"],
                ["free_lifetime", "Gratuito vitalício"],
              ] as const).map(([k, l]) => (
                <Button
                  key={k}
                  type="button"
                  variant={plan === k ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyPlan(k)}
                >
                  {l}
                </Button>
              ))}
            </div>
          </div>

          {plan !== "free_lifetime" && (
            <div className="space-y-1">
              <Label>Data de validade</Label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              <p className="text-xs text-muted-foreground">Após esta data, o acesso é bloqueado automaticamente.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["active", "Ativa"],
                ["trial", "Em teste"],
                ["expired", "Expirada"],
                ["blocked", "Bloqueada"],
              ] as const).map(([k, l]) => (
                <Button
                  key={k}
                  type="button"
                  variant={status === k ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatus(k)}
                >
                  {l}
                </Button>
              ))}
            </div>
          </div>

          {status === "blocked" && (
            <div className="space-y-1">
              <Label>Motivo do bloqueio (visível ao cliente)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: pagamento pendente" />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t -mx-6 px-6 pt-4">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={submit}>Salvar assinatura</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

