// Helper para chamar a API do Google Gemini (tier gratuito).
// Funciona em qualquer runtime (Lovable, Vercel, Node, Workers).
// - Suporta múltiplas chaves (rotação automática em 429)
// - Tenta primeiro modelo "lite" (mais leve), faz fallback para flash

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Ordem de tentativa: lite (maior throughput/menor custo) → flash → flash 2.0
const CHAT_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];

// Para transcrição preferimos flash (melhor qualidade multimodal)
const STT_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

type ChatRole = "system" | "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

export class GeminiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "GeminiError";
  }
}

function toGeminiContents(messages: ChatMessage[]): {
  systemInstruction?: { parts: { text: string }[] };
  contents: GeminiContent[];
} {
  const systemTexts: string[] = [];
  const contents: GeminiContent[] = [];
  for (const m of messages) {
    if (m.role === "system") {
      systemTexts.push(m.content);
      continue;
    }
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    });
  }
  return {
    systemInstruction: systemTexts.length
      ? { parts: [{ text: systemTexts.join("\n\n") }] }
      : undefined,
    contents,
  };
}

async function callGemini(
  apiKey: string,
  model: string,
  body: unknown,
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  try {
    // Usa header x-goog-api-key: funciona tanto para chaves antigas (AIzaSy...)
    // quanto para as novas auth keys (AQ.Ab...). Query string ?key= só serve
    // para as antigas e quebra com o novo formato.
    const res = await fetch(
      `${GEMINI_BASE}/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, message: text.slice(0, 300) || `HTTP ${res.status}` };
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p) => p.text ?? "").join("").trim();
    return { ok: true, text };
  } catch (e) {
    return { ok: false, status: 0, message: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Tenta executar uma chamada Gemini com rotação automática de chaves e modelos
 * em caso de rate limit (429) ou cota esgotada.
 * Retorna o texto ou lança GeminiError com o último status observado.
 */
async function tryGeminiWithRotation(
  apiKeys: string[],
  models: string[],
  body: unknown,
): Promise<string> {
  let lastStatus = 0;
  let lastMessage = "Sem chaves Gemini disponíveis";

  for (const model of models) {
    for (const key of apiKeys) {
      const result = await callGemini(key, model, body);
      if (result.ok) {
        if (!result.text) {
          lastStatus = 502;
          lastMessage = "Resposta vazia da IA";
          continue;
        }
        return result.text;
      }
      lastStatus = result.status;
      lastMessage = result.message;
      // Só tenta próxima chave/modelo se for limite/cota; outros erros param na hora
      if (result.status !== 429 && result.status !== 403 && result.status !== 503) {
        throw new GeminiError(result.status, result.message);
      }
    }
  }
  throw new GeminiError(lastStatus || 502, lastMessage);
}

export async function geminiChat(apiKeys: string | string[], messages: ChatMessage[]): Promise<string> {
  const keys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
  const { systemInstruction, contents } = toGeminiContents(messages);
  return tryGeminiWithRotation(keys, CHAT_MODELS, {
    systemInstruction,
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
  });
}

export async function geminiTranscribe(
  apiKeys: string | string[],
  audioBase64: string,
  mimeType: string,
): Promise<string> {
  const keys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
  const cleanB64 = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64;
  const cleanMime = mimeType.split(";")[0].trim();
  return tryGeminiWithRotation(keys, STT_MODELS, {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Transcreva este áudio para texto em português do Brasil. Responda APENAS com o texto transcrito, sem comentários, sem aspas, sem prefixos.",
          },
          { inlineData: { mimeType: cleanMime, data: cleanB64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0, maxOutputTokens: 2048 },
  });
}

export function mapGeminiError(error: unknown): { status: number; message: string } {
  const status = (error as { status?: number })?.status ?? 502;
  const raw = error instanceof Error ? error.message : String(error);
  if (status === 429) return { status: 429, message: "Limite de requisições atingido. Tente novamente em instantes." };
  if (status === 402) return { status: 402, message: "Cota da IA esgotada." };
  if (status === 401 || status === 403) return { status, message: "Chave da IA inválida. Verifique GEMINI_API_KEY." };
  return { status, message: raw };
}

export function isQuotaError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  return status === 429 || status === 402 || status === 503;
}
