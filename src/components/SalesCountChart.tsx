import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Range = "day" | "week" | "month" | "year";
type Bucket = { key: string; label: string; fullLabel: string; count: number };

const pad = (n: number) => String(n).padStart(2, "0");
const ymdLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const MONTH_NAMES_LONG = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTH_NAMES_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: date.getUTCFullYear(), week: weekNo };
}

function weeksInIsoYear(year: number): number {
  const dec28 = new Date(Date.UTC(year, 11, 28));
  return isoWeek(dec28).week;
}

// Monday of ISO week
function isoWeekStart(year: number, week: number): Date {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay() || 7;
  const monday = new Date(simple);
  monday.setUTCDate(simple.getUTCDate() - (dow - 1));
  return monday;
}

function buildBuckets(range: Range, selYear: number, selMonth: number, rolling = false): Bucket[] {
  const out: Bucket[] = [];
  if (rolling) {
    const today = new Date();
    if (range === "day") {
      const dt = today;
      out.push({
        key: ymdLocal(dt),
        label: `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}`,
        fullLabel: `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`,
        count: 0,
      });
    } else if (range === "week") {
      const { year: yy, week: ww } = isoWeek(today);
      const start = isoWeekStart(yy, ww);
      out.push({
        key: `${yy}-W${pad(ww)}`,
        label: `S${ww}`,
        fullLabel: `Semana ${ww}/${yy} — início ${pad(start.getUTCDate())}/${pad(start.getUTCMonth() + 1)}`,
        count: 0,
      });
    } else if (range === "month") {
      const y = today.getFullYear();
      const m = today.getMonth();
      out.push({
        key: `${y}-${pad(m + 1)}`,
        label: `${MONTH_NAMES_SHORT[m]}/${String(y).slice(2)}`,
        fullLabel: `${MONTH_NAMES_LONG[m]} de ${y}`,
        count: 0,
      });
    } else {
      const y = today.getFullYear();
      out.push({ key: String(y), label: String(y), fullLabel: `Ano ${y}`, count: 0 });
    }
    return out;
  }
  if (range === "day") {
    const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(selYear, selMonth, d);
      out.push({
        key: ymdLocal(dt),
        label: String(d),
        fullLabel: `${pad(d)}/${pad(selMonth + 1)}/${selYear}`,
        count: 0,
      });
    }
  } else if (range === "week") {
    if (selMonth === -1) {
      const weeks = weeksInIsoYear(selYear);
      for (let w = 1; w <= weeks; w++) {
        const start = isoWeekStart(selYear, w);
        out.push({
          key: `${selYear}-W${pad(w)}`,
          label: `S${w}`,
          fullLabel: `Semana ${w} — início ${pad(start.getUTCDate())}/${pad(start.getUTCMonth() + 1)}`,
          count: 0,
        });
      }
    } else {
      // Semanas ISO que tocam o mês selecionado
      const monthStart = new Date(selYear, selMonth, 1);
      const monthEnd = new Date(selYear, selMonth + 1, 0);
      const seenWeek = new Set<string>();
      for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        const { year, week } = isoWeek(d);
        const k = `${year}-W${pad(week)}`;
        if (seenWeek.has(k)) continue;
        seenWeek.add(k);
        const start = isoWeekStart(year, week);
        out.push({
          key: k,
          label: `S${week}`,
          fullLabel: `Semana ${week}/${year} — início ${pad(start.getUTCDate())}/${pad(start.getUTCMonth() + 1)}`,
          count: 0,
        });
      }
    }
  } else if (range === "month") {
    for (let m = 0; m < 12; m++) {
      out.push({
        key: `${selYear}-${pad(m + 1)}`,
        label: MONTH_NAMES_SHORT[m],
        fullLabel: `${MONTH_NAMES_LONG[m]} de ${selYear}`,
        count: 0,
      });
    }
  } else {
    const currentYear = new Date().getFullYear();
    for (let i = 4; i >= 0; i--) {
      const y = currentYear - i;
      out.push({ key: String(y), label: String(y), fullLabel: `Ano ${y}`, count: 0 });
    }
  }
  return out;
}

function bucketKeyFor(occurredAt: string, range: Range): string {
  // occurred_at é salvo como meia-noite UTC; usar os componentes UTC evita
  // que o fuso local desloque a venda para o dia anterior.
  const raw = new Date(occurredAt);
  const d = new Date(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate());
  if (range === "day") return ymdLocal(d);
  if (range === "week") {
    const { year, week } = isoWeek(d);
    return `${year}-W${pad(week)}`;
  }
  if (range === "month") return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  return String(d.getFullYear());
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const p = item.payload as Bucket;
  const n = Number(item.value) || 0;
  if (n === 0) return null;
  return (
    <div className="rounded-md border border-border bg-background/95 backdrop-blur px-3 py-2 shadow-xl text-xs pointer-events-none">
      <div className="font-medium text-foreground">{p.fullLabel}</div>
      <div className="text-muted-foreground mt-0.5">
        <span className="font-semibold text-primary">{n}</span> venda{n === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export function SalesCountChart({
  movements,
  title = "Quantidade de Vendas",
  compact = false,
  fixedRange,
}: {
  movements?: Array<{ occurred_at: string; type: string; created_by?: string | null; created_at?: string | null }>;
  title?: string;
  compact?: boolean;
  fixedRange?: Range;
}) {
  const now = new Date();
  const [range, setRange] = useState<Range>(fixedRange ?? "day");
  const [selYear, setSelYear] = useState<number>(now.getFullYear());
  const [selMonth, setSelMonth] = useState<number>(now.getMonth());
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { data: fetched } = useQuery({
    queryKey: ["sales-count-movs"],
    enabled: !movements,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movements")
        .select("occurred_at,type,created_by,created_at")
        .eq("type", "out")
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return data as Array<{ occurred_at: string; type: string; created_by: string | null; created_at: string }>;
    },
  });

  const source = movements ?? fetched ?? [];

  const data = useMemo(() => {
    const buckets = buildBuckets(range, selYear, selMonth, !!fixedRange);
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    // Items inserted in the same batch (mesma venda) share created_at + created_by.
    // occurred_at é apenas a data escolhida, então não serve para agrupar.
    const seen = new Set<string>();
    for (const m of source) {
      if (m.type !== "out") continue;
      const stamp = (m as any).created_at ?? m.occurred_at;
      const saleKey = `${stamp}|${m.created_by ?? ""}`;
      if (seen.has(saleKey)) continue;
      seen.add(saleKey);
      const k = bucketKeyFor(m.occurred_at, range);
      const i = idx.get(k);
      if (i !== undefined) buckets[i].count += 1;
    }
    return buckets;
  }, [source, range, selYear, selMonth, fixedRange]);

  // Com fixedRange, o total obedece ao critério do gráfico: hoje / semana atual / mês atual / ano atual
  // (último bucket da janela rolante). Sem fixedRange, soma todos os buckets exibidos.
  const total = fixedRange ? (data[data.length - 1]?.count ?? 0) : data.reduce((s, b) => s + b.count, 0);
  const totalLabel = fixedRange === "day" ? "Hoje" : fixedRange === "week" ? "Esta semana" : fixedRange === "month" ? "Este mês" : fixedRange === "year" ? "Este ano" : "Total";
  const currentYear = now.getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);
  const xTickInterval = range === "day" ? 2 : range === "week" ? (selMonth === -1 ? 3 : 0) : 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h3 className={compact ? "text-sm font-semibold" : "text-base font-semibold"}>{title}</h3>
          <p className="text-[11px] text-muted-foreground">
            {totalLabel}: <span className="font-semibold text-foreground">{total}</span> venda{total === 1 ? "" : "s"}
          </p>
        </div>
        {!fixedRange && (
        <div className="flex items-center gap-2 flex-wrap">
          {(range === "day" || range === "week") && (
            <Select value={String(selMonth)} onValueChange={(v) => setSelMonth(Number(v))}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {range === "week" && (
                  <SelectItem value="-1" className="text-xs">Todos os meses</SelectItem>
                )}
                {MONTH_NAMES_LONG.map((n, i) => (
                  <SelectItem key={i} value={String(i)} className="text-xs">{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(range === "day" || range === "week" || range === "month") && (
            <Select value={String(selYear)} onValueChange={(v) => setSelYear(Number(v))}>
              <SelectTrigger className="h-8 w-[90px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="inline-flex rounded-md border border-border bg-secondary/40 p-0.5">
            {(["day", "week", "month", "year"] as Range[]).map(r => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "default" : "ghost"}
                className="h-7 px-2.5 text-[11px]"
                onClick={() => setRange(r)}
              >
                {r === "day" ? "Diário" : r === "week" ? "Semanal" : r === "month" ? "Mensal" : "Anual"}
              </Button>
            ))}
          </div>
        </div>
        )}
      </div>
      <div className={compact ? "h-52" : "h-72"}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 50)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="oklch(0.45 0.02 50)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval={xTickInterval}
            />
            <YAxis stroke="oklch(0.45 0.02 50)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
            <Tooltip
              content={<CustomTooltip />}
              cursor={false}
              wrapperStyle={{ outline: "none", zIndex: 50 }}
              allowEscapeViewBox={{ x: true, y: true }}
            />
            <Bar
              dataKey="count"
              name="Vendas"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              onMouseEnter={(_, idx) => {
                if (data[idx]?.count > 0) setHoverIdx(idx);
              }}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {data.map((entry, i) => {
                const isEmpty = entry.count === 0;
                const isHovered = hoverIdx === i;
                const dimmed = hoverIdx !== null && !isHovered;
                const fill = isEmpty
                  ? "color-mix(in oklch, var(--muted-foreground) 22%, transparent)"
                  : dimmed
                    ? "color-mix(in oklch, var(--primary) 18%, transparent)"
                    : "var(--primary)";
                return <Cell key={entry.key} fill={fill} style={{ transition: "fill 150ms" }} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
