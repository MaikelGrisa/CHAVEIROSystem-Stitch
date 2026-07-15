import { supabase } from "@/integrations/supabase/client";
import { resolveBrandUrl } from "@/lib/brand-assets";
import logoAsset from "@/assets/logo.png";

export type OrgHeaderInfo = {
  name: string;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  cityState: string | null;
  zip: string | null;
  website: string | null;
  logoDataUrl: string;
  primaryColor: string | null;
};

async function urlToDataUrl(url: string): Promise<string> {
  // Resolve to an absolute URL — relative /__l5e/… paths + a stale Service
  // Worker in PWA mode (or an external deploy domain) can otherwise resolve
  // to cached HTML shells / 404s and silently return "", which used to make
  // every tenant's PDF fall back to the default system logo.
  const resolved = resolveBrandUrl(url) || url;
  const absolute = /^(https?:|data:)/i.test(resolved)
    ? resolved
    : typeof window !== "undefined"
      ? new URL(resolved, window.location.origin).toString()
      : resolved;
  if (absolute.startsWith("data:")) return absolute;
  const attempts = [absolute, `${absolute}${absolute.includes("?") ? "&" : "?"}v=${Date.now()}`];
  for (const u of attempts) {
    try {
      const res = await fetch(u, { cache: "no-store", credentials: "omit" });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) continue;
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(String(r.result || ""));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(blob);
      });
      if (data) return data;
    } catch {
      // try next
    }
  }
  return "";
}

let cache: { orgId: string | null; info: OrgHeaderInfo } | null = null;

try {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
      cache = null;
    }
  });
} catch { /* noop */ }

export async function loadOrgHeaderInfo(): Promise<OrgHeaderInfo> {
  const fallback: OrgHeaderInfo = {
    name: "Chaveiro System",
    cnpj: null,
    phone: null,
    email: null,
    address: null,
    cityState: null,
    zip: null,
    website: null,
    logoDataUrl: await urlToDataUrl(logoAsset),
    primaryColor: null,
  };

  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return fallback;
    const { data: profile } = await supabase
      .from("profiles").select("organization_id").eq("user_id", userData.user.id).maybeSingle();
    const orgId = profile?.organization_id;
    if (!orgId) return fallback;

    if (cache && cache.orgId === orgId) return cache.info;

    const { data: org } = await supabase
      .from("organizations").select("*").eq("id", orgId).maybeSingle();
    if (!org) return fallback;

    const parts: string[] = [];
    if (org.street) parts.push(org.street);
    if (org.neighborhood) parts.push(org.neighborhood);
    const address = parts.join(" - ") || null;
    const cityState = [org.city, org.state].filter(Boolean).join("/") || null;

    let logoDataUrl = fallback.logoDataUrl;
    if (org.logo_url) {
      const d = org.logo_url.startsWith("data:") ? org.logo_url : await urlToDataUrl(org.logo_url);
      if (d) logoDataUrl = d;
    }

    const info: OrgHeaderInfo = {
      name: org.name || "Chaveiro System",
      cnpj: org.cnpj,
      phone: org.phone,
      email: org.email,
      address,
      cityState,
      zip: org.zip,
      website: org.website,
      logoDataUrl,
      primaryColor: (org as { primary_color?: string | null }).primary_color ?? null,
    };
    cache = { orgId, info };
    return info;
  } catch {
    return fallback;
  }
}

export function clearOrgHeaderCache() { cache = null; }
