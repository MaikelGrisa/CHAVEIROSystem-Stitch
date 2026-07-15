import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { geminiTranscribe, isQuotaError, mapGeminiError } from "@/lib/gemini.server";
import { getGeminiApiKeys, getLovableApiKey } from "@/lib/lovable-runtime-env";

const InputSchema = z.object({
  audioBase64: z.string().min(10),
  mimeType: z.string().min(3),
});

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

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

export const Route = createFileRoute("/api/ai-transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const data = InputSchema.parse(await request.json());

          // 1) Gemini com rotação de chaves (gratuito, multimodal)
          const geminiKeys = getGeminiApiKeys(request);
          let geminiQuotaExhausted = false;
          if (geminiKeys.length > 0) {
            try {
              const text = await geminiTranscribe(geminiKeys, data.audioBase64, data.mimeType);
              if (text) return json({ text });
              // texto vazio → tenta fallback
            } catch (error) {
              if (isQuotaError(error)) {
                geminiQuotaExhausted = true;
                console.warn("[api/ai-transcribe] gemini esgotado, tentando fallback Lovable");
              } else {
                const { status, message } = mapGeminiError(error);
                console.error("[api/ai-transcribe] gemini error", status, message);
                return json({ error: message }, { status });
              }
            }
          }

          // 2) Fallback Lovable
          const key = getLovableApiKey(request);
          if (!key) {
            const msg = geminiQuotaExhausted
              ? "Limite gratuito da IA atingido. Aguarde 1 minuto ou adicione outra GEMINI_API_KEY."
              : "Nenhuma chave de IA configurada (defina GEMINI_API_KEY)";
            return json({ error: msg }, { status: geminiQuotaExhausted ? 429 : 500 });
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
            console.error("[api/ai-transcribe] gateway error", res.status, text.slice(0, 500));
            if (res.status === 400 && /audio file might be corrupted or unsupported|invalid_value/i.test(text)) {
              return json({ text: "" });
            }
            if (res.status === 429) return json({ error: "Limite de requisições atingido. Tente em instantes." }, { status: 429 });
            if (res.status === 402) return json({ error: "Créditos de IA esgotados." }, { status: 402 });
            if (res.status === 401 || res.status === 403) return json({ error: "Chave da IA inválida." }, { status: res.status });
            return json({ error: `Falha na transcrição (${res.status}): ${text.slice(0, 200) || "sem detalhes"}` }, { status: 502 });
          }

          const result = (await res.json()) as { text?: string };
          const text = (result.text ?? "").trim();
          if (!text) return json({ error: "Não foi possível entender o áudio. Tente novamente." }, { status: 502 });
          return json({ text });
        } catch (error) {
          console.error("[api/ai-transcribe] error", error);
          const message = error instanceof Error ? error.message : "Falha ao transcrever áudio";
          return json({ error: message }, { status: 500 });
        }
      },
    },
  },
});