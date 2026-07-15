import process from "node:process";

type RuntimeEnv = Record<string, unknown>;
type RuntimeRequest = Request & {
  runtime?: {
    cloudflare?: {
      env?: RuntimeEnv;
    };
  };
};

type GlobalWithRuntimeEnv = typeof globalThis & {
  __lovableRuntimeEnv?: RuntimeEnv;
};

function asString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function bindRuntimeEnv(env: unknown) {
  if (!env || typeof env !== "object") return;
  const runtimeEnv = env as RuntimeEnv;
  (globalThis as GlobalWithRuntimeEnv).__lovableRuntimeEnv = runtimeEnv;
  for (const [key, value] of Object.entries(runtimeEnv)) {
    const stringValue = asString(value);
    if (stringValue) process.env[key] = stringValue;
  }
}

export function getRuntimeSecret(name: string, request?: Request) {
  const fromProcess = asString(process.env[name]);
  if (fromProcess) return fromProcess;

  const runtimeRequest = request as RuntimeRequest | undefined;
  const fromRequest = asString(runtimeRequest?.runtime?.cloudflare?.env?.[name]);
  if (fromRequest) return fromRequest;

  return asString((globalThis as GlobalWithRuntimeEnv).__lovableRuntimeEnv?.[name]);
}

/**
 * Fallbacks estáticos injetados no build (valores públicos — URL e chave
 * publishable). Garantem que o backend funcione mesmo quando o ambiente
 * de execução não expõe as variáveis via process.env.
 */
const SUPABASE_ENV_FALLBACKS: Record<string, string | undefined> = {
  SUPABASE_URL: import.meta.env?.VITE_SUPABASE_URL as string | undefined,
  SUPABASE_PUBLISHABLE_KEY: import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
  SUPABASE_PROJECT_ID: import.meta.env?.VITE_SUPABASE_PROJECT_ID as string | undefined,
};

/**
 * Garante que process.env tenha SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY antes
 * de qualquer middleware/handler que dependa delas (ex.: requireSupabaseAuth).
 * Ordem: process.env → env do worker (request/globalThis) → fallback do build.
 */
export function ensureSupabaseEnv(request?: Request) {
  const runtimeRequest = request as RuntimeRequest | undefined;
  const requestEnv = runtimeRequest?.runtime?.cloudflare?.env;
  if (requestEnv) bindRuntimeEnv(requestEnv);

  for (const [name, fallback] of Object.entries(SUPABASE_ENV_FALLBACKS)) {
    if (asString(process.env[name])) continue;
    const value = getRuntimeSecret(name, request) ?? asString(fallback);
    if (value) process.env[name] = value;
  }
}


export function getLovableApiKey(request?: Request) {
  return getRuntimeSecret("LOVABLE_API_KEY", request);
}

export function getGeminiApiKey(request?: Request) {
  return getGeminiApiKeys(request)[0];
}

/**
 * Retorna TODAS as chaves Gemini disponíveis (suporta múltiplas separadas por vírgula).
 * Permite rotação automática em caso de rate limit (429).
 */
export function getGeminiApiKeys(request?: Request): string[] {
  const raw =
    getRuntimeSecret("GEMINI_API_KEYS", request) ??
    getRuntimeSecret("GEMINI_API_KEY", request) ??
    getRuntimeSecret("GOOGLE_API_KEY", request) ??
    getRuntimeSecret("GOOGLE_GENERATIVE_AI_API_KEY", request);
  if (!raw) return [];
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 10);
}