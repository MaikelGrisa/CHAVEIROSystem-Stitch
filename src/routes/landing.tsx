import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Package,
  TrendingUp,
  FileText,
  ShoppingCart,
  BarChart3,
  ShieldCheck,
  Smartphone,
  Users,
  Zap,
  Receipt,
  KeyRound,
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  Sparkles,
  Rocket,
} from "lucide-react";
import logoUrl from "@/assets/logo.png";
import planoMensal from "@/assets/card-mensal.png.asset.json";
import planoSemestral from "@/assets/card-semestral.png.asset.json";
import planoAnual from "@/assets/card-anual.png.asset.json";
import heroBanner from "@/assets/hero-banner.webp.asset.json";
import footerLogo from "@/assets/footer-logo.png.asset.json";
import { resolveBrandUrl } from "@/lib/brand-assets";

// Absolute CDN URLs — relative "/__l5e/…" paths 404 on external deploys
// (Vercel), installed PWAs and some mobile contexts.
const PLANO_MENSAL_URL = resolveBrandUrl(planoMensal.url)!;
const PLANO_SEMESTRAL_URL = resolveBrandUrl(planoSemestral.url)!;
const PLANO_ANUAL_URL = resolveBrandUrl(planoAnual.url)!;
const HERO_BANNER_URL = resolveBrandUrl(heroBanner.url)!;
const FOOTER_LOGO_URL = resolveBrandUrl(footerLogo.url)!;

export const Route = createFileRoute("/landing")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "CHAVEIRO System — Gestão completa para Chaveiro" },
      {
        name: "description",
        content:
          "Sistema completo para Chaveiro: controle de estoque, vendas, ordens de serviço, recibos em PDF, dashboards e relatórios mensais. Teste agora.",
      },
      { property: "og:title", content: "CHAVEIRO System — Gestão para Chaveiro" },
      {
        property: "og:description",
        content:
          "Precisão, segurança e confiança na gestão do seu Chaveiro. Estoque, vendas, OS e recibos em PDF em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: HERO_BANNER_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: HERO_BANNER_URL },
    ],
  }),
  component: LandingPage,
});

const WA_PHONE = "5551981815780";
const WA_TEXT = encodeURIComponent(
  "Olá! Quero conhecer/testar o CHAVEIRO System.",
);
const WA_URL = `https://wa.me/${WA_PHONE}?text=${WA_TEXT}`;
const WA_ASSINAR_URL = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent("Olá! Quero ASSINAR o CHAVEIRO System!")}`;

// Gold metallic palette
const GOLD = "#C9A227";
const GOLD_LIGHT = "#F4D77A";
const GOLD_DARK = "#8A6A15";
const GOLD_GRADIENT = `linear-gradient(135deg, ${GOLD_DARK} 0%, ${GOLD} 45%, ${GOLD_LIGHT} 55%, ${GOLD} 75%, ${GOLD_DARK} 100%)`;
const GOLD_TEXT: React.CSSProperties = {
  background: GOLD_GRADIENT,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

const LOGO_BLACK: React.CSSProperties = { filter: "brightness(0) saturate(100%)" };
const LOGO_GOLD: React.CSSProperties = {
  filter:
    "brightness(0) saturate(100%) invert(72%) sepia(48%) saturate(600%) hue-rotate(1deg) brightness(95%) contrast(92%)",
};

const features = [
  { icon: Package, title: "Catálogo de Produtos", desc: "Cadastro completo com SKU, fornecedor, preço de compra/venda e estoque em tempo real." },
  { icon: TrendingUp, title: "Movimentações", desc: "Registre entradas e saídas por data, com cálculo automático de lucro e margem." },
  { icon: Receipt, title: "Recibos em PDF", desc: "Emita recibos profissionais com sua marca em um clique — pronto para enviar ao cliente." },
  { icon: ShoppingCart, title: "Ordens de Serviço", desc: "Controle serviços, agendamentos, status e histórico de cada cliente." },
  { icon: FileText, title: "Ordens de Compra", desc: "Gerencie compras junto a fornecedores e mantenha seu estoque sempre em dia." },
  { icon: BarChart3, title: "Dashboards & Relatórios", desc: "Visão diária, mensal e anual de vendas, faturamento e desempenho." },
  { icon: KeyRound, title: "Lista de Preços & Referências", desc: "Consulta rápida de referências e preços — ideal para atendimento no balcão." },
  { icon: Users, title: "Multiusuário & Multi-organização", desc: "Cada organização com sua marca, seus usuários e seus dados isolados." },
  { icon: ShieldCheck, title: "Segurança & PIN", desc: "Proteção com PIN em operações sensíveis e controle de permissões por perfil." },
];

const benefits = [
  "Feito especificamente para chaveiros — sem funções que não servem",
  "Funciona no computador, tablet e celular (PWA instalável)",
  "Dados na nuvem, backup automático e acesso de qualquer lugar",
  "Suporte direto por WhatsApp com o time que desenvolve",
  "Sem instalação: acesse pelo navegador e comece na hora",
  "Atualizações constantes e sem custo adicional",
];

const faq = [
  { q: "Preciso instalar algo no computador?", a: "Não. O sistema roda direto no navegador (Chrome, Edge, Safari). Também pode ser instalado como aplicativo no celular (PWA)." },
  { q: "Meus dados ficam seguros?", a: "Sim. Cada organização tem seus dados isolados, com autenticação, controle de acesso por perfil e backup automático na nuvem." },
  { q: "Posso testar antes de assinar?", a: "Sim. Fale com a gente pelo WhatsApp e liberamos um acesso de teste com todas as funcionalidades." },
  { q: "Quantos usuários posso cadastrar?", a: "Cadastre a equipe toda. Cada colaborador tem seu login, com permissões controladas pelo administrador." },
  { q: "Como funciona a assinatura?", a: "Escolha entre plano mensal ou anual. Renovação e pagamento direto pelo WhatsApp com o suporte." },
];

const pillars = [
  { label: "Precisão", desc: "Cada movimento registrado com exatidão." },
  { label: "Segurança", desc: "Dados isolados, PIN e controle por perfil." },
  { label: "Confiança", desc: "Suporte humano e sistema estável." },
];

export default function LandingPage() {
  const handleCheckout = async (plan: "mensal" | "semestral" | "anual") => {
    try {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: { plan, origin: window.location.origin },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error("URL de checkout não retornada");
    } catch (e) {
      toast.error("Erro ao iniciar checkout", { description: (e as Error).message });
    }
  };


  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#C9A227] selection:text-black">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-6 px-4 py-3">
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#recursos" className="hover:text-white transition">Recursos</a>
            <a href="#beneficios" className="hover:text-white transition">Benefícios</a>
            <a href="#planos" className="hover:text-white transition">Planos</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">Entrar</Button>
            </Link>
            <Link to="/cadastro">
              <Button size="sm" style={{ background: GOLD_GRADIENT, color: "#111" }} className="hover:opacity-90 border-0 font-semibold">
                Testar grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>


      {/* Hero — banner de fundo full-bleed */}
      <section className="relative min-h-[100vh] flex items-start overflow-hidden pt-16">
        <img
          src={HERO_BANNER_URL}
          alt="Oficina de chaveiro profissional"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Overlays para legibilidade */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.1) 100%)",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 20%, transparent 70%, #0a0a0a 100%)" }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-4 pt-4 md:pt-6 pb-16 w-full">
          <div className="max-w-2xl space-y-5">
            <div className="flex items-center gap-3">

              <img
                src={logoUrl}
                alt="CHAVEIRO System"
                className="h-10 w-10 md:h-12 md:w-12 object-contain drop-shadow-[0_0_16px_rgba(255,255,255,0.35)]"
                style={{ filter: "brightness(0) invert(1)" }}
              />
              <span className="text-white leading-none whitespace-nowrap text-2xl md:text-4xl">
                <span className="font-black tracking-[0.12em]">CHAVEIRO</span>{" "}
                <span className="font-light tracking-normal">System</span>
              </span>
            </div>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium tracking-widest uppercase"
              style={{ border: `1px solid ${GOLD}55`, background: "rgba(201,162,39,0.1)", color: GOLD_LIGHT }}
            >
              <Sparkles className="h-3.5 w-3.5" /> Gestão profissional para chaveiros
            </span>


            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.7rem] md:text-xs tracking-[0.35em] font-semibold" style={{ color: GOLD_LIGHT }}>
                <span>PRECISÃO</span>
                <span className="opacity-30">•</span>
                <span>SEGURANÇA</span>
                <span className="opacity-30">•</span>
                <span>CONFIANÇA</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black leading-[0.95] tracking-tight">
                O sistema de <span style={GOLD_TEXT}>Gestão</span> do{" "}
                <span style={GOLD_TEXT}>chaveiro</span>{" "}
                profissional.
              </h1>
            </div>

            <p className="text-lg md:text-xl text-white/70 max-w-xl leading-relaxed">
              Estoque, vendas, ordens de serviço, recibos em PDF e dashboards —
              tudo pensado para o dia a dia do balcão e da oficina.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/cadastro" className="group relative inline-block">
                <span
                  className="absolute -inset-0.5 rounded-md opacity-60 blur-md transition group-hover:opacity-100"
                  style={{ background: GOLD_GRADIENT }}
                  aria-hidden
                />
                <Button
                  size="lg"
                  style={{ background: GOLD_GRADIENT, color: "#111" }}
                  className="relative gap-2 border-0 font-bold tracking-wide text-base h-12 px-7 shadow-lg shadow-black/40 hover:opacity-95"
                >
                  <Rocket className="h-4 w-4" /> Testar grátis por 7 dias
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>

              <a href="#recursos">
                <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white h-12 px-6 gap-2">
                  Ver recursos <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-sm text-white/60">
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" style={{ color: GOLD }} /> Sem instalação</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" style={{ color: GOLD }} /> Roda no celular</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" style={{ color: GOLD }} /> Suporte humano</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pilares */}
      <section className="relative border-y border-white/5 bg-[#0d0d0d]">
        <div className="mx-auto max-w-6xl px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((p, i) => (
            <div key={p.label} className="flex items-start gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-black"
                style={{ background: GOLD_GRADIENT, color: "#111" }}
              >
                0{i + 1}
              </div>
              <div>
                <div className="font-bold tracking-wider text-sm uppercase" style={{ color: GOLD_LIGHT }}>{p.label}</div>
                <div className="text-sm text-white/60 mt-1">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <div className="text-center mb-14 space-y-3">
          <div className="text-xs tracking-[0.3em] font-semibold uppercase" style={{ color: GOLD }}>Recursos</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Tudo o que seu <span style={GOLD_TEXT}>Chaveiro</span> precisa
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Um sistema completo, sem complicação. Cada tela foi desenhada junto com chaveiros de verdade.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <Card
              key={title}
              className="group relative p-6 bg-white/[0.03] border-white/10 hover:border-[#C9A227]/50 transition-all hover:-translate-y-1 text-white overflow-hidden"
            >
              <div
                className="absolute inset-x-0 top-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
              />
              <div
                className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg"
                style={{ background: "rgba(201,162,39,0.12)", color: GOLD_LIGHT }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold mb-1.5">{title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section id="beneficios" className="border-y border-white/5 bg-[#0d0d0d]">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs tracking-[0.3em] font-semibold uppercase mb-3" style={{ color: GOLD }}>Por que escolher</div>
            <h2 className="text-3xl md:text-5xl font-bold mb-5 tracking-tight">
              Deixe as <span className="line-through text-white/30">planilhas</span> para trás
            </h2>
            <p className="text-white/60 mb-8 text-lg">
              Tenha o controle total do seu negócio na palma da mão — do balcão ao dashboard.
            </p>
            <ul className="space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: GOLD }} />
                  <span className="text-white/80">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { Icon: Smartphone, value: "100%", label: "Responsivo" },
              { Icon: ShieldCheck, value: "Seguro", label: "Dados isolados" },
              { Icon: Zap, value: "Rápido", label: "Direto no navegador" },
              { Icon: MessageCircle, value: "Suporte", label: "Via WhatsApp" },
            ].map(({ Icon, value, label }) => (
              <Card
                key={label}
                className="p-6 text-center space-y-2 bg-white/[0.03] border-white/10 hover:border-[#C9A227]/40 text-white transition-all"
              >
                <Icon className="h-8 w-8 mx-auto" style={{ color: GOLD }} />
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-white/60">{label}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <div className="text-center mb-14 space-y-3">
          <div className="text-xs tracking-[0.3em] font-semibold uppercase" style={{ color: GOLD }}>Planos</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Escolha e comece hoje</h2>
          <p className="text-white/60">Fale com a gente pelo WhatsApp para valores atualizados.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="p-8 space-y-4 bg-white/[0.03] border-white/10 text-white">
            <img src={PLANO_MENSAL_URL} alt="Plano Mensal" width={660} height={880} loading="lazy" decoding="async" className="w-full max-w-[220px] h-auto mx-auto rounded-xl shadow-2xl" />
            <h3 className="text-2xl font-bold text-center">Plano Mensal</h3>
            <p className="text-3xl font-bold text-center" style={{ color: GOLD }}>R$ 59,90<span className="text-sm text-white/60 font-normal">/mês</span></p>
            <p className="text-sm text-white/60 text-center">Flexibilidade total. Cancele quando quiser.</p>
            <Button onClick={() => handleCheckout("mensal")} className="w-full h-11" style={{ background: GOLD_GRADIENT, color: "#111", border: 0 }}>Assinar</Button>
          </Card>
          <Card className="p-8 space-y-4 bg-white/[0.03] border-white/10 text-white">
            <img src={PLANO_SEMESTRAL_URL} alt="Plano Semestral" width={660} height={880} loading="lazy" decoding="async" className="w-full max-w-[220px] h-auto mx-auto rounded-xl shadow-2xl" />
            <h3 className="text-2xl font-bold text-center">Plano Semestral</h3>
            <p className="text-3xl font-bold text-center" style={{ color: GOLD }}>R$ 47,90<span className="text-sm text-white/60 font-normal">/mês</span></p>
            <p className="text-sm text-white/60 text-center">Economize pagando a cada 6 meses.</p>
            <Button onClick={() => handleCheckout("semestral")} className="w-full h-11" style={{ background: GOLD_GRADIENT, color: "#111", border: 0 }}>Assinar</Button>
          </Card>
          <Card className="p-8 space-y-4 relative bg-white/[0.05] text-white" style={{ borderColor: GOLD }}>
            <span
              className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold tracking-wider"
              style={{ background: GOLD_GRADIENT, color: "#111" }}
            >
              MAIS ECONÔMICO
            </span>
            <img src={PLANO_ANUAL_URL} alt="Plano Anual" width={660} height={880} loading="lazy" decoding="async" className="w-full max-w-[220px] h-auto mx-auto rounded-xl shadow-2xl" />
            <h3 className="text-2xl font-bold text-center">Plano Anual</h3>
            <p className="text-3xl font-bold text-center" style={{ color: GOLD }}>R$ 39,90<span className="text-sm text-white/60 font-normal">/mês</span></p>
            <p className="text-sm text-white/60 text-center">Pague uma vez e economize durante todo o ano.</p>
            <Button onClick={() => handleCheckout("anual")} className="w-full h-11 hover:opacity-90" style={{ background: GOLD_GRADIENT, color: "#111", border: 0 }}>Assinar</Button>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-white/5 bg-[#0d0d0d]">
        <div className="mx-auto max-w-3xl px-4 py-20 md:py-28">
          <div className="text-center mb-12 space-y-3">
            <div className="text-xs tracking-[0.3em] font-semibold uppercase" style={{ color: GOLD }}>FAQ</div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Perguntas frequentes</h2>
          </div>
          <div className="space-y-3">
            {faq.map(({ q, a }) => (
              <Card key={q} className="p-6 bg-white/[0.03] border-white/10 text-white">
                <h3 className="font-semibold mb-2" style={{ color: GOLD_LIGHT }}>{q}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final com banner de fundo */}
      <section className="relative overflow-hidden">
        <img src={HERO_BANNER_URL} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-black/70 to-[#0a0a0a]" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-4 py-24 md:py-32 text-center space-y-6">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight">
            Pronto para <span style={GOLD_TEXT}>transformar</span> a GESTÃO do seu Chaveiro?
          </h2>
          <p className="text-white/70 max-w-xl mx-auto text-lg">
            Fale com a gente agora e ganhe acesso de teste ao sistema completo. Sem burocracia.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link to="/cadastro">
              <Button size="lg" style={{ background: GOLD_GRADIENT, color: "#111", border: 0 }} className="hover:opacity-90 gap-2 h-12 px-6 font-semibold">
                <Rocket className="h-4 w-4" /> Quero testar agora
              </Button>
            </Link>

            <Link to="/auth">
              <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white h-12 px-6">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black">
        <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/60">
          <div className="flex items-center gap-3">
            <img src={FOOTER_LOGO_URL} alt="CHAVEIRO System" className="h-10 object-contain" />
            <span>© {new Date().getFullYear()} CHAVEIRO System</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="hover:text-white transition">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
