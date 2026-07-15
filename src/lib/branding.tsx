import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveBrandUrl } from "@/lib/brand-assets";
import logoDefault from "@/assets/logo.png";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  street: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  logo_url: string | null;
  primary_color: string | null;
  stock_control_enabled?: boolean | null;
};

type BrandingContextValue = {
  org: Organization | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logoUrl: string;
  displayName: string;
  logoScale: number;
};

const BrandingContext = createContext<BrandingContextValue>({
  org: null,
  loading: true,
  refresh: async () => {},
  logoUrl: logoDefault,
  displayName: "Chaveiro System",
  logoScale: 1,
});

// Ajustes visuais por organização (independentes do layout — usam transform: scale)
const ORG_LOGO_SCALE: Record<string, number> = {
  "6e7a9f4d-494e-4d85-8a39-ffb97751b859": 1.5, // GRISA Chaveiro
  "5d6e33e2-9bbf-4f1b-99a4-f3849be5a3eb": 2,   // RT Chaves (100% maior)
};


function normalizeHex(input: string): string | null {
  const s = input.trim();
  const m = /^#?([a-f\d]{6})$/i.exec(s);
  if (!m) return null;
  return `#${m[1].toLowerCase()}`;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setOrg(null); setLoading(false); return; }
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const orgId = profile?.organization_id;
    if (!orgId) { setOrg(null); setLoading(false); return; }
    const { data: orgRow } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .maybeSingle();
    setOrg(orgRow as Organization | null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void load();
      }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // Apply primary color to CSS vars — use hex directly (best cross-browser
  // compatibility with color-mix, especially on iOS Safari / PWA).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const hex = normalizeHex(org?.primary_color ?? "");
    const keys = ["--primary", "--ring", "--accent", "--sidebar-primary", "--sidebar-ring"];
    if (!hex) {
      keys.forEach((k) => root.style.removeProperty(k));
      root.style.removeProperty("--primary-foreground");
      root.style.removeProperty("--accent-foreground");
      return;
    }
    keys.forEach((k) => root.style.setProperty(k, hex));
    root.style.setProperty("--primary-foreground", "#ffffff");
    root.style.setProperty("--accent-foreground", "#ffffff");
  }, [org?.primary_color]);


  const value = useMemo<BrandingContextValue>(() => ({
    org,
    loading,
    refresh: load,
    logoUrl: resolveBrandUrl(org?.logo_url) || logoDefault,
    displayName: org?.name || "Chaveiro System",
    logoScale: (org?.id && ORG_LOGO_SCALE[org.id]) || 1,
  }), [org, loading]);


  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
