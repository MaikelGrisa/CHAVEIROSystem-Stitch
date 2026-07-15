// Resolve organization brand asset URLs so they work in EVERY context:
// desktop web, installed PWA (standalone), mobile browsers and external
// deployments (e.g. Vercel), where relative "/__l5e/…" asset paths do not
// exist and would silently 404 → wrong/default logo for every tenant.
const LOVABLE_ASSET_HOST =
  "https://project--359fa116-b325-4952-8675-eaaea1ef9d96.lovable.app";

export function resolveBrandUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/__l5e/")) return `${LOVABLE_ASSET_HOST}${trimmed}`;
  // Other relative paths: resolve against the current origin when possible.
  if (trimmed.startsWith("/") && typeof window !== "undefined") {
    return new URL(trimmed, window.location.origin).toString();
  }
  return trimmed;
}
