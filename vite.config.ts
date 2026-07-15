// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Force-on nitro with the Vercel preset for self-deploys on Vercel.
// Inside Lovable's sandbox the preset is overridden to Cloudflare automatically,
// so this only affects external (Vercel) builds. The Vercel preset writes the
// Build Output API to .vercel/output/, which Vercel auto-detects (no vercel.json needed).
export default defineConfig({
  nitro: { preset: "vercel" },
});
