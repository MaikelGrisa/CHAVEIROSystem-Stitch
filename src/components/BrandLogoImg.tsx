import { useEffect, useState } from "react";
import logoDefault from "@/assets/logo.png";

/**
 * Logo de organização à prova de falhas (PWA/mobile com cache antigo):
 * - Começa exibindo a logo padrão (nunca aparece quebrada).
 * - Pré-carrega a logo da organização em memória; só troca ao concluir com sucesso.
 * - Em PWA/standalone (onde caches antigos de Service Worker costumam servir HTML),
 *   já solicita com cache-bust na primeira tentativa.
 * - Se falhar, tenta novamente com cache-bust; se falhar de novo, permanece na padrão.
 */
export function BrandLogoImg({
  src,
  alt = "",
  className = "",
  fallback = logoDefault,
  scale = 1,
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fallback?: string;
  scale?: number;
}) {
  // Render the organization's own logo directly. Only fall back to the
  // default system logo if the actual load fails (broken URL / offline).
  // NOTE: never start from `fallback` when a real src exists — doing so
  // caused every non-default tenant to briefly (or persistently, in PWA)
  // display the default logo instead of their own.
  const initial = src && src.trim().length > 0 ? src : fallback;
  const [current, setCurrent] = useState<string>(initial);
  const [triedRetry, setTriedRetry] = useState(false);

  useEffect(() => {
    setTriedRetry(false);
    setCurrent(src && src.trim().length > 0 ? src : fallback);
  }, [src, fallback]);

  // Tailwind width tokens (w-N = N * 0.25rem) — extrai a base para reservar
  // espaço proporcional quando a logo é escalada (evita sobreposição com o nome).
  const widthMatch = /(?:^|\s)w-(\d+(?:\.\d+)?)(?:\s|$)/.exec(className);
  const baseRem = widthMatch ? Number(widthMatch[1]) * 0.25 : 0;
  const extraRem = baseRem > 0 ? baseRem * (scale - 1) : 0;

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      loading="eager"
      decoding="async"
      onError={() => {
        // First failure: retry with cache-bust (helps PWA/SW stale caches).
        if (!triedRetry && src && current !== fallback) {
          const sep = src.includes("?") ? "&" : "?";
          setTriedRetry(true);
          setCurrent(`${src}${sep}v=${Date.now()}`);
          return;
        }
        if (current !== fallback) setCurrent(fallback);
      }}
      style={
        scale !== 1
          ? {
              transform: `scale(${scale})`,
              transformOrigin: "left center",
              marginRight: extraRem ? `${extraRem}rem` : undefined,
            }
          : undefined
      }
    />
  );
}
