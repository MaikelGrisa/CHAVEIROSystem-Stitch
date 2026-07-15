import { useMemo } from "react";
import { CalendarDays, CalendarRange, CalendarCheck2, CalendarClock } from "lucide-react";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  differenceInCalendarDays,
} from "date-fns";

type Mov = {
  occurred_at: string;
  type: string;
  created_by?: string | null;
  created_at?: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");
const fmtShort = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
const MONTH_NAMES_LONG = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// occurred_at é salvo como meia-noite UTC; usar componentes UTC evita
// que o fuso local desloque a venda para o dia anterior.
function civilDate(occurredAt: string): Date {
  const d = new Date(occurredAt);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function SalesCountSummary({ movements }: { movements: Mov[] }) {
  const now = new Date();

  const { day, week, month, year, weekStart, weekEnd, weekDays, yearDays } = useMemo(() => {
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);
    // Semana completa (domingo a sábado), mesmo que atravesse meses
    const ws = startOfWeek(now, { weekStartsOn: 0 });
    const we = endOfWeek(now, { weekStartsOn: 0 });

    // Itens inseridos no mesmo lote (mesma venda) compartilham created_at + created_by.
    const seen = new Set<string>();
    const monthsWithSales = new Set<number>(); // 0..11 do ano atual
    let day = 0, week = 0, month = 0, year = 0;
    for (const m of movements) {
      if (m.type !== "out") continue;
      const stamp = m.created_at ?? m.occurred_at;
      const saleKey = `${stamp}|${m.created_by ?? ""}`;
      if (seen.has(saleKey)) continue;
      seen.add(saleKey);
      const d = civilDate(m.occurred_at);
      if (d >= dayStart && d <= dayEnd) day++;
      if (d >= ws && d <= we) week++;
      if (d >= monthStart && d <= monthEnd) month++;
      if (d >= yearStart && d <= yearEnd) {
        year++;
        monthsWithSales.add(d.getMonth());
      }
    }
    // dias decorridos (inclusivo até hoje) para médias
    const weekDaysElapsed = Math.min(
      differenceInCalendarDays(now < we ? now : we, ws) + 1,
      differenceInCalendarDays(we, ws) + 1,
    );
    // Ano: somar apenas dias dos meses que tiveram ao menos uma venda,
    // ignorando meses zerados. Mês corrente conta só até hoje.
    const currentMonth = now.getMonth();
    let yearDaysElapsed = 0;
    for (const mIdx of monthsWithSales) {
      if (mIdx === currentMonth) {
        yearDaysElapsed += now.getDate();
      } else if (mIdx < currentMonth) {
        yearDaysElapsed += endOfMonth(new Date(now.getFullYear(), mIdx, 1)).getDate();
      }
    }
    return {
      day, week, month, year,
      weekStart: ws, weekEnd: we,
      weekDays: Math.max(weekDaysElapsed, 1),
      yearDays: Math.max(yearDaysElapsed, 1),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movements]);

  const avgPerDayWeek = week / weekDays;
  const avgPerDayMonth = month / now.getDate();
  const avgPerDayYear = year / yearDays;

  const cards = [
    {
      icon: CalendarDays,
      label: "Hoje",
      caption: fmtShort(now),
      value: day,
      barPct: 100,
      barLabel: `${day} venda${day === 1 ? "" : "s"} hoje`,
      accent: "bg-primary",
    },
    {
      icon: CalendarRange,
      label: "Esta semana",
      caption: `${fmtShort(weekStart)} – ${fmtShort(weekEnd)}`,
      value: week,
      barPct: 100,
      barLabel: `média ${avgPerDayWeek.toFixed(1)}/dia`,
      accent: "bg-primary/70",
    },
    {
      icon: CalendarCheck2,
      label: "Este mês",
      caption: `${MONTH_NAMES_LONG[now.getMonth()]} de ${now.getFullYear()}`,
      value: month,
      barPct: 100,
      barLabel: `média ${avgPerDayMonth.toFixed(1)}/dia`,
      accent: "bg-primary/40",
    },
    {
      icon: CalendarClock,
      label: "Este ano",
      caption: `${now.getFullYear()}`,
      value: year,
      barPct: 100,
      barLabel: `média ${avgPerDayYear.toFixed(1)}/dia`,
      accent: "bg-primary/25",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm p-4 transition-shadow hover:shadow-md"
        >
          <div className={`absolute inset-x-0 top-0 h-1 ${c.accent}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">{c.label}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">{c.caption}</p>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums tracking-tight">{c.value}</span>
            <span className="text-xs text-muted-foreground">venda{c.value === 1 ? "" : "s"}</span>
          </div>
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(c.barPct, 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{c.barLabel}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
