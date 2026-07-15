import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  audioBase64: z.string().min(10),
  mimeType: z.string().min(3),
});

function mimeToExt(mime: string): string {
  const base = mime.split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "audio/webm": "webm",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
    "audio/m4a": "m4a",
    "audio/x-m4a": "m4a",
  };
  return map[base] ?? "webm";
}

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { getLovableApiKey, getGeminiApiKeys } = await import("./lovable-runtime-env");
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();

    // 1) Gemini com rotação (gratuito, multimodal nativo)
    const geminiKeys = getGeminiApiKeys(request);
    let geminiQuotaExhausted = false;
    if (geminiKeys.length > 0) {
      const { geminiTranscribe, mapGeminiError, isQuotaError } = await import("./gemini.server");
      try {
        const text = await geminiTranscribe(geminiKeys, data.audioBase64, data.mimeType);
        if (text) return { text };
      } catch (error) {
        if (isQuotaError(error)) {
          geminiQuotaExhausted = true;
          console.warn("[transcribeAudio] gemini esgotado, tentando fallback Lovable");
        } else {
          const { status, message } = mapGeminiError(error);
          console.error("[transcribeAudio] gemini error", status, message);
          throw new Error(message);
        }
      }
    }

    // 2) Fallback Lovable
    const key = getLovableApiKey(request);
    if (!key) {
      throw new Error(
        geminiQuotaExhausted
          ? "Limite gratuito da IA atingido. Aguarde 1 minuto ou adicione outra GEMINI_API_KEY."
          : "Nenhuma chave de IA configurada (defina GEMINI_API_KEY)",
      );
    }

    const b64 = data.audioBase64.includes(",") ? data.audioBase64.split(",")[1] : data.audioBase64;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ext = mimeToExt(data.mimeType);
    const blob = new Blob([bytes], { type: data.mimeType.split(";")[0] });

    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", blob, `recording.${ext}`);
    form.append("language", "pt");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "direct-fetch" },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[transcribeAudio] gateway error", res.status, text.slice(0, 500));
      if (res.status === 400 && /audio file might be corrupted or unsupported|invalid_value/i.test(text)) {
        return { text: "" };
      }
      if (res.status === 429) throw new Error("Limite de requisições atingido. Tente em instantes.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados.");
      if (res.status === 401 || res.status === 403) throw new Error("Chave da IA inválida.");
      throw new Error(`Falha na transcrição (${res.status}): ${text.slice(0, 200) || "sem detalhes"}`);
    }

    const json = (await res.json()) as { text?: string };
    const text = (json.text ?? "").trim();
    if (!text) throw new Error("Não foi possível entender o áudio. Tente novamente.");
    return { text };
  });

