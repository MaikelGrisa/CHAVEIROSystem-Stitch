import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogIn, Eye, EyeOff, Rocket, ArrowRight } from "lucide-react";

// Bundled locally (hashed filenames) so old PWA/Service Worker caches can
// never serve a stale or wrong image for the Auth branding.
import chaveiroLogoLocal from "@/assets/chaveiro-logo-local.png";
import assinaturaLocal from "@/assets/assinatura-local.png";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Chaveiro System" }] }),
  component: AuthPage,
});

const NICKNAME_DOMAIN = "chaveirotop.local";

function resolveLoginEmail(input: string) {
  const v = input.trim().toLowerCase();
  if (!v) return v;
  if (v.includes("@")) return v;
  return `${v}@${NICKNAME_DOMAIN}`;
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const uaDataMobile = (navigator as unknown as { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile;
  if (typeof uaDataMobile === "boolean") return uaDataMobile;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

function isStandalonePWA() {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(mql || iosStandalone);
}

function AuthPage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [orgColor, setOrgColor] = useState<string | null>(null);


  useEffect(() => {
    // Autopreencher só é permitido no app instalado (PWA standalone) em celular.
    // Em qualquer navegador (desktop ou mobile) o login deve ser sempre manual.
    setIsMobile(isMobileDevice() && isStandalonePWA());
  }, []);

  // Look up the tenant's primary color by nickname (public RPC) and tint the
  // "Entrar" button so the login screen already reflects the tenant branding.
  useEffect(() => {
    const nick = nickname.trim().toLowerCase();
    if (!nick) { setOrgColor(null); return; }
    // Super Admin login uses the GO green brand color.
    if (nick === "go.plus" || nick === "go.plus.digital") {
      setOrgColor("#16a34a");
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.rpc("get_org_color_by_nickname", { _nickname: nick });
        if (cancelled) return;
        const color = typeof data === "string" ? data : null;
        setOrgColor(color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : null);
      } catch {
        if (!cancelled) setOrgColor(null);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [nickname]);



  async function routeAfterAuth(userId: string) {
    const { data: role } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "super_admin").maybeSingle();
    navigate({ to: role ? "/super-admin" : "/movimentacoes", replace: true });
  }

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) void routeAfterAuth(data.session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (active && s) void routeAfterAuth(s.user.id);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const email = resolveLoginEmail(nickname);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Aciona o gerenciador de senhas do dispositivo (Android/iOS) para salvar
      // as credenciais. Sem isso, o navegador não exibe "Salvar senha" em SPAs
      // que usam preventDefault, e por consequência a biometria de autopreencher
      // nunca é ativada nas próximas aberturas.
      // Apenas em dispositivos móveis (Android/iOS) acionamos o gerenciador de
      // senhas do sistema para salvar credenciais e habilitar autopreencher
      // com biometria. Em desktop/Windows nunca salvamos — o usuário sempre
      // deve digitar manualmente.
      if (isMobile) {
        try {
          const w = window as unknown as {
            PasswordCredential?: new (data: {
              id: string;
              password: string;
              name?: string;
            }) => Credential;
          };
          if (w.PasswordCredential && navigator.credentials?.store) {
            const cred = new w.PasswordCredential({
              id: nickname.trim(),
              password,
              name: nickname.trim(),
            });
            await navigator.credentials.store(cred);
          }
        } catch {
          // Sem suporte (ex.: iOS Safari) — autofill nativo via atributos do <form>.
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) await routeAfterAuth(userData.user.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="card-surface w-full max-w-md p-8"
      >
        <div className="flex items-center justify-center gap-3">
          <img
            src={chaveiroLogoLocal}
            alt="Chaveiro System"
            className="h-14 w-auto object-contain"
            loading="eager"
            decoding="async"
          />
          <h1 className="text-2xl font-bold">CHAVEIRO System</h1>
        </div>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Entre com seu usuário e senha.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4"
          name="login"
          method="post"
          action="/auth"
          autoComplete={isMobile ? "on" : "off"}
        >
          <div className="space-y-2">
            <Label htmlFor="nickname">Usuário</Label>
            <Input
              id="nickname"
              name="username"
              type="text"
              autoComplete={isMobile ? "username" : "off"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              placeholder="seu_usuario"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isMobile ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base gap-2 text-white transition-colors duration-200"
            style={{ backgroundColor: orgColor || "#374151" }}
          >
            <LogIn className="size-5" />
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acesso restrito. Solicite ao administrador a criação do seu usuário.
        </p>
      </motion.div>

      {!orgColor && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-center gap-1.5">
          <Link
            to="/landing"
            className="group relative inline-block"
            aria-label="Testar grátis por 7 dias"
          >
            <span
              className="absolute -inset-0.5 rounded-full opacity-60 blur-md transition group-hover:opacity-100"
              style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 45%, #7a7a7a 55%, #4a4a4a 75%, #1a1a1a 100%)" }}
              aria-hidden
            />
            <Button
              size="icon"
              style={{
                background: "linear-gradient(135deg, #0a0a0a 0%, #2a2a2a 45%, #5a5a5a 55%, #2a2a2a 75%, #0a0a0a 100%)",
                color: "#fff",
              }}
              className="relative h-14 w-14 rounded-full border-0 shadow-lg shadow-black/40 hover:opacity-95"
            >
              <Rocket className="h-6 w-6 text-white" />
            </Button>
          </Link>
          <span className="text-[11px] font-semibold text-foreground/80 text-center leading-tight">
            Testar grátis<br />por 7 dias
          </span>
        </div>
      )}

    </main>
  );
}
