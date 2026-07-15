import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SYSTEM_PROMPT } from "@/lib/ai-chat.functions";
import { geminiChat, isQuotaError, mapGeminiError } from "@/lib/gemini.server";
import { getGeminiApiKeys, getLovableApiKey } from "@/lib/lovable-runtime-env";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1),
});

type GatewayMessage = { role: "system" | "user" | "assistant"; content: string };

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

export const Route = createFileRoute("/api/ai-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const data = InputSchema.parse(await request.json());
          const messages: GatewayMessage[] = [
            { role: "system", content: SYSTEM_PROMPT },
            ...data.messages.map((m) => ({ role: m.role, content: m.content })),
          ];

          // 1) Gemini com rotação de chaves + modelos (gratuito)
          const geminiKeys = getGeminiApiKeys(request);
          let geminiQuotaExhausted = false;
          if (geminiKeys.length > 0) {
            try {
              const content = await geminiChat(geminiKeys, messages);
              return json({ content });
            } catch (error) {
              if (isQuotaError(error)) {
                geminiQuotaExhausted = true;
                console.warn("[api/ai-chat] gemini esgotado, tentando fallback Lovable");
              } else {
                const { status, message } = mapGeminiError(error);
                console.error("[api/ai-chat] gemini error", status, message);
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

          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": key,
              "X-Lovable-AIG-SDK": "direct-fetch",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages,
              max_completion_tokens: 4096,
            }),
          });

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.error("[api/ai-chat] gateway error", res.status, text.slice(0, 500));
            if (res.status === 429) return json({ error: "Limite de requisições atingido. Tente novamente em instantes." }, { status: 429 });
            if (res.status === 402) return json({ error: "Créditos de IA esgotados. Adicione créditos para continuar." }, { status: 402 });
            if (res.status === 401 || res.status === 403) return json({ error: "Chave da IA inválida. Contate o suporte." }, { status: res.status });
            return json({ error: `Falha na IA (${res.status}): ${text.slice(0, 200) || "sem detalhes"}` }, { status: 502 });
          }

          const result = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
          const content = result.choices?.[0]?.message?.content?.trim() ?? "";
          if (!content) return json({ error: "Resposta vazia da IA" }, { status: 502 });
          return json({ content });
        } catch (error) {
          console.error("[api/ai-chat] error", error);
          const message = error instanceof Error ? error.message : "Falha ao consultar IA";
          return json({ error: message }, { status: 500 });
        }
      },
    },
  },
});