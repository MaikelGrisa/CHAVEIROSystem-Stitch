import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import logoUrl from "@/assets/logo.png";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUpRight, PieChart, Calendar, Printer, Eye, EyeOff, Pencil } from "lucide-react";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from "recharts";
import { usePaymentFeeHistory, effectiveUnitCost, feeHistoryVersion, movementExtraCost, feeForDate, boletoFeeForDate } from "@/lib/payment-fees";
import { SalesCountSummary } from "@/components/SalesCountSummary";

export const Route = createFileRoute("/_authenticated/movimentacoes")({
  component: MovsPage,
});

function localYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isToday(ymd: string) {
  return ymd === localYMD(new Date());
}
function isSameLocalDay(occurredAt: string, ymd: string) {
  return localYMD(new Date(occurredAt)) === ymd;
}

function MovsPage() {
  const qc = useQueryClient();
  const [dateFilter, setDateFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [hideTotals, setHideTotals] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editMov, setEditMov] = useState<any | null>(null);
  const [pinPromptId, setPinPromptId] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");


  useEffect(() => {
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "movements" },
        () => {
          qc.invalidateQueries({ queryKey: ["all-movs"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const { data: feeHistory } = usePaymentFeeHistory();

  const { data: allMovs = [] } = useQuery({
    queryKey: ["all-movs", feeHistoryVersion(feeHistory)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movements")
        .select("*, products(name, sku, codigo, purchase_price)")
        .order("occurred_at", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("movements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ["all-movs"] }); 
      toast.success("Removido"); 
    },
  });

  const filteredMovs = useMemo(() => {
    const selectedDate = new Date(dateFilter);
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);
    return allMovs.filter(m => {
      if (m.type !== "out") return false; // Mostra apenas vendas na tabela
      const d = new Date(m.occurred_at);
      return d >= start && d <= end;
    });
  }, [allMovs, dateFilter]);




  const stats = useMemo(() => {
    const now = new Date(dateFilter + "T12:00:00");
    const dayInterval = { start: startOfDay(now), end: endOfDay(now) };
    const weekInterval = { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
    const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) };

    const calculate = (interval: { start: Date; end: Date }) =>
      allMovs.reduce((acc, m) => {
        const d = new Date(m.occurred_at);
        const utcDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
        if (isWithinInterval(utcDate, interval) && m.type === "out") {
          const gross = m.quantity * Number(m.unit_price);
          const cost = m.quantity * effectiveUnitCost(m as any, feeHistory) + movementExtraCost(m as any, feeHistory);
          return { gross: acc.gross + gross, net: acc.net + (gross - cost) };

        }
        return acc;
      }, { gross: 0, net: 0 });

    const d = calculate(dayInterval);
    const w = calculate(weekInterval);
    const mo = calculate(monthInterval);

    return { daily: d.gross, weekly: w.gross, monthly: mo.gross, dailyNet: d.net, weeklyNet: w.net, monthlyNet: mo.net };
  }, [allMovs, dateFilter, feeHistory]);

  const getDailyColor = (val: number) => {
    if (val < 350) return "text-destructive";
    if (val < 500) return "text-orange-500";
    return "text-success";
  };

  const getWeeklyColor = (val: number) => {
    if (val < 2100) return "text-destructive";
    if (val < 3000) return "text-orange-500";
    return "text-success";
  };

  const getMonthlyColor = (val: number) => {
    if (val < 9000) return "text-destructive";
    if (val < 12000) return "text-orange-500";
    if (val < 16000) return "text-success";
    return "text-blue-600";
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-4 px-4 pt-4 pb-2 md:-mx-8 md:px-8 border-b border-border shadow-md">

        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold truncate whitespace-nowrap">Vendas</h1>
            <p className="text-muted-foreground lowercase">
              {new Date(dateFilter + "T12:00:00").toLocaleDateString("pt-BR", { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <Link to="/relatorios">
                <Button variant="outline" size="icon" className="size-10 rounded-full hover:bg-primary hover:text-primary-foreground group transition-colors">
                  <Printer className="size-5 text-primary group-hover:text-primary-foreground" />
                </Button>
              </Link>
              <span className="text-[10px] text-muted-foreground font-medium">Recibos</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="relative group">
                <input 
                  type="date" 
                  value={dateFilter} 
                  onChange={e => setDateFilter(e.target.value)} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                <Button variant="outline" size="icon" className="size-10 pointer-events-none group-hover:bg-primary transition-colors rounded-full">
                  <Calendar className="size-6 text-primary group-hover:text-primary-foreground" />
                </Button>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Data</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <Button onClick={() => setOpen(true)} size="icon" className="bg-primary text-primary-foreground glow rounded-full size-10">
                <Plus className="size-5" />
              </Button>
              <span className="text-[10px] text-muted-foreground font-medium">Nova Venda</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 py-2">
          <div className="grid gap-2 grid-cols-3 flex-1">
            <Stat label="Venda Diária" value={hideTotals ? null : brl(stats.daily)} hoverValue={hideTotals ? null : brl(stats.dailyNet)} color={getDailyColor(stats.daily)} />
            <Stat label="Venda Semanal" value={hideTotals ? null : brl(stats.weekly)} hoverValue={hideTotals ? null : brl(stats.weeklyNet)} color={getWeeklyColor(stats.weekly)} />
            <Stat label="Venda Mensal" value={hideTotals ? null : brl(stats.monthly)} hoverValue={hideTotals ? null : brl(stats.monthlyNet)} color={getMonthlyColor(stats.monthly)} />
          </div>
          <button
            type="button"
            onClick={() => setHideTotals(v => !v)}
            className="p-2 rounded hover:bg-secondary/50 text-muted-foreground shrink-0"
            title={hideTotals ? "Mostrar valores" : "Ocultar valores"}
          >
            {hideTotals ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>

        <div className="mt-2 border-t border-border bg-background">
          <table className="w-full text-sm table-fixed">
            <thead className="text-[9px] sm:text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-1 sm:px-2 py-3 text-left w-[14%] whitespace-nowrap">Código</th>
                <th className="px-1 sm:px-2 py-3 text-left w-[26%] whitespace-nowrap">Produto</th>
                <th className="px-1 sm:px-2 py-3 text-right w-[7%] whitespace-nowrap">Qtd</th>
                <th className="px-1 sm:px-2 py-3 text-right w-[14%] whitespace-nowrap">Unit.</th>
                <th className="px-1 sm:px-2 py-3 text-right w-[15%] whitespace-nowrap">Total</th>
                <th className="px-1 sm:px-2 py-3 text-center w-[14%] whitespace-nowrap">Pagamento</th>
                <th className="w-[10%]" />
              </tr>
            </thead>
          </table>
        </div>
      </div>

      <div className="mt-0 space-y-4 px-0 md:px-0">
      <div>

        <table className="w-full text-sm table-fixed">
          <tbody className="divide-y divide-border">
            {filteredMovs.map(m => (
              <tr key={m.id} className="hover:bg-secondary/30 transition-colors">
                <td className="px-1 sm:px-2 py-1.5 font-bold text-[9px] sm:text-[10px] text-primary w-[14%] truncate">{m.products?.codigo ?? "—"}</td>
                <td className="px-1 sm:px-2 py-1.5 text-[10px] sm:text-xs w-[26%] truncate">{m.products?.name ?? "—"}</td>
                <td className="px-1 sm:px-2 py-1.5 text-right tabular-nums text-[9px] sm:text-[10px] font-bold w-[7%] whitespace-nowrap">{m.quantity}</td>
                <td className="px-1 sm:px-2 py-1.5 text-right tabular-nums text-[10px] sm:text-xs w-[14%] whitespace-nowrap truncate">{brl(Number(m.unit_price))}</td>
                <td className="px-1 sm:px-2 py-1.5 text-right tabular-nums font-semibold text-[10px] sm:text-xs w-[15%] whitespace-nowrap truncate">{brl(m.quantity * Number(m.unit_price))}</td>
                <td className="px-1 sm:px-2 py-1.5 text-center w-[14%]">
                  <span
                    className="inline-flex items-center justify-center rounded-full px-1 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold text-white shadow-sm whitespace-nowrap max-w-full truncate"
                    style={{ backgroundColor: PAYMENT_COLORS[m.payment_method as keyof typeof PAYMENT_COLORS] || "#888" }}
                  >
                    {m.payment_method || "Dinheiro"}
                  </span>
                </td>
                <td className="px-0 py-1.5 text-right w-[10%] whitespace-nowrap">
                  {isToday(dateFilter) && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditMov(m)} title="Editar (somente hoje)">
                      <Pencil className="size-3.5 text-primary" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setDeleteId(m.id)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {filteredMovs.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Nenhuma movimentação neste dia.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      </div>



      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4 text-center">Distribuição de Pagamentos</h2>
        <PaymentMethodsStats allMovs={allMovs} dateFilter={dateFilter} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4 text-center">Composição de Custos</h2>
        <CostCompositionStats allMovs={allMovs} dateFilter={dateFilter} feeHistory={feeHistory} />
      </div>

      <div className="mt-8 card-surface p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-4 text-center">Quantidade de Vendas</h2>
        <SalesCountSummary movements={allMovs as any} />
      </div>


      <MovDialog open={open} onClose={() => setOpen(false)} />
      <EditMovDialog mov={editMov} onClose={() => setEditMov(null)} />



      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-2">
              <img src={logoUrl} alt="Chaveiro TOP" className="w-16 h-16 object-contain" />
            </div>
            <AlertDialogTitle className="text-center">Deseja realmente deletar esta venda?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Esta ação não pode ser desfeita. A venda será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) {
                  setPinPromptId(deleteId);
                  setPinInput("");
                  setPinError("");
                  setDeleteId(null);
                }
              }}
            >
              Sim, deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!pinPromptId} onOpenChange={(o) => { if (!o) { setPinPromptId(null); setPinInput(""); setPinError(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <img src={logoUrl} alt="Chaveiro TOP" className="w-16 h-16 object-contain" />
            </div>
            <DialogTitle className="text-center">Digite o PIN do administrador</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPinError("");
              const { data, error } = await supabase.from("app_settings").select("value").eq("key", "delete_pin").maybeSingle();
              if (error) { setPinError("Erro ao validar PIN"); return; }
              const stored = (data?.value as string | null) ?? "";
              if (!stored) { setPinError("Nenhum PIN configurado. Peça ao ADM para definir."); return; }
              if (pinInput.trim() !== stored) { setPinError("PIN incorreto"); return; }
              if (pinPromptId) del.mutate(pinPromptId);
              setPinPromptId(null);
              setPinInput("");
            }}
            className="space-y-3"
          >
            <PasswordInput
              autoFocus
              maxLength={8}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              className="text-center tracking-widest text-lg"
            />
            {pinError && <p className="text-sm text-destructive text-center">{pinError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setPinPromptId(null); setPinInput(""); setPinError(""); }}>Cancelar</Button>
              <Button type="submit" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar exclusão</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


const PAYMENT_COLORS = {
  "PIX": "#00C49F",
  "Dinheiro": "#FFBB28",
  "Débito": "#0088FE",
  "Crédito": "#FF8042",
  "Boleto": "#A855F7",
};

function PaymentMethodsStats({ allMovs, dateFilter }: { allMovs: any[]; dateFilter: string }) {
  const getStatsForRange = (range: { start: Date; end: Date }) => {
    const methods: Record<string, number> = { "PIX": 0, "Dinheiro": 0, "Débito": 0, "Crédito": 0, "Boleto": 0 };
    let total = 0;
    
    allMovs.forEach(m => {
      const d = new Date(m.occurred_at);
      const utcDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      if (isWithinInterval(utcDate, range) && m.type === "out") {
        const val = m.quantity * Number(m.unit_price);
        const method = m.payment_method || "Dinheiro"; // Fallback to Dinheiro if not set
        if (methods[method] !== undefined) {
          methods[method] += val;
          total += val;
        }
      }
    });

    return Object.entries(methods)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        value,
        percent: total > 0 ? (value / total) * 100 : 0
      }));
  };

  const now = new Date(dateFilter + "T12:00:00");
  const dayStats = useMemo(() => getStatsForRange({ start: startOfDay(now), end: endOfDay(now) }), [allMovs, dateFilter]);
  const weekStats = useMemo(() => getStatsForRange({ start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) }), [allMovs, dateFilter]);
  const monthStats = useMemo(() => getStatsForRange({ start: startOfMonth(now), end: endOfMonth(now) }), [allMovs, dateFilter]);

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <PaymentChart title="Pagamentos Hoje" data={dayStats} />
      <PaymentChart title="Pagamentos na Semana" data={weekStats} />
      <PaymentChart title="Pagamentos no Mês" data={monthStats} />
    </div>
  );
}

function PaymentChart({ title, data }: { title: string; data: any[] }) {
  if (data.length === 0) {
    return (
      <div className="card-surface p-2 flex flex-col items-center justify-center min-h-[120px]">
        <h3 className="text-[10px] font-bold mb-1">{title}</h3>
        <p className="text-[9px] text-muted-foreground">Sem dados</p>
      </div>
    );
  }

  return (
    <div className="card-surface p-2">
      <h3 className="text-[10px] font-bold mb-1 text-center">{title}</h3>
      <div className="h-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie
              data={data}
              innerRadius={25}
              outerRadius={38}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[entry.name as keyof typeof PAYMENT_COLORS] || "#8884d8"} />
              ))}
            </Pie>
            <ReTooltip 
              formatter={(value: number, name: string, props: any) => [
                `${brl(value)} (${props.payload.percent.toFixed(0)}%)`,
                name
              ]}
              contentStyle={{ fontSize: '9px', padding: '4px' }}
            />
          </RePieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 space-y-0.5 border-t border-border pt-1">
        {data.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center gap-1 text-[8px] sm:text-[9px] whitespace-nowrap">
            <div className="flex items-center gap-1 min-w-0">
              <div className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: PAYMENT_COLORS[item.name as keyof typeof PAYMENT_COLORS] }} />
              <span className="text-muted-foreground truncate">{item.name}</span>
            </div>
            <span className="font-bold shrink-0">{brl(item.value)} <span className="text-muted-foreground font-normal">({item.percent.toFixed(0)}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

const COST_COLORS: Record<string, string> = {
  "Materiais": "#0088FE",
  "Taxa Débito": "#00C49F",
  "Taxa Crédito": "#FF8042",
  "Taxa Boleto": "#A855F7",
};

function CostCompositionStats({ allMovs, dateFilter, feeHistory }: { allMovs: any[]; dateFilter: string; feeHistory: any }) {
  const getStatsForRange = (range: { start: Date; end: Date }) => {
    let material = 0, debitFee = 0, creditFee = 0, boletoFee = 0;
    allMovs.forEach(m => {
      if (m.type !== "out") return;
      const d = new Date(m.occurred_at);
      const utcDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      if (!isWithinInterval(utcDate, range)) return;
      const qty = Number(m.quantity);
      const sPrice = Number(m.unit_price);
      const baseUnit = Number(m.unit_cost ?? 0);
      const legacy = m.unit_cost_includes_fee !== false;
      const pct = feeForDate(feeHistory, m.occurred_at, m.payment_method, m.card_brand);
      const feeFromPct = qty * sPrice * pct / 100;
      if (legacy) {
        material += Math.max(0, qty * baseUnit - feeFromPct);
        if (m.payment_method === "Débito") debitFee += feeFromPct;
        else if (m.payment_method === "Crédito") creditFee += feeFromPct;
      } else {
        material += qty * baseUnit;
        if (m.payment_method === "Débito") debitFee += feeFromPct;
        else if (m.payment_method === "Crédito") creditFee += feeFromPct;
        else if (m.payment_method === "Boleto") boletoFee += boletoFeeForDate(feeHistory, m.occurred_at);
      }
    });
    const total = material + debitFee + creditFee + boletoFee;
    return [
      { name: "Materiais", value: material },
      { name: "Taxa Débito", value: debitFee },
      { name: "Taxa Crédito", value: creditFee },
      { name: "Taxa Boleto", value: boletoFee },
    ].filter(r => r.value > 0).map(r => ({ ...r, percent: total > 0 ? (r.value / total) * 100 : 0 }));
  };

  const now = new Date(dateFilter + "T12:00:00");
  const dayStats = useMemo(() => getStatsForRange({ start: startOfDay(now), end: endOfDay(now) }), [allMovs, dateFilter, feeHistory]);
  const weekStats = useMemo(() => getStatsForRange({ start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) }), [allMovs, dateFilter, feeHistory]);
  const monthStats = useMemo(() => getStatsForRange({ start: startOfMonth(now), end: endOfMonth(now) }), [allMovs, dateFilter, feeHistory]);

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <CostChart title="Custos Hoje" data={dayStats} />
      <CostChart title="Custos na Semana" data={weekStats} />
      <CostChart title="Custos no Mês" data={monthStats} />
    </div>
  );
}

function CostChart({ title, data }: { title: string; data: { name: string; value: number; percent: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="card-surface p-2 flex flex-col items-center justify-center min-h-[120px]">
        <h3 className="text-[10px] font-bold mb-1">{title}</h3>
        <p className="text-[9px] text-muted-foreground">Sem dados</p>
      </div>
    );
  }
  return (
    <div className="card-surface p-2">
      <h3 className="text-[10px] font-bold mb-1 text-center">{title}</h3>
      <div className="h-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie data={data} innerRadius={25} outerRadius={38} paddingAngle={4} dataKey="value">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COST_COLORS[entry.name] || "#8884d8"} />
              ))}
            </Pie>
            <ReTooltip
              formatter={(value: number, name: string, props: any) => [`${brl(value)} (${props.payload.percent.toFixed(0)}%)`, name]}
              contentStyle={{ fontSize: '9px', padding: '4px' }}
            />
          </RePieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 space-y-0.5 border-t border-border pt-1">
        {data.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center gap-1 text-[8px] sm:text-[9px] whitespace-nowrap">
            <div className="flex items-center gap-1 min-w-0">
              <div className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: COST_COLORS[item.name] || "#8884d8" }} />
              <span className="text-muted-foreground truncate">{item.name}</span>
            </div>
            <span className="font-bold shrink-0">{brl(item.value)} <span className="text-muted-foreground font-normal">({item.percent.toFixed(0)}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color, hoverValue }: { label: string; value: string | null; color: string; hoverValue?: string | null }) {
  const [active, setActive] = useState(false);
  const showHover = active && hoverValue != null;
  const clear = () => setActive(false);
  const activate = () => setActive(true);
  return (
    <div
      className="min-w-0 p-1 sm:p-1.5 select-none touch-none cursor-pointer"
      onMouseEnter={activate}
      onMouseLeave={clear}
      onPointerDown={activate}
      onPointerUp={clear}
      onPointerCancel={clear}
      onPointerLeave={clear}
    >
      <div className="text-[8px] sm:text-[9px] uppercase tracking-wider text-muted-foreground leading-none truncate whitespace-nowrap">
        {showHover ? "Líquido" : label}
      </div>
      <div className={`mt-0.5 text-[11px] sm:text-lg font-bold leading-tight tabular-nums truncate whitespace-nowrap ${showHover ? "text-gray-300 dark:text-gray-600" : color}`}>
        {value === null ? <EyeOff className="size-4 sm:size-5 text-muted-foreground" /> : (showHover ? hoverValue : value)}
      </div>
    </div>
  );
}

function MovDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  
  const { data: products = [] } = useQuery({
    queryKey: ["products-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name,sale_price,purchase_price,codigo,stock,stock_controlled").order("codigo", { ascending: true, nullsFirst: false }).limit(2000);
      if (error) throw error;
      return data;
    },
  });

  const { data: stockEnabled = false } = useQuery({
    queryKey: ["org-stock-control-enabled"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data: prof } = await supabase.from("profiles").select("organization_id").eq("user_id", u.user.id).maybeSingle();
      if (!prof?.organization_id) return false;
      const { data: org } = await supabase.from("organizations").select("stock_control_enabled").eq("id", prof.organization_id).maybeSingle();
      return !!(org as any)?.stock_control_enabled;
    },
  });

  const [productId, setProductId] = useState("");
  const [type] = useState<"in" | "out">("out");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [costLocked, setCostLocked] = useState(false);
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [paymentMethod, setPaymentMethod] = useState("Dinheiro");
  const [cardBrand, setCardBrand] = useState<"visa_master" | "other">("visa_master");

  const { data: paymentFees } = useQuery({
    queryKey: ["payment-fees"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", ["debit_fee_pct", "credit_fee_pct", "debit_fee_pct_other", "credit_fee_pct_other", "boleto_fee"]);
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { map[r.key] = Number(String(r.value ?? "0").replace(",", ".")) || 0; });
      return {
        debit: map["debit_fee_pct"] ?? 0,
        credit: map["credit_fee_pct"] ?? 0,
        debitOther: map["debit_fee_pct_other"] ?? map["debit_fee_pct"] ?? 0,
        creditOther: map["credit_fee_pct_other"] ?? map["credit_fee_pct"] ?? 0,
        boleto: map["boleto_fee"] ?? 0,
      };
    },
  });

  const isCard = paymentMethod === "Débito" || paymentMethod === "Crédito";
  const feePct = paymentMethod === "Débito"
    ? (cardBrand === "other" ? (paymentFees?.debitOther ?? 0) : (paymentFees?.debit ?? 0))
    : paymentMethod === "Crédito"
    ? (cardBrand === "other" ? (paymentFees?.creditOther ?? 0) : (paymentFees?.credit ?? 0))
    : 0;
  const boletoFlat = paymentMethod === "Boleto" ? (paymentFees?.boleto ?? 0) : 0;


  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      !search || 
      String(p.codigo || "").toLowerCase().includes(search.toLowerCase()) || 
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const [items, setItems] = useState<{ productId: string; quantity: number; unitPrice: number; unitCost: number; manualCost: boolean; name: string; codigo: string }[]>([]);

  const addItem = () => {
    if (!productId) return;
    const p = products.find(x => x.id === productId);
    if (!p) return;
    if (type === "out" && stockEnabled && ((p as any).stock_controlled ?? true)) {
      const already = items
        .filter(it => it.productId === productId)
        .reduce((s, it) => s + Number(it.quantity || 0), 0);
      const available = Number((p as any).stock ?? 0) - already;
      if (available <= 0 || quantity > available) {
        toast.error("Estoque Zerado do Item! Ajustar ou Comprar!");
        return;
      }
    }
    setItems([...items, { productId, quantity, unitPrice, unitCost, manualCost: !costLocked && unitCost > 0, name: p.name, codigo: p.codigo || "" }]);
    setProductId("");
    setSearch("");
    setQuantity(1);
    setUnitPrice(0);
    setUnitCost(0);
    setCostLocked(false);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      
      const payload = items.map(item => ({
        product_id: item.productId,
        type, 
        quantity: item.quantity, 
        unit_price: item.unitPrice,
        unit_cost: item.unitCost || null,
        unit_cost_includes_fee: false,
        occurred_at: new Date(date).toISOString(),
        payment_method: paymentMethod,
        card_brand: isCard ? cardBrand : null,
        created_by: u.user.id,
      }));

      const { error } = await supabase.from("movements").insert(payload);
      if (error) throw error;

      // Update stock only when org has stock control enabled and item is controlled
      const { data: prof } = await supabase.from("profiles").select("organization_id").eq("user_id", u.user.id).maybeSingle();
      const orgId = prof?.organization_id;
      const { data: orgRow } = orgId
        ? await supabase.from("organizations").select("stock_control_enabled").eq("id", orgId).maybeSingle()
        : { data: null } as any;
      const stockEnabled = !!(orgRow as any)?.stock_control_enabled;
      const lowAlerts: { name: string; stock: number; min: number }[] = [];
      for (const item of items) {
        const { data: cur } = await supabase
          .from("products")
          .select("stock, min_stock, stock_controlled, name")
          .eq("id", item.productId)
          .single();
        if (!cur) continue;
        const ctrl = (cur as any).stock_controlled ?? true;
        if (!stockEnabled || !ctrl) continue;
        const delta = type === "in" ? item.quantity : -item.quantity;
        const newStock = Math.max(0, Number(cur.stock) + delta);
        await supabase.from("products").update({ stock: newStock }).eq("id", item.productId);
        const min = Number((cur as any).min_stock) || 0;
        if (type === "out" && min > 0 && newStock <= min) {
          lowAlerts.push({ name: (cur as any).name, stock: newStock, min });
        }
      }
      (window as any).__km_low_alerts = lowAlerts;

    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-movs"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock-products"] });

      // Dispatch custom event for the mascot to react
      window.dispatchEvent(new CustomEvent("km-sale-success"));

      toast.success("Venda registrada com sucesso!");
      const alerts = ((window as any).__km_low_alerts ?? []) as { name: string; stock: number; min: number }[];
      alerts.forEach(a => toast.warning(`Estoque baixo: ${a.name} — restam ${a.stock} (mín. ${a.min})`, { duration: 8000 }));
      (window as any).__km_low_alerts = [];

      onClose();
      setItems([]);
      setProductId("");
      setSearch("");
      setUnitPrice(0);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedProduct = products.find(p => p.id === productId);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Venda/Serviço Realizado</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); create.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Buscar Produto por Código ou Nome</Label>
            <div className="relative">
              <Input 
                placeholder="Digite o código..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
              {search && (
                <div className="absolute z-10 mt-1 w-full max-h-[200px] overflow-y-auto rounded-md border border-border bg-popover shadow-lg">

                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent first:rounded-t-md last:rounded-b-md"
                      onClick={() => {
                        setProductId(p.id);
                        setUnitPrice(type === "out" ? Number(p.sale_price) : Number(p.purchase_price));
                        const cost = Number(p.purchase_price || 0);
                        setUnitCost(cost);
                        setCostLocked(cost > 0);
                        setSearch(""); // Limpa a busca para recolher a lista imediatamente
                      }}
                    >
                      <span className="font-bold text-primary">[{p.codigo ?? 'S/C'}]</span> {p.name}
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground text-center">Nenhum produto encontrado</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {selectedProduct && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <div className="font-semibold text-primary">Produto Selecionado:</div>
              <div>{selectedProduct.name} <span className="text-xs text-muted-foreground">(Cód: {selectedProduct.codigo})</span></div>
            </div>
          )}

          <div className="grid grid-cols-5 gap-2 items-end">
            <div><Label className="text-xs">Qtd</Label><Input type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} /></div>
            <div><Label className="text-xs">Preço</Label><Input type="number" step="0.01" min={0} value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value))} /></div>
            <div>
              <Label className="text-xs">Custo</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={unitCost}
                onChange={e => setUnitCost(Number(e.target.value))}
                disabled={costLocked}
                title={costLocked ? "Custo já cadastrado no produto" : "Informe o custo deste item"}
              />
            </div>
            <div className="col-span-2"><Button type="button" variant="outline" className="w-full" onClick={addItem} disabled={!productId}>Adicionar</Button></div>
          </div>

          {items.length > 0 && (
            <div className="space-y-2 max-h-[150px] overflow-y-auto rounded-md border border-border p-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-secondary/20 p-2 rounded">
                  <div className="flex-1">
                    <span className="font-bold">[{item.codigo}]</span> {item.name}
                    <div className="text-muted-foreground">{item.quantity}x {brl(item.unitPrice)} = {brl(item.quantity * item.unitPrice)}</div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(idx)}>
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Data</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} className="cursor-pointer" /></div>
            <div className="space-y-2">
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Débito">Débito</SelectItem>
                  <SelectItem value="Crédito">Crédito</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isCard && (
            <div className="space-y-2">
              <Label className="text-xs">Bandeira do cartão</Label>
              <Select value={cardBrand} onValueChange={(v) => setCardBrand(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visa_master">Visa / Mastercard</SelectItem>
                  <SelectItem value="other">Outras bandeiras</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          
          <div className="rounded-lg bg-secondary/40 p-3 text-sm space-y-1">
            <div>Total da Venda: <span className="float-right font-bold text-primary">{brl(items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0))}</span></div>
            {feePct > 0 && (
              <div className="text-xs text-muted-foreground">
                Taxa {paymentMethod} {isCard ? (cardBrand === "other" ? "(Outras)" : "(Visa/Master)") : ""} ({feePct}%): <span className="float-right">{brl(items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * feePct / 100), 0))}</span>
              </div>
            )}
            {boletoFlat > 0 && (
              <div className="text-xs text-muted-foreground">
                Taxa Boleto (fixa): <span className="float-right">{brl(boletoFlat)}</span>
              </div>
            )}
          </div>

          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending || items.length === 0} className="bg-primary text-primary-foreground">Registrar Tudo</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditMovDialog({ mov, onClose }: { mov: any | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Dinheiro");
  const [cardBrand, setCardBrand] = useState<"visa_master" | "other">("visa_master");
  const [pinStage, setPinStage] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    if (mov) {
      setQuantity(Number(mov.quantity) || 1);
      setUnitPrice(Number(mov.unit_price) || 0);
      setUnitCost(Number(mov.unit_cost ?? 0));
      setPaymentMethod(mov.payment_method || "Dinheiro");
      setCardBrand(mov.card_brand === "other" ? "other" : "visa_master");
      setPinStage(false);
      setPin("");
      setPinError("");
    }
  }, [mov]);

  const isCard = paymentMethod === "Débito" || paymentMethod === "Crédito";

  const save = useMutation({
    mutationFn: async () => {
      if (!mov) return;
      const oldQty = Number(mov.quantity) || 0;
      const deltaStock = oldQty - quantity; // out: se qty aumentou, estoque cai (deltaStock negativo)
      const { error } = await supabase.from("movements").update({
        quantity,
        unit_price: unitPrice,
        unit_cost: unitCost || null,
        unit_cost_includes_fee: false,
        payment_method: paymentMethod,
        card_brand: isCard ? cardBrand : null,
      }).eq("id", mov.id);
      if (error) throw error;
      if (deltaStock !== 0 && mov.product_id) {
        const { data: u } = await supabase.auth.getUser();
        const { data: prof } = u.user ? await supabase.from("profiles").select("organization_id").eq("user_id", u.user.id).maybeSingle() : { data: null } as any;
        const { data: orgRow } = prof?.organization_id
          ? await supabase.from("organizations").select("stock_control_enabled").eq("id", prof.organization_id).maybeSingle()
          : { data: null } as any;
        const stockEnabled = !!(orgRow as any)?.stock_control_enabled;
        const { data: cur } = await supabase.from("products").select("stock, stock_controlled").eq("id", mov.product_id).single();
        const ctrl = (cur as any)?.stock_controlled ?? true;
        if (cur && stockEnabled && ctrl) {
          await supabase.from("products").update({ stock: Math.max(0, Number(cur.stock) + deltaStock) }).eq("id", mov.product_id);
        }
      }

    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-movs"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Venda atualizada");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const validatePinAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");
    const { data, error } = await supabase.from("app_settings").select("value").eq("key", "delete_pin").maybeSingle();
    if (error) { setPinError("Erro ao validar PIN"); return; }
    const stored = (data?.value as string | null) ?? "";
    if (!stored) { setPinError("Nenhum PIN configurado. Peça ao ADM para definir."); return; }
    if (pin.trim() !== stored) { setPinError("PIN incorreto"); return; }
    save.mutate();
  };

  return (
    <Dialog open={!!mov} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <img src={logoUrl} alt="Chaveiro TOP" className="w-14 h-14 object-contain" />
          </div>
          <DialogTitle className="text-center">
            {pinStage ? "Digite o PIN do administrador" : "Editar venda (somente hoje)"}
          </DialogTitle>
        </DialogHeader>

        {!pinStage ? (
          <form onSubmit={(e) => { e.preventDefault(); setPinStage(true); }} className="space-y-3">
            {mov && (
              <div className="text-xs text-muted-foreground">
                <span className="font-bold text-primary">[{mov.products?.codigo ?? "—"}]</span> {mov.products?.name ?? "—"}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Qtd</Label><Input type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} /></div>
              <div><Label className="text-xs">Preço</Label><Input type="number" step="0.01" min={0} value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value))} /></div>
              <div><Label className="text-xs">Custo</Label><Input type="number" step="0.01" min={0} value={unitCost} onChange={e => setUnitCost(Number(e.target.value))} /></div>
            </div>
            <div>
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Débito">Débito</SelectItem>
                  <SelectItem value="Crédito">Crédito</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isCard && (
              <div>
                <Label className="text-xs">Bandeira do cartão</Label>
                <Select value={cardBrand} onValueChange={(v) => setCardBrand(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visa_master">Visa / Mastercard</SelectItem>
                    <SelectItem value="other">Outras bandeiras</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="rounded-lg bg-secondary/40 p-2 text-sm">
              Total: <span className="float-right font-bold text-primary">{brl(quantity * unitPrice)}</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="submit" className="bg-primary text-primary-foreground">Continuar</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={validatePinAndSave} className="space-y-3">
            <PasswordInput
              autoFocus
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="text-center tracking-widest text-lg"
            />
            {pinError && <p className="text-sm text-destructive text-center">{pinError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPinStage(false)}>Voltar</Button>
              <Button type="submit" disabled={save.isPending} className="bg-primary text-primary-foreground">Confirmar edição</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
