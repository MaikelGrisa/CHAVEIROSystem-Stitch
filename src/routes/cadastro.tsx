import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import goPlusLogo from "@/assets/goplus-logo-local.png";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Cadastro | Teste 7 DIAS — Go! Plus" },
      { name: "description", content: "Cadastre-se para testar o sistema por 7 dias." },
    ],
  }),
  component: CadastroPage,
});

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const WHATSAPP_TARGET = "5551981815780";

type FormState = {
  nome_cliente: string;
  nome_fantasia: string;
  cnpj: string;
  whatsapp: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
};

const INITIAL: FormState = {
  nome_cliente: "",
  nome_fantasia: "",
  cnpj: "",
  whatsapp: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
};

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}
function formatCNPJ(v: string) {
  const d = onlyDigits(v).slice(0, 14);
  let out = d;
  if (d.length > 2) out = d.slice(0, 2) + "." + d.slice(2);
  if (d.length > 5) out = out.slice(0, 6) + "." + out.slice(6);
  if (d.length > 8) out = out.slice(0, 10) + "/" + out.slice(10);
  if (d.length > 12) out = out.slice(0, 15) + "-" + out.slice(15);
  return out;
}
function formatWhats(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function formatCEP(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function CadastroPage() {
  const [f, setF] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [waUrl, setWaUrl] = useState<string>(`https://api.whatsapp.com/send/?phone=${WHATSAPP_TARGET}&text=NOVO+CHAVEIRO+CADASTRADO%21&type=phone_number&app_absent=0`);
  const [cnpjTaken, setCnpjTaken] = useState(false);
  const [checkingCnpj, setCheckingCnpj] = useState(false);

  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setF((prev) => ({ ...prev, [k]: e.target.value }));

  function onCnpjChange(e: React.ChangeEvent<HTMLInputElement>) {
    setF((p) => ({ ...p, cnpj: formatCNPJ(e.target.value) }));
    setCnpjTaken(false);
  }
  async function checkCnpj() {
    const digits = onlyDigits(f.cnpj);
    if (digits.length !== 14) return;
    setCheckingCnpj(true);
    try {
      const { data, error } = await supabase.rpc("cnpj_already_registered", { _cnpj: digits });
      if (error) throw error;
      setCnpjTaken(!!data);
      if (data) toast.error("CNPJ já cadastrado no sistema.");
    } catch {
      // ignore network errors
    } finally {
      setCheckingCnpj(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const required: [keyof FormState, string][] = [
      ["nome_fantasia", "Nome Fantasia/Razão Social"],
      ["cnpj", "CNPJ"],
      ["whatsapp", "Whatsapp"],
      ["rua", "Rua/Av."],
      ["numero", "Número"],
      ["bairro", "Bairro"],
      ["cidade", "Cidade"],
      ["uf", "Estado (UF)"],
      ["cep", "CEP"],
    ];
    const errs = required.filter(([k]) => !f[k].trim()).map(([, l]) => l);
    if (errs.length) {
      toast.error(`Preencha: ${errs.join(", ")}`);
      return;
    }
    if (onlyDigits(f.cnpj).length !== 14) {
      toast.error("CNPJ inválido (14 dígitos).");
      return;
    }
    if (cnpjTaken) {
      toast.error("CNPJ já cadastrado.");
      return;
    }

    const digits = onlyDigits(f.cnpj);
    const { data: taken } = await supabase.rpc("cnpj_already_registered", { _cnpj: digits });
    if (taken) {
      setCnpjTaken(true);
      toast.error("CNPJ já cadastrado.");
      return;
    }

    const payload = {
      nome_cliente: f.nome_cliente.trim(),
      nome_fantasia: f.nome_fantasia.trim(),
      cnpj: f.cnpj.trim() || null,
      whatsapp: f.whatsapp.trim(),
      rua: f.rua.trim() || null,
      numero: f.numero.trim() || null,
      complemento: f.complemento.trim() || null,
      bairro: f.bairro.trim() || null,
      cidade: f.cidade.trim() || null,
      uf: f.uf.trim().toUpperCase(),
      cep: f.cep.trim() || null,
      status: "pending" as const,
    };

    const url = `https://api.whatsapp.com/send/?phone=${WHATSAPP_TARGET}&text=NOVO+CHAVEIRO+CADASTRADO%21&type=phone_number&app_absent=0`;
    setWaUrl(url);

    setLoading(true);
    try {
      const { error } = await supabase.from("signup_requests").insert(payload);
      if (error) throw error;

      setDone(true);
      setF(INITIAL);
      // Redireciona automaticamente para o WhatsApp (dentro do gesto do submit)
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar cadastro");
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12 bg-background">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="card-surface w-full max-w-2xl p-6 sm:p-8"
      >
        <div className="flex flex-col items-center text-center gap-3">
          <img
            src={goPlusLogo}
            alt="Go! Plus"
            className="h-16 sm:h-20 w-auto max-w-[80%] object-contain shrink-0"
            loading="eager"
            decoding="async"
          />
          <h1 className="text-2xl sm:text-3xl font-bold">Cadastro | Teste 7 DIAS</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Preencha os dados abaixo para liberar seu teste gratuito de 7 dias.
            Após o envio, entraremos em contato pelo WhatsApp para ativar sua conta.
          </p>
        </div>

        {done ? (
          <div className="mt-8 flex flex-col items-center text-center gap-4">
            <CheckCircle2 className="size-16 text-green-600" />
            <h2 className="text-xl font-semibold">Cadastro enviado!</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Redirecionando para o WhatsApp...
            </p>
            <p className="text-xs text-muted-foreground">
              Se não abrir, chame direto no número{" "}
              <span className="font-medium text-foreground">+55 51 98181-5780</span>
            </p>

            <Link to="/auth" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="size-3" /> Voltar
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nome_cliente">Nome do Cliente *</Label>
                <Input
                  id="nome_cliente"
                  value={f.nome_cliente}
                  onChange={set("nome_cliente")}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nome_fantasia">Nome Fantasia / Razão Social do Chaveiro *</Label>
                <Input
                  id="nome_fantasia"
                  value={f.nome_fantasia}
                  onChange={set("nome_fantasia")}
                  required
                  autoComplete="organization"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  value={f.cnpj}
                  onChange={onCnpjChange}
                  onBlur={checkCnpj}
                  required
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  aria-invalid={cnpjTaken}
                />
                {cnpjTaken && (
                  <p className="text-xs text-destructive">CNPJ já cadastrado no sistema.</p>
                )}
                {checkingCnpj && (
                  <p className="text-xs text-muted-foreground">Verificando CNPJ...</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">Whatsapp *</Label>
                <Input
                  id="whatsapp"
                  value={f.whatsapp}
                  onChange={(e) => setF((p) => ({ ...p, whatsapp: formatWhats(e.target.value) }))}
                  required
                  inputMode="tel"
                  placeholder="(51) 99999-9999"
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="rua">Rua / Av. *</Label>
                <Input
                  id="rua"
                  value={f.rua}
                  onChange={set("rua")}
                  required
                  autoComplete="address-line1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero">Número *</Label>
                <Input
                  id="numero"
                  value={f.numero}
                  onChange={set("numero")}
                  required
                  inputMode="numeric"
                  placeholder="123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={f.complemento}
                  onChange={set("complemento")}
                  placeholder="Sala, apto, bloco..."
                  autoComplete="address-line2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro *</Label>
                <Input
                  id="bairro"
                  value={f.bairro}
                  onChange={set("bairro")}
                  required
                  autoComplete="address-level3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade *</Label>
                <Input
                  id="cidade"
                  value={f.cidade}
                  onChange={set("cidade")}
                  required
                  autoComplete="address-level2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uf">Estado (UF) *</Label>
                <Select value={f.uf} onValueChange={(v) => setF((p) => ({ ...p, uf: v }))}>
                  <SelectTrigger id="uf">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {UF_LIST.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP *</Label>
                <Input
                  id="cep"
                  value={f.cep}
                  onChange={(e) => setF((p) => ({ ...p, cep: formatCEP(e.target.value) }))}
                  required
                  inputMode="numeric"
                  placeholder="00000-000"
                  autoComplete="postal-code"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || cnpjTaken || checkingCnpj}
              className="w-full h-12 text-base gap-2 text-white"
              style={{ backgroundColor: "#16a34a" }}
            >
              {loading ? "Enviando..." : cnpjTaken ? "CNPJ já cadastrado" : "Enviar cadastro e iniciar teste de 7 dias"}
            </Button>


            <div className="text-center">
              <Link
                to="/auth"
                className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft className="size-3" /> Já tenho cadastro — entrar
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </main>
  );
}
