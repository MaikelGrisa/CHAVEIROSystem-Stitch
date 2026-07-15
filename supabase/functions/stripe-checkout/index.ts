// Stripe Checkout (BYOK) — cria sessão de assinatura para os planos Mensal/Semestral/Anual
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Plan = "mensal" | "semestral" | "anual";

const PRICE_IDS: Record<Plan, string> = {
  mensal:    "price_1Tt6MgQZ3lgly28eI4y3fbR5",
  semestral: "price_1Tt6RsQZ3lgly28eoChhwBXc",
  anual:     "price_1Tt6SlQZ3lgly28ezXCZmPMT",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const key = Deno.env.get("STRIPE_SECRET_KEY");
    if (!key) return json({ error: "STRIPE_SECRET_KEY não configurada" }, 500);

    const { plan, origin } = (await req.json()) as { plan: Plan; origin?: string };
    const price = PRICE_IDS[plan];
    if (!price) return json({ error: "Plano inválido" }, 400);

    const stripe = new Stripe(key, { apiVersion: "2024-11-20.acacia" });
    const baseUrl = origin || req.headers.get("origin") || "";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      success_url: `${baseUrl}/?checkout=success`,
      cancel_url:  `${baseUrl}/?checkout=cancel`,
      allow_promotion_codes: true,
    });

    return json({ url: session.url });
  } catch (e) {
    console.error("stripe-checkout error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
