import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl, currentYM, ymRange, monthLabel } from "@/lib/format";
import { Package, TrendingUp, AlertTriangle, DollarSign, FileText, Calendar, Printer, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, startOfYear, endOfYear, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { header as pdfHeader, footer as pdfFooter, HEADER_BOTTOM, computeCostComposition, costSlices } from "@/lib/pdf";
import { usePaymentFeeHistory, effectiveUnitCost, feeHistoryVersion, movementExtraCost, feeForDate, boletoFeeForDate } from "@/lib/payment-fees";
import { SalesCountChart } from "@/components/SalesCountChart";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const [filterType, setFilterType] = useState<"week" | "month" | "year">("month");
  const [selectedYM, setSelectedYM] = useState(currentYM());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedWeekDate, setSelectedWeekDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { start, end } = useMemo(() => {
    if (filterType === "month") {
      return ymRange(selectedYM);
    } else if (filterType === "week") {
      const [y, m, d] = selectedWeekDate.split("-").map(Number);
      const ref = new Date(y, m - 1, d);
      const s = startOfWeek(ref, { weekStartsOn: 0 });
      const e = new Date(endOfWeek(ref, { weekStartsOn: 0 }).getTime() + 1);
      // occurred_at grava meia-noite UTC do dia; alinhamos os limites em UTC
      // para não perder o primeiro/último dia por causa do fuso local.
      const sUtc = new Date(Date.UTC(s.getFullYear(), s.getMonth(), s.getDate())).toISOString();
      const eUtc = new Date(Date.UTC(e.getFullYear(), e.getMonth(), e.getDate())).toISOString();
      return { start: sUtc, end: eUtc };
    } else {
      const year = parseInt(selectedYear);
      const s = new Date(Date.UTC(year, 0, 1)).toISOString();
      const e = new Date(Date.UTC(year + 1, 0, 1)).toISOString();
      return { start: s, end: e };
    }
  }, [filterType, selectedYM, selectedYear, selectedWeekDate]);

  const periodLabel =
    filterType === "month"
      ? monthLabel(selectedYM)
      : filterType === "week"
        ? (() => {
            const [y, m, d] = selectedWeekDate.split("-").map(Number);
            const ref = new Date(y, m - 1, d);
            const s = startOfWeek(ref, { weekStartsOn: 0 });
            const e = endOfWeek(ref, { weekStartsOn: 0 });
            return `Semana de ${format(s, "dd/MM")} a ${format(e, "dd/MM/yyyy")}`;
          })()
        : `Ano ${selectedYear}`;

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: movs } = useQuery({
    queryKey: ["movs-dashboard-expanded"], // Alterado o queryKey para não conflitar se houver cache agressivo
    queryFn: async () => {
      // Para o dashboard, buscamos um range maior para calcular hoje/semana/mês se necessário
      // Mas para manter performance, vamos focar no mês atual para o faturamento principal
      // e buscar dados recentes para os gráficos de pizza
      const { data, error } = await supabase
        .from("movements")
        .select("*, products(name, codigo, purchase_price)")
        .order("occurred_at", { ascending: false }); // Pegamos tudo para filtrar no JS, pois o volume não deve ser absurdo
      if (error) throw error;
      return data;
    },
  });

  const { data: feeHistory } = usePaymentFeeHistory();

  const { data: monthly } = useQuery({
    queryKey: ["monthly-6", feeHistoryVersion(feeHistory)],
    queryFn: async () => {
      const nowU = new Date();
      const since = new Date(Date.UTC(nowU.getUTCFullYear(), nowU.getUTCMonth() - 5, 1));
      const { data, error } = await supabase
        .from("movements")
        .select("type,quantity,unit_price,unit_cost,unit_cost_includes_fee,payment_method,card_brand,occurred_at,products(purchase_price)")
        .gte("occurred_at", since.toISOString());
      if (error) throw error;
      const map = new Map<string, { ym: string; receita: number; custo: number; lucro: number }>();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(Date.UTC(nowU.getUTCFullYear(), nowU.getUTCMonth() - i, 1));
        const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`;
        map.set(k, { ym: k, receita: 0, custo: 0, lucro: 0 });
      }
      for (const m of data) {
        const d = new Date(m.occurred_at);
        const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`;
        const row = map.get(k); if (!row) continue;

        const qty = Number(m.quantity);
        const sPrice = Number(m.unit_price);
        const pPrice = effectiveUnitCost(m as any, feeHistory);

        if (m.type === "out") {
          const revenue = qty * sPrice;
          const cost = qty * pPrice + movementExtraCost(m as any, feeHistory);
          row.receita += revenue;
          row.custo += cost;
          row.lucro += (revenue - cost);
        }

      }
      return Array.from(map.values()).map(r => ({ ...r, label: monthLabel(r.ym).slice(0,3) }));
    },
  });

  const stockValue = products?.reduce((s, p) => s + Number(p.purchase_price) * p.stock, 0) ?? 0;
  const filteredMovs = movs?.filter(m => {
    const d = new Date(m.occurred_at);
    return d >= new Date(start) && d < new Date(end);
  });

  const revenue = filteredMovs?.filter(m => m.type === "out").reduce((s, m) => s + Number(m.quantity)*Number(m.unit_price), 0) ?? 0;
  
  // Real profit calculation: (Sale Price - Purchase Price) * Quantity
  const { totalCost, realProfit } = filteredMovs?.filter(m => m.type === "out").reduce((acc, m) => {
    // We try to use the current purchase price as a proxy if it wasn't recorded at movement time
    // In a more robust system, purchase_price should be snapshotted in movements
    const pPrice = effectiveUnitCost(m as any, feeHistory);
    const sPrice = Number(m.unit_price);
    const qty = Number(m.quantity);
    const extra = movementExtraCost(m as any, feeHistory);

    acc.totalCost += pPrice * qty + extra;
    acc.realProfit += (sPrice - pPrice) * qty - extra;
    return acc;
  }, { totalCost: 0, realProfit: 0 }) ?? { totalCost: 0, realProfit: 0 };

  const lowStock = products?.filter(p => p.stock > 0 && p.stock <= 3) ?? [];

  const topSelling = (() => {
    if (!filteredMovs) return [];
    const map = new Map<string, { name: string; codigo: string; qty: number; totalSold: number; realProfit: number }>();
    filteredMovs.filter(m => m.type === "out").forEach(m => {
      const codigo = String(m.products?.codigo || "S/C");
      const name = m.products?.name || "Desconhecido";
      const pPrice = effectiveUnitCost(m as any, feeHistory);
      const sPrice = Number(m.unit_price);
      const qty = Number(m.quantity);
      const extra = movementExtraCost(m as any, feeHistory);

      const cur = map.get(codigo) || { name, codigo, qty: 0, totalSold: 0, realProfit: 0 };
      cur.qty += qty;
      cur.totalSold += sPrice * qty;
      cur.realProfit += (sPrice - pPrice) * qty - extra;
      map.set(codigo, cur);
    });

    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  })();


  const totalSoldQty = topSelling.reduce((s, p) => s + p.qty, 0);

  const revenueColor = (() => {
    if (revenue < 9000) return "text-destructive";
    if (revenue >= 9000 && revenue < 12000) return "text-orange-500";
    if (revenue >= 12000 && revenue < 16000) return "text-success";
    return "text-blue-600";
  })();

  const paymentStats = useMemo(() => {
    const methods: Record<string, number> = { "PIX": 0, "Dinheiro": 0, "Débito": 0, "Crédito": 0, "Boleto": 0 };
    let total = 0;
    (filteredMovs || []).filter(m => m.type === "out").forEach(m => {
      const val = Number(m.quantity) * Number(m.unit_price);
      const method = m.payment_method || "Dinheiro";
      if (methods[method] !== undefined) {
        methods[method] += val;
        total += val;
      }
    });
    return Object.entries(methods)
      .filter(([_, v]) => v > 0)
      .map(([name, value]) => ({ name, value, percent: total > 0 ? (value/total)*100 : 0 }));
  }, [filteredMovs]);

  // Cost breakdown is computed per range inside CostBreakdownCharts.

  const handleGeneratePDF = async (action: "download" | "print" = "download") => {
    try {
      const doc = new jsPDF();
      pdfHeader(doc, "Relatório de Desempenho", periodLabel);

      autoTable(doc, {
        startY: HEADER_BOTTOM,
        head: [['Métrica', 'Valor']],
        body: [
          ['Faturamento', brl(revenue)],
          ['Custo das Vendas', brl(totalCost)],
          ['Lucro Real', brl(realProfit)],
          ['Total de Produtos Vendidos', String(totalSoldQty)],
          ['Valor em Estoque', brl(stockValue)],
          ['Itens com Estoque Baixo', String(lowStock.length)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [255, 158, 65], textColor: 20 }
      });

      if (paymentStats.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text("Meios de Pagamento", 14, (doc as any).lastAutoTable.finalY + 12);

        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 16,
          head: [['Método', 'Valor', '%']],
          body: paymentStats.map(p => [p.name, brl(p.value), `${p.percent.toFixed(1)}%`]),
          headStyles: { fillColor: [40, 40, 40], textColor: 255 },
        });
      }

      // Composição de Custos
      const comp = computeCostComposition((filteredMovs || []).filter(m => m.type === "out") as any, feeHistory);
      const costSl = costSlices(comp);
      if (costSl.length > 0) {
        const totalC = costSl.reduce((s, x) => s + x.value, 0);
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text("Composição de Custos", 14, (doc as any).lastAutoTable.finalY + 12);
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 16,
          head: [['Categoria', 'Valor', '%']],
          body: costSl.map(s => [s.label, brl(s.value), `${((s.value / totalC) * 100).toFixed(1)}%`]),
          foot: [['TOTAL', brl(totalC), '100%']],
          headStyles: { fillColor: [40, 40, 40], textColor: 255 },
          footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
        });
      }

      if (topSelling.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text("Produtos Mais Vendidos", 14, (doc as any).lastAutoTable.finalY + 12);

        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 16,
          head: [['Pos.', 'Código', 'Produto', 'Qtd', 'Total', 'Lucro Real']],
          body: topSelling.slice(0, 15).map((p, i) => [
            `${i + 1}º`,
            p.codigo,
            p.name,
            p.qty,
            brl(p.totalSold),
            brl(p.realProfit)
          ]),
          headStyles: { fillColor: [40, 40, 40], textColor: 255 },
        });
      }

      pdfFooter(doc);
      const fileSuffix =
        filterType === "month"
          ? selectedYM
          : filterType === "week"
            ? selectedWeekDate
            : selectedYear;
      const fname = `RELATÓRIO-${fileSuffix}.pdf`;
      if (action === "print") {
        const { printOrSavePdf } = await import("@/lib/pdf-print");
        printOrSavePdf(doc, fname);
      } else {
        doc.save(fname);
        toast.success("PDF gerado com sucesso!");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar PDF");
    }
  };

  return (
    <div className="space-y-6">
      <div className="card-surface relative overflow-hidden p-5 sm:p-6">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-primary to-primary/40" />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start justify-between gap-3 md:items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="size-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-3xl font-bold leading-tight whitespace-nowrap truncate">Dashboard</h1>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  <span className="lowercase truncate">{periodLabel}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 md:hidden shrink-0">
              <div className="flex items-center gap-1">
                <Button onClick={() => handleGeneratePDF("download")} variant="outline" size="icon" className="size-10 rounded-full hover:bg-primary hover:text-primary-foreground group transition-colors" title="Baixar PDF">
                  <FileText className="size-5 text-primary group-hover:text-primary-foreground" />
                </Button>
                <Button onClick={() => handleGeneratePDF("print")} variant="outline" size="icon" className="size-10 rounded-full hover:bg-primary hover:text-primary-foreground group transition-colors" title="Imprimir">
                  <Printer className="size-5 text-primary group-hover:text-primary-foreground" />
                </Button>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">PDF</span>
            </div>
          </div>

          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto md:flex-wrap">
            <div className="flex rounded-md border border-border bg-input/40 p-1 shrink-0">
              <button
                onClick={() => setFilterType("week")}
                className={`px-2 sm:px-3 py-1 text-xs font-medium rounded ${filterType === "week" ? "bg-primary text-primary-foreground" : "hover:bg-secondary/50"}`}
              >
                Semana
              </button>
              <button
                onClick={() => setFilterType("month")}
                className={`px-2 sm:px-3 py-1 text-xs font-medium rounded ${filterType === "month" ? "bg-primary text-primary-foreground" : "hover:bg-secondary/50"}`}
              >
                Mês
              </button>
              <button
                onClick={() => setFilterType("year")}
                className={`px-2 sm:px-3 py-1 text-xs font-medium rounded ${filterType === "year" ? "bg-primary text-primary-foreground" : "hover:bg-secondary/50"}`}
              >
                Ano
              </button>
            </div>

            {filterType === "month" ? (
              <input
                type="month"
                value={selectedYM}
                onChange={e => setSelectedYM(e.target.value)}
                className="rounded-md border border-border bg-input/40 px-2 sm:px-3 py-1.5 text-xs sm:text-sm shrink-0"
              />
            ) : filterType === "week" ? (
              <input
                type="date"
                value={selectedWeekDate}
                onChange={e => setSelectedWeekDate(e.target.value)}
                className="rounded-md border border-border bg-input/40 px-2 sm:px-3 py-1.5 text-xs sm:text-sm shrink-0"
              />
            ) : (
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="rounded-md border border-border bg-input/40 px-2 sm:px-3 py-1.5 text-xs sm:text-sm shrink-0"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y.toString()}>{y}</option>
                ))}
              </select>
            ) }

            <div className="hidden md:flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <Button onClick={() => handleGeneratePDF("download")} variant="outline" size="icon" className="size-10 rounded-full hover:bg-primary hover:text-primary-foreground group transition-colors" title="Baixar PDF">
                  <FileText className="size-5 text-primary group-hover:text-primary-foreground" />
                </Button>
                <Button onClick={() => handleGeneratePDF("print")} variant="outline" size="icon" className="size-10 rounded-full hover:bg-primary hover:text-primary-foreground group transition-colors" title="Imprimir">
                  <Printer className="size-5 text-primary group-hover:text-primary-foreground" />
                </Button>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">PDF</span>
            </div>
          </div>
        </div>
      </div>





      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat icon={DollarSign} label={`Faturamento ${filterType === 'month' ? 'do mês' : filterType === 'week' ? 'da semana' : 'do ano'}`} value={brl(revenue)} colorClass={revenueColor} />
        <Stat icon={Package} label="Custos das Vendas" value={brl(totalCost)} />
        <Stat icon={TrendingUp} label="Lucro real" value={brl(realProfit)} accent={realProfit >= 0} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat icon={Package} label="Total de Produtos Vendidos" value={String(totalSoldQty)} />
        <Stat icon={DollarSign} label="Valor de estoque" value={brl(stockValue)} />
        <Stat icon={AlertTriangle} label="Estoque baixo" value={String(lowStock.length)} />
      </div>

      <div className="card-surface p-6">
        <h2 className="text-lg font-semibold">Últimos 6 meses</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 50)" />
              <XAxis dataKey="label" stroke="oklch(0.45 0.02 50)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.45 0.02 50)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${v}`} />
              <Tooltip
                contentStyle={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.9 0.01 50)", borderRadius: 12, boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                itemStyle={{ color: "oklch(0.15 0.01 50)" }}
                formatter={(v: number) => brl(Number(v))}
              />
              <Bar dataKey="receita" name="Receita" fill="oklch(0.7 0.2 55)" radius={[6,6,0,0]} />
              <Bar dataKey="custo" name="Custo" fill="oklch(0.8 0.01 50)" radius={[6,6,0,0]} />
              <Bar dataKey="lucro" name="Lucro" fill="oklch(0.6 0.15 150)" radius={[6,6,0,0]} />
              <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-surface p-6">
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-lg font-semibold">Meios de Pagamento</h2>
          <ColorLegend colors={PAYMENT_COLORS} />
        </div>
        <PaymentMethodsCharts movs={movs || []} />
      </div>
      <div className="card-surface p-6">
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-lg font-semibold">Composição de Custos</h2>
          <ColorLegend colors={COST_COLORS} />
        </div>
        <CostBreakdownCharts movs={movs || []} feeHistory={feeHistory} />
      </div>

      <div className="card-surface p-6">
        <SalesCountChart movements={movs as any} title="Quantidade de Vendas (registros)" />
      </div>

      {lowStock.length > 0 && (
        <div className="card-surface p-6">
          <h2 className="text-lg font-semibold">Produtos com estoque baixo</h2>
          <div className="mt-3 divide-y divide-border">
            {lowStock.map(p => (
              <div key={p.id} className="flex justify-between py-2 text-sm">
                <span>{p.name}</span>
                <span className="font-mono text-primary">{p.stock} un.</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {topSelling.length > 0 && (
        <TopSellingCard topSelling={topSelling} filterType={filterType} />
      )}
    </div>
  );
}

function TopSellingCard({ topSelling, filterType }: { topSelling: Array<{ codigo: string; name: string; qty: number; totalSold: number; realProfit: number }>; filterType: "week" | "month" | "year" }) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const filtered = q
    ? topSelling
        .map((p, idx) => ({ p, originalIdx: idx }))
        .filter(({ p }) => p.name.toLowerCase().includes(q) || (p.codigo || "").toLowerCase().includes(q))
    : topSelling.map((p, idx) => ({ p, originalIdx: idx }));

  return (
    <div className="card-surface p-3 sm:p-6">
      <h2 className="text-sm sm:text-lg font-semibold flex items-center gap-2 whitespace-nowrap truncate">
        <TrendingUp className="size-4 sm:size-5 text-primary shrink-0" />
        <span className="truncate">Mais vendidos {filterType === 'month' ? 'no mês' : filterType === 'week' ? 'na semana' : 'no ano'}</span>
      </h2>
      <div className="mt-3 relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou código..."
          className="pl-8 pr-9 h-9 text-xs sm:text-sm"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary text-muted-foreground"
            aria-label="Limpar busca"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <div className="mt-3 overflow-hidden rounded-lg border border-border">
        <table className="w-full table-fixed text-[9px] sm:text-[11px] leading-tight">
          <thead className="bg-secondary/50 text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-1 sm:px-3 py-2 text-left w-[8%] whitespace-nowrap">Pos.</th>
              <th className="px-1 sm:px-3 py-2 text-left w-[16%] whitespace-nowrap">Cód.</th>
              <th className="px-1 sm:px-3 py-2 text-left w-[30%] whitespace-nowrap">Produto</th>
              <th className="px-1 sm:px-3 py-2 text-right w-[10%] whitespace-nowrap">Qtd</th>
              <th className="px-1 sm:px-3 py-2 text-right w-[18%] whitespace-nowrap">Total</th>
              <th className="px-1 sm:px-3 py-2 text-right w-[18%] whitespace-nowrap">Lucro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground text-xs">
                  Nenhum produto encontrado
                </td>
              </tr>
            ) : filtered.map(({ p, originalIdx }) => (
              <tr key={originalIdx} className="hover:bg-secondary/30">
                <td className="px-1 sm:px-3 py-1.5 font-bold text-primary whitespace-nowrap truncate">{originalIdx + 1}º</td>
                <td className="px-1 sm:px-3 py-1.5 font-mono text-[8px] sm:text-[10px] whitespace-nowrap truncate">{p.codigo}</td>
                <td className="px-1 sm:px-3 py-1.5 truncate" title={p.name}>{p.name}</td>
                <td className="px-1 sm:px-3 py-1.5 text-right font-semibold whitespace-nowrap tabular-nums">{p.qty}</td>
                <td className="px-1 sm:px-3 py-1.5 text-right font-semibold whitespace-nowrap truncate tabular-nums text-primary">{brl(p.totalSold)}</td>
                <td className="px-1 sm:px-3 py-1.5 text-right font-bold whitespace-nowrap truncate tabular-nums text-success">{brl(p.realProfit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function Stat({ icon: Icon, label, value, accent, colorClass }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: boolean; colorClass?: string }) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`size-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div className={`mt-2 text-2xl font-bold ${colorClass ? colorClass : (accent ? "text-primary" : "")}`}>{value}</div>
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

function PaymentMethodsCharts({ movs }: { movs: any[] }) {
  const getStats = (range: { start: Date; end: Date }) => {
    const methods: Record<string, number> = { "PIX": 0, "Dinheiro": 0, "Débito": 0, "Crédito": 0, "Boleto": 0 };
    let total = 0;
    movs.forEach(m => {
      const d = new Date(m.occurred_at);
      const utcDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      if (isWithinInterval(utcDate, range) && m.type === "out") {
        const val = Number(m.quantity) * Number(m.unit_price);
        const method = m.payment_method || "Dinheiro";
        if (methods[method] !== undefined) {
          methods[method] += val;
          total += val;
        }
      }
    });
    return Object.entries(methods)
      .filter(([_, v]) => v > 0)
      .map(([name, value]) => ({ name, value, percent: total > 0 ? (value/total)*100 : 0 }));
  };

  const now = new Date();
  const dayData = useMemo(() => getStats({ start: startOfDay(now), end: endOfDay(now) }), [movs]);
  const weekData = useMemo(() => getStats({ start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) }), [movs]);
  const monthData = useMemo(() => getStats({ start: startOfMonth(now), end: endOfMonth(now) }), [movs]);

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4">
      <MiniPie title="Semana" data={weekData} />
      <MiniPie title="Mês" data={monthData} />
    </div>
  );

}

function ColorLegend({ colors }: { colors: Record<string, string> }) {
  return (
    <div className="flex flex-nowrap items-center gap-x-1.5 sm:gap-x-3 gap-y-1 justify-end sm:flex-wrap">
      {Object.entries(colors).map(([name, color]) => (
        <div key={name} className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
          <div className="size-2 sm:size-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-[9px] sm:text-[11px] text-muted-foreground">{name}</span>
        </div>
      ))}
    </div>
  );
}


function MiniPie({ title, data }: { title: string; data: any[] }) {
  if (data.length === 0) return <div className="text-center py-6 text-[10px] sm:text-xs text-muted-foreground">{title}: Sem dados</div>;
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] sm:text-xs font-bold mb-1 text-center">{title}</span>
      <div className="h-24 sm:h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} innerRadius="45%" outerRadius="85%" paddingAngle={4} dataKey="value">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[entry.name as keyof typeof PAYMENT_COLORS]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, n: string, p: any) => [`${brl(v)} (${p.payload.percent.toFixed(0)}%)`, n]}
              contentStyle={{ fontSize: '11px', padding: '6px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-full mt-2 space-y-1 border-t border-border pt-2 text-left">
        {data.map((item, idx) => (
          <div key={idx} className="text-[9px] sm:text-[11px] leading-tight">
            <span className="text-muted-foreground">{item.name}: </span>
            <span className="font-semibold">{brl(item.value)}</span>
            <span className="text-muted-foreground"> ({item.percent.toFixed(0)}%)</span>
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

function computeCostBreakdown(movs: any[], feeHistory: any, range: { start: Date; end: Date }) {
  let material = 0, debitFee = 0, creditFee = 0, boletoFee = 0;
  movs.forEach(m => {
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
}

function CostBreakdownCharts({ movs, feeHistory }: { movs: any[]; feeHistory: any }) {
  const now = new Date();
  const dayData = useMemo(() => computeCostBreakdown(movs, feeHistory, { start: startOfDay(now), end: endOfDay(now) }), [movs, feeHistory]);
  const weekData = useMemo(() => computeCostBreakdown(movs, feeHistory, { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) }), [movs, feeHistory]);
  const monthData = useMemo(() => computeCostBreakdown(movs, feeHistory, { start: startOfMonth(now), end: endOfMonth(now) }), [movs, feeHistory]);
  const yearData = useMemo(() => computeCostBreakdown(movs, feeHistory, { start: startOfYear(now), end: endOfYear(now) }), [movs, feeHistory]);

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <CostMiniPie title="Semana" data={weekData} />
      <CostMiniPie title="Mês" data={monthData} />
      <CostMiniPie title="Ano" data={yearData} />
    </div>
  );
}

function CostMiniPie({ title, data }: { title: string; data: { name: string; value: number; percent: number }[] }) {
  if (data.length === 0) return <div className="text-center py-6 text-[10px] sm:text-xs text-muted-foreground">{title}: Sem dados</div>;
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] sm:text-xs font-bold mb-1 text-center">{title}</span>
      <div className="h-24 sm:h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} innerRadius="45%" outerRadius="85%" paddingAngle={4} dataKey="value">
              {data.map((entry, idx) => (
                <Cell key={`c-${idx}`} fill={COST_COLORS[entry.name] || "#8884d8"} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, n: string, p: any) => [`${brl(v)} (${p.payload.percent.toFixed(0)}%)`, n]}
              contentStyle={{ fontSize: '11px', padding: '6px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-full mt-2 space-y-1 border-t border-border pt-2 text-left">
        {data.map((item, idx) => (
          <div key={idx} className="text-[9px] sm:text-[11px] leading-tight">
            <span className="text-muted-foreground">{item.name}: </span>
            <span className="font-semibold">{brl(item.value)}</span>
            <span className="text-muted-foreground"> ({item.percent.toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );

}
