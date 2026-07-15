import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { brl, currentYM, monthLabel, ymRange } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Package as PackageIcon, FileText, ArrowLeft, Printer } from "lucide-react";
import { exportMonthlyPDF, exportMonthlyDetailedPDF } from "@/lib/pdf";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { usePaymentFeeHistory, effectiveUnitCost, feeHistoryVersion, movementExtraCost } from "@/lib/payment-fees";

export const Route = createFileRoute("/_authenticated/balanco")({
  component: BalancoPage,
});

type Kind = "despesa" | "compra_estoque";

function allowReturnToAdmin() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("adm-return-allowed", "1");
  localStorage.setItem("adm-return-allowed-at", String(Date.now()));
}

function BalancoPage() {
  const qc = useQueryClient();
  const [ym, setYm] = useState(currentYM());
  const [open, setOpen] = useState<Kind | null>(null);
  const { start, end } = ymRange(ym);

  const { data: feeHistory } = usePaymentFeeHistory();

  const { data: movementsData = { revenue: 0, salesCost: 0 } } = useQuery({
    queryKey: ["vendas-mes-completo", ym, feeHistoryVersion(feeHistory)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movements")
        .select("quantity, unit_price, unit_cost, unit_cost_includes_fee, payment_method, card_brand, occurred_at, type")
        .gte("occurred_at", start)
        .lt("occurred_at", end);
      if (error) throw error;

      const sales = data.filter(m => m.type === "out");
      const revenue = sales.reduce((s, m) => s + m.quantity * Number(m.unit_price), 0);
      const salesCost = sales.reduce((s, m) => s + m.quantity * effectiveUnitCost(m as any, feeHistory) + movementExtraCost(m as any, feeHistory), 0);

      return { revenue, salesCost };
    },
  });

  const vendas = movementsData.revenue;
  const custoMercadoria = movementsData.salesCost;

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", ym],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .gte("occurred_at", start)
        .lt("occurred_at", end)
        .order("occurred_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const despesas = expenses.filter(e => e.kind === "despesa");
  const compras = expenses.filter(e => e.kind === "compra_estoque");
  const totalDespesas = despesas.reduce((s, e) => s + Number(e.valor), 0);
  const totalCompras = compras.reduce((s, e) => s + Number(e.valor), 0);
  const lucroLiquido = vendas - (totalDespesas + custoMercadoria); // Subtracting operating expenses and product costs (COGS)

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Removido"); },
  });


  const fetchMonthMovs = async () => {
    const { data, error } = await supabase
      .from("movements")
      .select("occurred_at, type, quantity, unit_price, unit_cost, unit_cost_includes_fee, payment_method, card_brand, products(name, sku, codigo, purchase_price)")
      .gte("occurred_at", start)
      .lt("occurred_at", end)
      .order("occurred_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  };

  const handleExportPDF = async (action: "download" | "print" = "download") => {
    try {
      const movsDetail = await fetchMonthMovs();
      exportMonthlyPDF(ym, movsDetail as any, expenses as any, feeHistory, action);
      if (action === "download") toast.success("PDF gerado");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF");
    }
  };

  const handleExportDetailedPDF = async (action: "download" | "print" = "download") => {
    try {
      const movsDetail = await fetchMonthMovs();
      exportMonthlyDetailedPDF(ym, movsDetail as any, expenses as any, feeHistory, action);
      if (action === "download") toast.success("PDF detalhado gerado");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF");
    }
  };

  return (
    <div className="space-y-6">
      <div className="card-surface relative overflow-hidden p-5 sm:p-6">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-primary to-primary/40" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin" search={{ retorno: "adm" }} onPointerDown={allowReturnToAdmin} onClick={allowReturnToAdmin}>
              <Button variant="outline" size="icon" className="rounded-full" aria-label="Voltar para ADM"><ArrowLeft className="size-4" /></Button>
            </Link>
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold leading-tight whitespace-nowrap truncate">Balanço Mensal</h1>
              <p className="mt-0.5 text-xs text-muted-foreground lowercase">{monthLabel(ym)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="month" value={ym} onChange={e => setYm(e.target.value)} className="rounded-md border border-border bg-input/40 px-3 py-2 text-sm" />
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <Button onClick={() => handleExportPDF("download")} variant="outline" size="icon" className="size-10 rounded-full hover:bg-primary hover:text-primary-foreground group transition-colors" title="Baixar PDF">
                  <FileText className="size-5 text-primary group-hover:text-primary-foreground" />
                </Button>
                <Button onClick={() => handleExportPDF("print")} variant="outline" size="icon" className="size-10 rounded-full hover:bg-primary hover:text-primary-foreground group transition-colors" title="Imprimir">
                  <Printer className="size-5 text-primary group-hover:text-primary-foreground" />
                </Button>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Resumo</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <Button onClick={() => handleExportDetailedPDF("download")} size="icon" className="bg-primary text-primary-foreground glow rounded-full size-10" title="Baixar PDF">
                  <FileText className="size-5" />
                </Button>
                <Button onClick={() => handleExportDetailedPDF("print")} size="icon" className="bg-primary text-primary-foreground glow rounded-full size-10" title="Imprimir">
                  <Printer className="size-5" />
                </Button>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Detalhado</span>
            </div>
          </div>
        </div>
      </div>


      {/* Top KPIs: VENDAS, DESPESAS, COMPRAS, LUCRO LÍQUIDO — same layout as the spreadsheet header */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="VENDAS" value={brl(vendas)} icon={TrendingUp} tone="primary" />
        <Kpi label="CUSTO PRODUTOS" value={brl(custoMercadoria)} icon={PackageIcon} tone="muted" />
        <Kpi label="DESPESAS" value={brl(totalDespesas)} icon={Wallet} tone="muted" />
        <Kpi label="COMPRAS ESTOQUE" value={brl(totalCompras)} icon={PackageIcon} tone="muted" />
        <Kpi label="LUCRO LÍQUIDO" value={brl(lucroLiquido)} icon={lucroLiquido >= 0 ? TrendingUp : TrendingDown} tone={lucroLiquido >= 0 ? "success" : "destructive"} />
      </div>

      <p className="text-xs text-muted-foreground">
        Fórmula: <span className="font-mono">LUCRO LÍQUIDO = VENDAS − (DESPESAS + CUSTO PRODUTOS)</span> · Vendas e custos calculados a partir das saídas em Movimentações. "Compras" refere-se ao fluxo de caixa para aquisição de novos itens.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <ExpensesPanel
          title="Despesas"
          kind="despesa"
          rows={despesas}
          onAdd={() => setOpen("despesa")}
          onDelete={(id) => del.mutate(id)}
          total={totalDespesas}
        />
        <ExpensesPanel
          title="Compras de Estoque"
          kind="compra_estoque"
          rows={compras}
          onAdd={() => setOpen("compra_estoque")}
          onDelete={(id) => del.mutate(id)}
          total={totalCompras}
        />
      </div>

      <ExpenseDialog open={!!open} kind={open ?? "despesa"} ym={ym} onClose={() => setOpen(null)} />
    </div>
  );
}

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; tone: "primary" | "success" | "destructive" | "muted" }) {
  const color = tone === "primary" ? "text-primary" : tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="card-surface p-3 sm:p-4">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground whitespace-nowrap">{label}</span>
        <Icon className={`size-3.5 shrink-0 ${color}`} />
      </div>
      <div className={`mt-2 text-lg sm:text-xl font-bold tabular-nums whitespace-nowrap ${color}`}>{value}</div>
    </div>
  );
}

type ExpenseRow = { id: string; kind: Kind; occurred_at: string; descricao: string | null; produto: string | null; fornecedor: string | null; valor: number; note: string | null };

function ExpensesPanel({ title, kind, rows, onAdd, onDelete, total }: { title: string; kind: Kind; rows: ExpenseRow[]; onAdd: () => void; onDelete: (id: string) => void; total: number }) {
  const isCompra = kind === "compra_estoque";
  const [confirmDelId, setConfirmDelId] = useState<string | null>(null);
  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider">{title}</h2>
        <div className="flex flex-col items-center gap-0.5">
          <Button onClick={onAdd} size="icon" className="bg-primary text-primary-foreground glow rounded-full size-7">
            <Plus className="size-3.5" />
          </Button>
          <span className="text-[9px] text-muted-foreground font-medium">Adicionar</span>
        </div>
      </div>
      <div>
        <table className="w-full table-fixed text-[9px] sm:text-sm">
          <thead className="text-[8px] sm:text-[10px] uppercase tracking-tight text-muted-foreground bg-secondary/10">
            <tr>
              <th className={`px-1 sm:px-2 py-1.5 text-left font-bold whitespace-nowrap ${isCompra ? 'w-[12%]' : 'w-[14%]'}`}>Data</th>
              {isCompra && <th className="px-1 sm:px-2 py-1.5 text-left font-bold w-[22%] whitespace-nowrap">Produtos</th>}
              <th className={`px-1 sm:px-2 py-1.5 text-left font-bold whitespace-nowrap ${isCompra ? 'w-[24%]' : 'w-[36%]'}`}>Descrição</th>
              <th className={`px-1 sm:px-2 py-1.5 text-left font-bold whitespace-nowrap ${isCompra ? 'w-[18%]' : 'w-[24%]'}`}>Fornec.</th>
              <th className="px-1 sm:px-2 py-1.5 text-right font-bold w-[18%] whitespace-nowrap">Valor</th>
              <th className="w-[6%]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                <td className="px-1 sm:px-2 py-1.5 whitespace-nowrap truncate text-muted-foreground">{new Date(r.occurred_at).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' })}</td>
                {isCompra && <td className="px-1 sm:px-2 py-1.5 truncate" title={r.produto || ''}>{r.produto || "—"}</td>}
                <td className="px-1 sm:px-2 py-1.5 truncate" title={r.descricao || ''}>{r.descricao || "—"}</td>
                <td className="px-1 sm:px-2 py-1.5 truncate text-muted-foreground" title={r.fornecedor || ''}>{r.fornecedor || "—"}</td>
                <td className="px-1 sm:px-2 py-1.5 text-right tabular-nums font-bold text-foreground whitespace-nowrap truncate">{brl(Number(r.valor))}</td>
                <td className="px-0 py-1.5 text-right">
                  <Button size="icon" variant="ghost" className="size-6" onClick={() => setConfirmDelId(r.id)}>
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={isCompra ? 6 : 5} className="py-10 text-center text-muted-foreground">Nenhum lançamento.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-secondary/40 font-semibold">
              <td colSpan={isCompra ? 4 : 3} className="px-1 sm:px-3 py-2 text-right">TOTAL</td>
              <td className="px-1 sm:px-3 py-2 text-right tabular-nums text-primary whitespace-nowrap truncate">{brl(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <ConfirmDialog
        open={!!confirmDelId}
        onOpenChange={(o) => { if (!o) setConfirmDelId(null); }}
        title="Remover este lançamento?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Sim, remover"
        destructive
        requirePin
        onConfirm={() => { if (confirmDelId) { onDelete(confirmDelId); setConfirmDelId(null); } }}
      />
    </div>
  );
}

function ExpenseDialog({ open, kind, ym, onClose }: { open: boolean; kind: Kind; ym: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [descricao, setDescricao] = useState("");
  const [produto, setProduto] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [valor, setValor] = useState(0);
  const [date, setDate] = useState(() => `${ym}-01`);

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const { error } = await supabase.from("expenses").insert({
        kind, descricao: descricao || null, produto: produto || null,
        fornecedor: fornecedor || null, valor,
        occurred_at: new Date(date).toISOString(),
        created_by: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Lançamento registrado");
      setDescricao(""); setProduto(""); setFornecedor(""); setValor(0);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isCompra = kind === "compra_estoque";

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isCompra ? "Nova compra de estoque" : "Nova despesa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); create.mutate(); }} className="space-y-3">
          {isCompra && (
            <div><Label className="text-xs">Produtos</Label><Input value={produto} onChange={e => setProduto(e.target.value)} placeholder="Ex.: Chaves e Miolo" /></div>
          )}
          <div><Label className="text-xs">Descrição</Label><Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder={isCompra ? "Detalhes da compra" : "Ex.: Aluguel, Combustível"} /></div>
          <div><Label className="text-xs">Fornecedor</Label><Input value={fornecedor} onChange={e => setFornecedor(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Valor</Label><Input type="number" step="0.01" min={0} value={valor} onChange={e => setValor(Number(e.target.value))} required /></div>
            <div><Label className="text-xs">Data</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending} className="bg-primary text-primary-foreground">Registrar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
