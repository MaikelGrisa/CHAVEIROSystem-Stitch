import { createStart, createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { ensureSupabaseEnv } from "./lib/lovable-runtime-env";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Garante que as variáveis do backend (SUPABASE_URL etc.) estejam disponíveis
// em process.env antes de qualquer handler — inclusive no ambiente do worker
// publicado, onde elas podem não ser injetadas automaticamente.
const runtimeEnvMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    ensureSupabaseEnv(getRequest());
  } catch {
    ensureSupabaseEnv();
  }
  return next();
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Também roda antes de cada server function (antes do requireSupabaseAuth).
const ensureEnvFnMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    try {
      ensureSupabaseEnv(getRequest());
    } catch {
      ensureSupabaseEnv();
    }
    return next();
  },
);

export const startInstance = createStart(() => ({
  functionMiddleware: [ensureEnvFnMiddleware, attachSupabaseAuth],
  requestMiddleware: [runtimeEnvMiddleware, errorMiddleware],
}));
