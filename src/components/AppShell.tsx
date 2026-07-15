import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, DollarSign, LogOut, HelpCircle, Shield, ClipboardList, Search, NotebookPen, Menu, X } from "lucide-react";
import { PriceLookupDialog } from "./PriceLookupDialog";
import { useEffect, useState, type ReactNode, type ComponentType } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TutorialOverlay } from "./TutorialOverlay";
import { MascotKey } from "./MascotKey";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/lib/useRole";
import { AiAssistant } from "./AiAssistant";
import logoDefault from "@/assets/logo.png";
import systemLogo from "@/assets/system-logo-local.png";
import { useBranding } from "@/lib/branding";
import { BrandLogoImg } from "./BrandLogoImg";
const logoUrl = logoDefault;

type NavEntry = {
  to?: string;
  label: string;
  short: string;
  icon: ComponentType<{ className?: string }>;
  useLogoMask?: boolean;
  tip?: string;
  onClick?: "priceLookup" | "tutorial" | "admin" | "user" | "signout";
  adminOnly?: boolean;
  userOnly?: boolean;
};

const NAV: NavEntry[] = [
  { to: "/movimentacoes", label: "Vendas/Serviços", short: "Vendas", icon: DollarSign, useLogoMask: true, tip: "Registre suas vendas e entradas de estoque." },
  { to: "/ordens", label: "OS/Orçamentos", short: "OS", icon: ClipboardList, useLogoMask: true, tip: "Crie Ordens de Serviço e Orçamentos." },
  { to: "/dashboard", label: "Dashboard", short: "Dash", icon: LayoutDashboard, useLogoMask: true, tip: "Resumo do seu negócio em tempo real." },
];

const EXTRAS: NavEntry[] = [
  { label: "Consulta Preços", short: "Preços", icon: Search, onClick: "priceLookup" },
  { to: "/ordem-compra", label: "Lista de Compras", short: "Compras", icon: NotebookPen },
];

const ADMIN_PIN_RETURN_PATHS = ["/produtos", "/referencias", "/balanco"];
const ADMIN_FLOW_PATHS = ["/admin", ...ADMIN_PIN_RETURN_PATHS];
const ADMIN_RETURN_KEY = "adm-return-allowed";
const ADMIN_RETURN_AT_KEY = "adm-return-allowed-at";
const REALTIME_TABLES = [
  "movements",
  "service_orders",
  "products",
  "product_references",
  "expenses",
  "receipts",
  "customers",
  "app_settings",
  "purchase_list_items",
] as const;

function MaskIcon({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`bg-current shrink-0 ${className}`}
      style={{
        WebkitMaskImage: `url(${logoUrl})`,
        maskImage: `url(${logoUrl})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const { logoUrl: brandLogo, displayName, logoScale } = useBranding();
  const [tutorial, setTutorial] = useState(false);
  const [priceLookup, setPriceLookup] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSide, setMenuSide] = useState<"left" | "right" | "right-desktop">("right");

  useEffect(() => {
    const channel = supabase.channel("app-global-db-sync");

    REALTIME_TABLES.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () =>
        queryClient.invalidateQueries(),
      );
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      if (isMobile) {
        document.documentElement.classList.remove("dark");
        return;
      }
      const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
      const initialTheme = savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      if (initialTheme === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    };
    apply();
    const mq = window.matchMedia("(max-width: 767px)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("km-tutorial-done")) {
      setTutorial(true);
      localStorage.setItem("km-tutorial-done", "1");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isAdminFlowPath = ADMIN_FLOW_PATHS.some((path) => loc.pathname === path || loc.pathname.startsWith(`${path}/`));
    if (!isAdminFlowPath) {
      sessionStorage.removeItem(ADMIN_RETURN_KEY);
      localStorage.removeItem(ADMIN_RETURN_AT_KEY);
      sessionStorage.removeItem("adm-pin-unlocked");
      sessionStorage.removeItem("adm-last-path");
    }
  }, [loc.pathname]);

  // close mobile drawer on route change
  useEffect(() => { setMenuOpen(false); }, [loc.pathname]);

  async function signOut() {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("adm-unlocked");
    }
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function handleAction(entry: NavEntry) {
    switch (entry.onClick) {
      case "priceLookup": setPriceLookup(true); break;
      case "tutorial": setTutorial(true); break;
      case "admin": navigate({ to: "/admin" }); break;
      case "user": navigate({ to: "/usuario" }); break;
      case "signout": signOut(); break;
    }
  }

  const currentTip = NAV.find(n => n.to && loc.pathname.startsWith(n.to))?.tip;

  // Full nav for mobile drawer + bottom bar
  const allMobile: NavEntry[] = [
    ...NAV,
    ...EXTRAS,
    { label: "Tutorial", short: "Tutorial", icon: HelpCircle, onClick: "tutorial" },
    isAdmin
      ? { label: "ADM", short: "ADM", icon: Shield, onClick: "admin" }
      : { label: "Usuário", short: "Usuário", icon: Shield, onClick: "user" },
    { label: "Sair", short: "Sair", icon: LogOut, onClick: "signout" },
  ];

  function renderEntryButton(n: NavEntry, variant: "drawer" | "bottom") {
    const active = !!(n.to && loc.pathname.startsWith(n.to));
    const Icon = n.icon;
    const iconNode = n.useLogoMask
      ? <MaskIcon className={variant === "bottom" ? "size-5" : "size-5"} />
      : <Icon className={variant === "bottom" ? "size-5" : "size-5"} />;

    const className = variant === "bottom"
      ? `flex shrink-0 flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[10px] leading-tight min-w-[58px] ${active ? "text-primary" : "text-muted-foreground"}`
      : `flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${active ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-accent"}`;

    const label = variant === "bottom" ? n.short : n.label;
    const content = <>{iconNode}<span className="whitespace-nowrap">{label}</span></>;

    if (n.to) {
      return <Link key={n.label} to={n.to} className={className}>{content}</Link>;
    }
    return <button key={n.label} type="button" onClick={() => handleAction(n)} className={className}>{content}</button>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar h-full overflow-y-auto">
        <div
          className="fixed inset-y-0 left-0 w-64 z-0 opacity-50 pointer-events-none"
          style={{
            backgroundImage: `url('https://api.freelovable.com.br/storage/v1/object/public/anexos/ccaa94ec-75df-4e77-835f-b5b64b4100a1.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="relative z-10 flex flex-col h-full p-4">
          <Link to="/dashboard" className="flex items-center gap-3 px-2 py-3 border-b border-sidebar-border/50">
            <BrandLogoImg src={brandLogo} alt={displayName} className="w-10" scale={logoScale} />
            <div>
              <div className="text-lg font-bold leading-tight">{displayName}</div>
            </div>
          </Link>
          <nav className="mt-6 space-y-1">
            {NAV.map(n => {
              const active = loc.pathname.startsWith(n.to!);
              return (
                <Link
                  key={n.to} to={n.to!}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "text-primary" : "text-sidebar-foreground hover:text-primary/80"}`}
                >
                  <MaskIcon className="size-5" />
                  {n.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setPriceLookup(true)}
              className="group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition text-sidebar-foreground hover:text-primary/80"
            >
              <Search className="size-5 shrink-0" />
              Consulta Preços
            </button>
            <Link
              to="/ordem-compra"
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${loc.pathname.startsWith("/ordem-compra") ? "text-primary" : "text-sidebar-foreground hover:text-primary/80"}`}
            >
              <NotebookPen className="size-5 shrink-0" />
              Lista de Compras
            </Link>
          </nav>
          <div className="mt-auto space-y-2 pt-1 pb-2">
            <div className="flex justify-center pt-0 pb-0">
              <MascotKey tip={currentTip} size={158} />
            </div>
            <div className="space-y-1 border-t border-sidebar-border pt-1">
              <Button variant="ghost" size="sm" onClick={() => setTutorial(true)} className="w-full justify-start gap-2 h-7 px-2 text-xs">
                <HelpCircle className="size-3" /> Tutorial
              </Button>
              {isAdmin ? (
                <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin" })} className="w-full justify-start gap-2 h-7 px-2 text-xs text-black dark:text-black hover:text-black">
                  <Shield className="size-3" /> ADM
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/usuario" })} className="w-full justify-start gap-2 h-7 px-2 text-xs text-black dark:text-black hover:text-black">
                  <Shield className="size-3" /> Usuário
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 h-7 px-2 text-xs">
                <LogOut className="size-3" /> Sair
              </Button>
            </div>
            <div className="flex justify-start pt-8 pl-1">
              <img
                src={systemLogo}
                alt=""
                aria-hidden="true"
                className="h-6 w-auto opacity-75 select-none pointer-events-none"
              />
            </div>
          </div>

        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        <header className="flex-none flex items-center justify-between border-b border-border bg-background/80 backdrop-blur px-4 py-3 z-20">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <BrandLogoImg src={brandLogo} alt="" className="w-8 shrink-0" scale={logoScale} />
            <span className="font-bold truncate">{displayName}</span>
          </div>
          <AiAssistant />
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-clip px-3 sm:px-4 md:px-8 py-0 relative pb-8">
          {children}
        </div>

        {/* Floating mascot (mobile - right) */}
        <div className="md:hidden fixed bottom-20 right-3 z-30 pointer-events-none">
          <div className="pointer-events-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]">
            <MascotKey tip={currentTip} size={72} />
          </div>
        </div>

        {/* Floating menu button (mobile - right) */}
        <button
          type="button"
          onClick={() => { setMenuSide("right"); setMenuOpen(true); }}
          aria-label="Abrir menu"
          className="md:hidden fixed bottom-4 right-4 z-30 size-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 flex items-center justify-center active:scale-95 transition"
        >
          <Menu className="size-6" />
        </button>

        {/* Floating mascot (desktop - right) */}
        <div className="hidden md:block fixed bottom-20 right-3 z-30 pointer-events-none">
          <div className="pointer-events-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]">
            <MascotKey tip={currentTip} size={72} />
          </div>
        </div>

        {/* Floating menu button (desktop - right) */}
        <button
          type="button"
          onClick={() => { setMenuSide("right-desktop"); setMenuOpen(true); }}
          aria-label="Abrir menu"
          className="hidden md:flex fixed bottom-4 right-4 z-30 size-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 items-center justify-center active:scale-95 transition"
        >
          <Menu className="size-6" />
        </button>


        {/* Drawer (full menu) */}
        {menuOpen && (() => {
          const isDesktop = menuSide === "right-desktop";
          const mainEntries = isDesktop ? allMobile.slice(0, allMobile.length - 3) : allMobile;
          const footerEntries = isDesktop ? allMobile.slice(-3) : [];
          return (
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}>
              <div className="absolute inset-0 bg-black/50" />
              <div
                className="absolute right-0 top-0 h-full w-72 max-w-[85%] bg-sidebar shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <BrandLogoImg src={brandLogo} alt={displayName} className="w-8 shrink-0" scale={logoScale} />
                    <span className="font-bold truncate">{displayName}</span>
                  </div>
                  <button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar" className="p-1 rounded-md hover:bg-accent">
                    <X className="size-5" />
                  </button>
                </div>
                <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                  {mainEntries.map(n => renderEntryButton(n, "drawer"))}
                </nav>
                {isDesktop && (
                  <div className="px-3 pb-3 space-y-1 border-t border-sidebar-border pt-2">
                    {footerEntries.map(n => renderEntryButton(n, "drawer"))}
                  </div>
                )}
                <div className="flex justify-start px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-sidebar-border">
                  <img
                    src={systemLogo}
                    alt=""
                    aria-hidden="true"
                    className="h-6 w-auto opacity-75 select-none pointer-events-none"
                  />
                </div>
              </div>
            </div>
          );
        })()}
      </main>

      <TutorialOverlay open={tutorial} onClose={() => setTutorial(false)} />
      <PriceLookupDialog open={priceLookup} onOpenChange={setPriceLookup} />
    </div>
  );
}
