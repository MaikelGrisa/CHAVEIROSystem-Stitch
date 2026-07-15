import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { SuccessPopup, patchToastSuccess } from "@/components/SuccessPopup";
import { AlertPopup, patchToastAlerts } from "@/components/AlertPopup";
import { BrandingProvider } from "@/lib/branding";

if (typeof window !== "undefined") { patchToastSuccess(); patchToastAlerts(); }

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço que você tentou acessar não existe.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 glow"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const err = error as { name?: string; message?: string; stack?: string };
  const msg = `${err.name ?? ""} ${err.message ?? ""} ${err.stack ?? ""}`;
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg);
}

const RELOAD_FLAG = "km-chunk-reload-at";
const PWA_CLEANUP_FLAG = "km-pwa-cleanup-v7";

function isAppServiceWorker(url: string) {
  return /\/(sw|service-worker)\.js(?:$|[?#])/i.test(url);
}

function isAppCacheName(name: string) {
  return /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-|workbox|chaveiro|km-/i.test(name);
}

async function cleanupOldPwaState() {
  if (typeof window === "undefined" || sessionStorage.getItem(PWA_CLEANUP_FLAG)) return false;
  sessionStorage.setItem(PWA_CLEANUP_FLAG, "1");
  let needsReload = false;

  try {
    if ("serviceWorker" in navigator) {
      needsReload = Boolean(navigator.serviceWorker.controller);
      const registrations = await navigator.serviceWorker.getRegistrations();
      const appRegistrations = registrations.filter((registration) => {
        const scriptUrl = registration.active?.scriptURL
          || registration.installing?.scriptURL
          || registration.waiting?.scriptURL
          || "";
        return isAppServiceWorker(scriptUrl);
      });
      needsReload = needsReload || appRegistrations.length > 0;
      await Promise.allSettled(
        appRegistrations.map((registration) => registration.unregister()),
      );
    }

    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.allSettled(names.filter(isAppCacheName).map((name) => caches.delete(name)));
    }
  } catch (error) {
    console.warn("[PWA] limpeza de cache antigo falhou", error);
  }

  return needsReload;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });

    // Auto-recover from stale chunk references after a new deploy:
    // cached HTML on mobile/PWA references old hashed assets that 404 →
    // hard reload to fetch the fresh HTML + chunk map. Throttle to once
    // every 30s so we don't loop if the issue isn't actually fixed.
    if (typeof window !== "undefined" && isChunkLoadError(error)) {
      const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
      if (Date.now() - last > 30_000) {
        sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
        window.location.reload();
      }
    }
  }, [error]);

  const stale = isChunkLoadError(error);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {stale
            ? "Detectamos uma atualização do aplicativo. Recarregando para aplicar a versão mais recente…"
            : "Não foi possível carregar essa página. Tente novamente."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.removeItem(RELOAD_FLAG);
                window.location.reload();
              } else {
                router.invalidate();
                reset();
              }
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Recarregar
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Chaveiro System — Gestão para Chaveiros" },
      { name: "description", content: "Sistema completo de gestão de estoque, vendas e relatórios mensais para chaveiros." },
      { name: "theme-color", content: "#000000" },
      { property: "og:title", content: "Chaveiro System — Gestão para Chaveiros" },
      { property: "og:description", content: "Sistema completo de gestão de estoque, vendas e relatórios mensais para chaveiros." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Chaveiro System — Gestão para Chaveiros" },
      { name: "twitter:description", content: "Sistema completo de gestão de estoque, vendas e relatórios mensais para chaveiros." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4a7ea009-1297-44d2-a876-e4007a23f0ec/id-preview-db4002cf--359fa116-b325-4952-8675-eaaea1ef9d96.lovable.app-1782246169148.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4a7ea009-1297-44d2-a876-e4007a23f0ec/id-preview-db4002cf--359fa116-b325-4952-8675-eaaea1ef9d96.lovable.app-1782246169148.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const alreadyReloaded = url.searchParams.has("_pwacleanup");

    cleanupOldPwaState().then((needsReload) => {
      if (alreadyReloaded) {
        url.searchParams.delete("_pwacleanup");
        window.history.replaceState({}, "", url.toString());
        return;
      }

      if (needsReload) {
        url.searchParams.set("_pwacleanup", String(Date.now()));
        window.location.replace(url.toString());
      }
    });
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  // Detecta CSS principal não carregado (HTML em cache no celular/PWA
  // referenciando um bundle CSS com hash antigo que 404). Recarrega uma
  // única vez com cache-bust para buscar o HTML novo.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("_cssfix")) {
      url.searchParams.delete("_cssfix");
      window.history.replaceState({}, "", url.toString());
      return;
    }
    const check = () => {
      const probe = document.createElement("div");
      probe.className = "bg-primary";
      probe.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;";
      document.body.appendChild(probe);
      const bg = getComputedStyle(probe).backgroundColor;
      probe.remove();
      const loaded = bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && bg !== "";
      if (!loaded) {
        const u = new URL(window.location.href);
        u.searchParams.set("_cssfix", String(Date.now()));
        window.location.replace(u.toString());
      }
    };
    const t = window.setTimeout(check, 600);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <Outlet />
        <Toaster richColors position="top-right" />
        <SuccessPopup />
        <AlertPopup />
      </BrandingProvider>
    </QueryClientProvider>
  );
}
