import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CardBrand = "visa_master" | "other";

export type FeeHistoryRow = {
  effective_date: string; // YYYY-MM-DD
  debit_pct: number;
  credit_pct: number;
  debit_pct_other: number;
  credit_pct_other: number;
  boleto_fee: number; // flat R$ per Boleto sale
};

export function usePaymentFeeHistory() {
  return useQuery({
    queryKey: ["payment-fee-history"],
    queryFn: async (): Promise<FeeHistoryRow[]> => {
      const [histRes, settingsRes] = await Promise.all([
        supabase
          .from("payment_fee_history")
          .select("effective_date,debit_pct,credit_pct,debit_pct_other,credit_pct_other,boleto_fee")
          .order("effective_date", { ascending: true }),
        supabase
          .from("app_settings")
          .select("key,value")
          .in("key", ["debit_fee_pct", "credit_fee_pct", "debit_fee_pct_other", "credit_fee_pct_other", "boleto_fee"]),
      ]);
      if (histRes.error) throw histRes.error;
      if (settingsRes.error) throw settingsRes.error;

      const rows: FeeHistoryRow[] = (histRes.data ?? []).map((r: any) => ({
        effective_date: String(r.effective_date),
        debit_pct: Number(r.debit_pct) || 0,
        credit_pct: Number(r.credit_pct) || 0,
        debit_pct_other: Number(r.debit_pct_other) || 0,
        credit_pct_other: Number(r.credit_pct_other) || 0,
        boleto_fee: Number(r.boleto_fee) || 0,
      }));

      // Fallback: se ainda não há linha "base" no histórico, sintetiza uma a
      // partir das taxas atuais (app_settings) com effective_date bem antigo,
      // para que vendas anteriores ao primeiro save do histórico também
      // computem taxas na Composição de Custos.
      const map: Record<string, string> = {};
      (settingsRes.data ?? []).forEach((r: any) => { map[r.key] = String(r.value ?? ""); });
      const num = (v: string | undefined) => {
        const n = Number(String(v ?? "").replace(",", "."));
        return Number.isFinite(n) ? n : 0;
      };
      const hasBase = rows.some(r => r.effective_date <= "1900-01-02");
      const anyFee = ["debit_fee_pct","credit_fee_pct","debit_fee_pct_other","credit_fee_pct_other","boleto_fee"]
        .some(k => num(map[k]) > 0);
      if (!hasBase && anyFee) {
        rows.unshift({
          effective_date: "1900-01-01",
          debit_pct: num(map["debit_fee_pct"]),
          credit_pct: num(map["credit_fee_pct"]),
          debit_pct_other: num(map["debit_fee_pct_other"]) || num(map["debit_fee_pct"]),
          credit_pct_other: num(map["credit_fee_pct_other"]) || num(map["credit_fee_pct"]),
          boleto_fee: num(map["boleto_fee"]),
        });
      }
      return rows;
    },
  });
}

// Stable hash of the fee history so React Query keys actually change when
// a rate is edited (length alone stays the same when you only update today).
export function feeHistoryVersion(history: FeeHistoryRow[] | undefined): string {
  if (!history || history.length === 0) return "0";
  return history
    .map(r => `${r.effective_date}:${r.debit_pct}:${r.credit_pct}:${r.debit_pct_other}:${r.credit_pct_other}:${r.boleto_fee}`)
    .join("|");
}

function isoDateUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function rowForDate(history: FeeHistoryRow[] | undefined, occurredAt: string | Date): FeeHistoryRow | undefined {
  if (!history || history.length === 0) return undefined;
  let key: string;
  if (typeof occurredAt === "string") {
    key = /^\d{4}-\d{2}-\d{2}/.test(occurredAt) ? occurredAt.slice(0, 10) : isoDateUTC(new Date(occurredAt));
  } else {
    key = isoDateUTC(occurredAt);
  }
  let row: FeeHistoryRow | undefined;
  for (const r of history) {
    if (r.effective_date <= key) row = r;
    else break;
  }
  return row;
}

function normalizeBrand(brand: string | null | undefined): CardBrand {
  return brand === "other" ? "other" : "visa_master";
}

export function feeForDate(
  history: FeeHistoryRow[] | undefined,
  occurredAt: string | Date,
  paymentMethod: string | null | undefined,
  cardBrand?: string | null,
): number {
  if (paymentMethod !== "Débito" && paymentMethod !== "Crédito") return 0;
  const row = rowForDate(history, occurredAt);
  if (!row) return 0;
  const brand = normalizeBrand(cardBrand);
  if (paymentMethod === "Débito") return brand === "other" ? row.debit_pct_other : row.debit_pct;
  return brand === "other" ? row.credit_pct_other : row.credit_pct;
}

export function boletoFeeForDate(
  history: FeeHistoryRow[] | undefined,
  occurredAt: string | Date,
): number {
  const row = rowForDate(history, occurredAt);
  return row?.boleto_fee ?? 0;
}

// Effective unit cost for a movement row (handles old rows with fee baked in).
export function effectiveUnitCost(
  m: { unit_cost?: number | null; unit_price?: number | null; payment_method?: string | null; occurred_at: string; unit_cost_includes_fee?: boolean | null; card_brand?: string | null },
  history: FeeHistoryRow[] | undefined,
): number {
  const base = Number(m.unit_cost ?? 0);
  if (m.unit_cost_includes_fee !== false) return base; // old rows: fee already baked
  const pct = feeForDate(history, m.occurred_at, m.payment_method, m.card_brand);
  return base + Number(m.unit_price ?? 0) * pct / 100;
}

// Extra flat cost applied once per movement row (currently only Boleto).
// Skipped for legacy rows whose unit_cost already bakes in the fee.
export function movementExtraCost(
  m: { payment_method?: string | null; occurred_at: string; unit_cost_includes_fee?: boolean | null },
  history: FeeHistoryRow[] | undefined,
): number {
  if (m.unit_cost_includes_fee === undefined || m.unit_cost_includes_fee === null) return 0;
  if (m.unit_cost_includes_fee !== false) return 0;
  if (m.payment_method !== "Boleto") return 0;
  return boletoFeeForDate(history, m.occurred_at);
}
