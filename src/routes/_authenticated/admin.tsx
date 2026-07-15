import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/useRole";
import { createUserByAdmin, setUserPasswordByAdmin } from "@/lib/admin-users.functions";
import { updateOrganization } from "@/lib/orgs.functions";
import { useBranding } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { Check, X, Pencil, Save, Users, KeyRound, Eye, EyeOff, Lock, Package, Landmark, Wrench, Percent, UserPlus, Shield, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type Profile = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  provider: string | null;
  approved: boolean;
  created_at: string;
};


const ADMIN_UNLOCKED_KEY = "adm-unlocked";

function hasAdminUnlocked() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ADMIN_UNLOCKED_KEY) === "1";
}

function markAdminUnlocked() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ADMIN_UNLOCKED_KEY, "1");
}

function allowReturnToAdmin() {
  // Mantido por compatibilidade com chamadas existentes nos Links de sub-páginas.
  // O desbloqueio agora persiste durante toda a sessão do navegador.
}



function AdminPage() {
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const { org, refresh: refreshBranding } = useBranding();
  const callCreateUser = useServerFn(createUserByAdmin);
  const callSetPassword = useServerFn(setUserPasswordByAdmin);
  const callUpdateOrg = useServerFn(updateOrganization);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [deletePinValue, setDeletePinValue] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showDeletePin, setShowDeletePin] = useState(false);
  const [myPassword, setMyPassword] = useState("");
  const [showMyPassword, setShowMyPassword] = useState(false);
  const [debitFee, setDebitFee] = useState("");
  const [creditFee, setCreditFee] = useState("");
  const [debitFeeOther, setDebitFeeOther] = useState("");
  const [creditFeeOther, setCreditFeeOther] = useState("");
  const [boletoFee, setBoletoFee] = useState("");
  const [confirmFeesOpen, setConfirmFeesOpen] = useState(false);
  // novo usuário
  const [newNickname, setNewNickname] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const { data: currentPin } = useQuery({
    queryKey: ["admin-pin"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "admin_pin").maybeSingle();
      return (data?.value as string | null) ?? "";
    },
    enabled: isAdmin,
  });

  const { data: currentDeletePin } = useQuery({
    queryKey: ["delete-pin"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "delete_pin").maybeSingle();
      return (data?.value as string | null) ?? "";
    },
    enabled: isAdmin,
  });

  const { data: paymentFees } = useQuery({
    queryKey: ["payment-fees"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", ["debit_fee_pct", "credit_fee_pct", "debit_fee_pct_other", "credit_fee_pct_other", "boleto_fee"]);
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { map[r.key] = String(r.value ?? ""); });
      return {
        debit: map["debit_fee_pct"] ?? "",
        credit: map["credit_fee_pct"] ?? "",
        debitOther: map["debit_fee_pct_other"] ?? "",
        creditOther: map["credit_fee_pct_other"] ?? "",
        boleto: map["boleto_fee"] ?? "",
      };
    },
    enabled: isAdmin,
  });

  useEffect(() => { if (typeof currentPin === "string") setPinValue(currentPin); }, [currentPin]);
  useEffect(() => { if (typeof currentDeletePin === "string") setDeletePinValue(currentDeletePin); }, [currentDeletePin]);
  useEffect(() => {
    if (paymentFees) {
      setDebitFee(paymentFees.debit);
      setCreditFee(paymentFees.credit);
      setDebitFeeOther(paymentFees.debitOther || paymentFees.debit);
      setCreditFeeOther(paymentFees.creditOther || paymentFees.credit);
      setBoletoFee(paymentFees.boleto);
    }
  }, [paymentFees]);

  const savePin = useMutation({
    mutationFn: async ({ admin_pin, delete_pin }: { admin_pin: string; delete_pin: string }) => {
      const a = admin_pin.trim();
      const d = delete_pin.trim();
      if (a.length < 4 || a.length > 10) throw new Error("PIN de entrada deve ter de 4 a 10 caracteres");
      if (d.length < 4 || d.length > 10) throw new Error("PIN de exclusão deve ter de 4 a 10 caracteres");
      if (!org?.id) throw new Error("Organização não carregada");
      // Sincroniza organizations + app_settings via server fn (visível no Super Admin)
      await callUpdateOrg({ data: { id: org.id, patch: { admin_pin: a, delete_pin: d } } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pin"] });
      qc.invalidateQueries({ queryKey: ["delete-pin"] });
      void refreshBranding();
      toast.success("PINs atualizados");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveMyPassword = useMutation({
    mutationFn: async (pwd: string) => {
      const p = pwd.trim();
      if (p.length < 6) throw new Error("Senha deve ter no mínimo 6 caracteres");
      const { error } = await supabase.auth.updateUser({ password: p });
      if (error) throw error;
    },
    onSuccess: () => { setMyPassword(""); toast.success("Senha de login atualizada"); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveFees = useMutation({
    mutationFn: async () => {
      const parsePct = (v: string) => {
        const n = Number(String(v).replace(",", "."));
        if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error("Percentual inválido (0 a 100)");
        return n;
      };
      const parseVal = (v: string) => {
        const n = Number(String(v).replace(",", "."));
        if (!Number.isFinite(n) || n < 0) throw new Error("Valor inválido");
        return n;
      };
      const d = parsePct(debitFee || "0");
      const c = parsePct(creditFee || "0");
      const dO = parsePct(debitFeeOther || "0");
      const cO = parsePct(creditFeeOther || "0");
      const b = parseVal(boletoFee || "0");
      const { error } = await supabase.from("app_settings").upsert(
        [
          { key: "debit_fee_pct", value: String(d) },
          { key: "credit_fee_pct", value: String(c) },
          { key: "debit_fee_pct_other", value: String(dO) },
          { key: "credit_fee_pct_other", value: String(cO) },
          { key: "boleto_fee", value: String(b) },
        ],
        { onConflict: "organization_id,key" },
      );
      if (error) throw error;
      // Histórico por data: vendas anteriores ficam intactas; vendas de hoje
      // (e futuras) passam a usar essa nova taxa imediatamente.
      const today = new Date();
      const effective = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const { data: prof } = await supabase.from("profiles").select("organization_id").maybeSingle();
      const orgId = prof?.organization_id;
      if (!orgId) throw new Error("Organização não encontrada");
      const { error: histErr } = await supabase
        .from("payment_fee_history")
        .upsert({ organization_id: orgId, effective_date: effective, debit_pct: d, credit_pct: c, debit_pct_other: dO, credit_pct_other: cO, boleto_fee: b }, { onConflict: "organization_id,effective_date" });
      if (histErr) throw histErr;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-fees"] });
      qc.invalidateQueries({ queryKey: ["payment-fee-history"] });
      qc.invalidateQueries({ queryKey: ["all-movs"] });
      qc.invalidateQueries({ queryKey: ["vendas-mes-completo"] });
      qc.invalidateQueries({ queryKey: ["monthly-6"] });
      qc.invalidateQueries({ queryKey: ["movs-dashboard-expanded"] });
      toast.success("Taxas atualizadas");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
    enabled: isAdmin,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data as { user_id: string; role: "admin" | "user" | "moderator" }[];
    },
    enabled: isAdmin,
  });

  const roleOf = (uid: string) =>
    roles.some(r => r.user_id === uid && r.role === "admin") ? "admin" : "user";

  const setApproval = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase.from("profiles").update({ approved }).eq("user_id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-profiles"] }); toast.success("Acesso atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const setRole = useMutation({
    mutationFn: async ({ id, makeAdmin }: { id: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        // Remove qualquer linha "user" antiga e garante a linha "admin"
        const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "user");
        if (delErr) throw delErr;
        const { error } = await supabase.from("user_roles").upsert({ user_id: id, role: "admin" }, { onConflict: "user_id,role" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
        if (error) throw error;
        const { error: upErr } = await supabase.from("user_roles").upsert({ user_id: id, role: "user" }, { onConflict: "user_id,role" });
        if (upErr) throw upErr;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-roles"] }); toast.success("Papel atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveProfile = useMutation({
    mutationFn: async ({ id, name, password }: { id: string; name: string; password: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: name })
        .eq("user_id", id);
      if (error) throw error;
      if (password && password.trim().length > 0) {
        await callSetPassword({ data: { userId: id, password: password.trim() } });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-profiles"] }); setEditingId(null); setEditPassword(""); toast.success("Perfil atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const createUser = useMutation({
    mutationFn: async () => {
      await callCreateUser({ data: { nickname: newNickname, password: newPassword, makeAdmin: newIsAdmin } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
      setNewNickname(""); setNewPassword(""); setNewIsAdmin(false);
      toast.success("Usuário criado");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao criar usuário"),
  });

  const [unlocked, setUnlocked] = useState<boolean>(() => hasAdminUnlocked());
  const [pinEntry, setPinEntry] = useState("");

  useEffect(() => {
    if (hasAdminUnlocked()) {
      setUnlocked(true);
    }
  }, []);

  function tryUnlock(e?: React.FormEvent) {
    e?.preventDefault();
    const expected = (currentPin ?? "").trim();
    if (!expected) {
      toast.error("Nenhum PIN configurado. Contate o administrador.");
      return;
    }
    if (pinEntry.trim() === expected) {
      setUnlocked(true);
      markAdminUnlocked();
      setPinEntry("");
    } else {
      toast.error("PIN incorreto");
      setPinEntry("");
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Você não tem permissão para acessar esta área.
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="size-4 text-primary" /> Área protegida</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={tryUnlock} className="space-y-3">
              <p className="text-sm text-muted-foreground">Digite o PIN de administrador para acessar.</p>
              <PasswordInput
                maxLength={8}
                value={pinEntry}
                onChange={(e) => setPinEntry(e.target.value)}
                placeholder="••••"
                className="tracking-widest text-center"
                autoFocus
              />
              <div className="flex gap-2">
                <Link to="/dashboard" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">Cancelar</Button>
                </Link>
                <Button type="submit" className="flex-1">Entrar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="card-surface relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-primary/10 to-transparent p-5">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-primary to-primary/40" />
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/15"><Users className="size-5 text-primary" /></div>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold whitespace-nowrap truncate">ADM/Configurações</h1>
            <p className="text-sm text-muted-foreground">Gerencie usuários, acessos e papéis</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Atalhos administrativos</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link to="/produtos" onPointerDown={allowReturnToAdmin} onClick={allowReturnToAdmin}>
            <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
              <Package className="size-4 text-primary" />
              <span className="flex flex-col items-start text-left">
                <span className="font-medium">Lista de preços</span>
                <span className="text-xs text-muted-foreground">Produtos, marcas e lucros</span>
              </span>
            </Button>
          </Link>
          <Link to="/referencias" onPointerDown={allowReturnToAdmin} onClick={allowReturnToAdmin}>
            <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
              <Wrench className="size-4 text-primary" />
              <span className="flex flex-col items-start text-left">
                <span className="font-medium">Prod. e Serviços</span>
                <span className="text-xs text-muted-foreground">Referências de preços</span>
              </span>
            </Button>
          </Link>
          <Link to="/estoque" onPointerDown={allowReturnToAdmin} onClick={allowReturnToAdmin}>
            <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
              <Package className="size-4 text-primary" />
              <span className="flex flex-col items-start text-left">
                <span className="font-medium">Controle de Estoque</span>
                <span className="text-xs text-muted-foreground">Saldo, mínimo e alertas</span>
              </span>
            </Button>
          </Link>
          <Link to="/balanco" onPointerDown={allowReturnToAdmin} onClick={allowReturnToAdmin}>
            <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
              <Landmark className="size-4 text-primary" />
              <span className="flex flex-col items-start text-left">
                <span className="font-medium">Balanço Mensal</span>
                <span className="text-xs text-muted-foreground">Vendas, despesas e lucro</span>
              </span>
            </Button>
          </Link>
          <Link to="/organizacao" onPointerDown={allowReturnToAdmin} onClick={allowReturnToAdmin}>
            <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
              <Shield className="size-4 text-primary" />
              <span className="flex flex-col items-start text-left">
                <span className="font-medium">Dados da Empresa</span>
                <span className="text-xs text-muted-foreground">Logo, cor, CNPJ, endereço</span>
              </span>
            </Button>
          </Link>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="size-4 text-primary" /> PINs de segurança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Alterações aqui são sincronizadas automaticamente com o painel Super Admin.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">PIN de entrada na tela ADM</label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  type={showPin ? "text" : "password"}
                  maxLength={10}
                  value={pinValue}
                  onChange={(e) => setPinValue(e.target.value)}
                  placeholder="••••"
                  className="tracking-widest"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setShowPin(s => !s)}>
                  {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1"><Trash2 className="size-3" /> PIN de exclusão de registros</label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  type={showDeletePin ? "text" : "password"}
                  maxLength={10}
                  value={deletePinValue}
                  onChange={(e) => setDeletePinValue(e.target.value)}
                  placeholder="••••"
                  className="tracking-widest"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setShowDeletePin(s => !s)}>
                  {showDeletePin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => savePin.mutate({ admin_pin: pinValue, delete_pin: deletePinValue })}
              disabled={savePin.isPending || !org?.id}
            >
              <Save className="size-4 mr-1" /> Salvar PINs
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="size-4 text-primary" /> Minha senha de login</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Altere sua senha de acesso ao sistema (mínimo 6 caracteres).</label>
            <div className="mt-1 flex items-center gap-2 max-w-[320px]">
              <Input
                type={showMyPassword ? "text" : "password"}
                value={myPassword}
                onChange={(e) => setMyPassword(e.target.value)}
                placeholder="Nova senha"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setShowMyPassword(s => !s)}>
                {showMyPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>
          <Button onClick={() => saveMyPassword.mutate(myPassword)} disabled={saveMyPassword.isPending || !myPassword}>
            <Save className="size-4 mr-1" /> Salvar senha
          </Button>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Percent className="size-4 text-primary" /> Taxas de pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Percentuais aplicados como custo extra em vendas pagas em Débito/Crédito (diferenciados por bandeira do cartão) e valor fixo (R$) cobrado por venda em Boleto.
          </p>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">Visa / Mastercard</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Débito Visa/Master (%)</label>
                <Input type="number" inputMode="decimal" step="0.01" min={0} max={100}
                  value={debitFee} onChange={(e) => setDebitFee(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Crédito Visa/Master (%)</label>
                <Input type="number" inputMode="decimal" step="0.01" min={0} max={100}
                  value={creditFee} onChange={(e) => setCreditFee(e.target.value)} placeholder="0,00" />
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-md border border-dashed border-border p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-orange-500">Outras bandeiras</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Débito Outras (%)</label>
                <Input type="number" inputMode="decimal" step="0.01" min={0} max={100}
                  value={debitFeeOther} onChange={(e) => setDebitFeeOther(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Crédito Outras (%)</label>
                <Input type="number" inputMode="decimal" step="0.01" min={0} max={100}
                  value={creditFeeOther} onChange={(e) => setCreditFeeOther(e.target.value)} placeholder="0,00" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Boleto (R$ por venda)</label>
            <Input type="number" inputMode="decimal" step="0.01" min={0}
              value={boletoFee} onChange={(e) => setBoletoFee(e.target.value)} placeholder="0,00"
              className="max-w-[220px]" />
          </div>


          <div>
            <Button onClick={() => setConfirmFeesOpen(true)} disabled={saveFees.isPending}>
              <Save className="size-4 mr-1" /> Salvar taxas
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmFeesOpen}
        onOpenChange={setConfirmFeesOpen}
        title="Alterar taxas de pagamento?"
        description="As novas taxas valerão apenas para vendas registradas a partir de agora. Vendas anteriores permanecem com a taxa vigente na data em que foram lançadas."
        confirmLabel="Alterar"
        requirePin
        onConfirm={() => saveFees.mutate()}
      />



      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="size-4 text-primary" /> Cadastrar novo usuário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Usuário</label>
              <Input
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="ex.: joao_silva"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Senha (mín. 6 caracteres)</label>
              <div className="flex items-center gap-2">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setShowNewPassword(s => !s)} aria-label="Mostrar senha">
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={newIsAdmin} onCheckedChange={(v) => setNewIsAdmin(v === true)} />
                Tornar administrador
              </label>
            </div>
          </div>
          <div>
            <Button onClick={() => createUser.mutate()} disabled={createUser.isPending}>
              <UserPlus className="size-4 mr-1" /> {createUser.isPending ? "Criando..." : "Criar usuário"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Usuários cadastrados ({profiles.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead className="text-center">Senha / Login</TableHead>
                  <TableHead className="text-center">Papel</TableHead>
                  <TableHead className="text-center">Acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Carregando...</TableCell></TableRow>
                )}
                {!isLoading && profiles.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Nenhum usuário.</TableCell></TableRow>
                )}
                {profiles.map(p => {
                  const role = roleOf(p.user_id);
                  const isEdit = editingId === p.user_id;
                  return (
                    <TableRow key={p.user_id}>
                      <TableCell>
                        {isEdit ? (
                          <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 max-w-[200px]" placeholder="Nome" />
                        ) : (
                          <span className="font-medium">{p.display_name || "—"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(p.email || "").split("@")[0] || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEdit ? (
                          <PasswordInput
                            value={editPassword}
                            onChange={e => setEditPassword(e.target.value)}
                            className="h-8 max-w-[160px] mx-auto"
                            placeholder="Nova senha (opcional)"
                            autoComplete="new-password"
                          />
                        ) : (
                          <Badge variant="outline" className="uppercase">USUÁRIO</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Select value={role} onValueChange={(v) => setRole.mutate({ id: p.user_id, makeAdmin: v === "admin" })}>
                          <SelectTrigger className="h-8 w-[120px] mx-auto"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">usuário</SelectItem>
                            <SelectItem value="admin">admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        {p.approved
                          ? <Badge className="bg-green-600 hover:bg-green-600">Aprovado</Badge>
                          : <Badge variant="destructive">Pendente</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          {isEdit ? (
                            <>
                              <Button size="sm" onClick={() => saveProfile.mutate({ id: p.user_id, name: editName, password: editPassword })}>
                                <Save className="size-3.5 mr-1" /> Salvar
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                                <X className="size-3.5 mr-1" /> Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => { setEditingId(p.user_id); setEditName(p.display_name || ""); setEditPassword(""); }}>
                                <Pencil className="size-3.5 mr-1" /> Editar
                              </Button>
                              {p.approved ? (
                                <Button size="sm" variant="outline" onClick={() => setApproval.mutate({ id: p.user_id, approved: false })}>
                                  <X className="size-3.5 mr-1" /> Revogar
                                </Button>
                              ) : (
                                <Button size="sm" onClick={() => setApproval.mutate({ id: p.user_id, approved: true })}>
                                  <Check className="size-3.5 mr-1" /> Aprovar
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Apenas o administrador cria novos usuários. Defina usuário e senha no formulário acima; o acesso é liberado automaticamente.
      </p>
    </div>
  );
}
