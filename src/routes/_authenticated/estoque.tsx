import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsAdmin } from "@/lib/useRole";
import { useBranding } from "@/lib/branding";
import { toast } from "sonner";
import { ArrowLeft, Search, Package, AlertTriangle, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadOrgHeaderInfo } from "@/lib/pdf-org";

export const Route = createFileRoute("/_authenticated/estoque")({
  component: EstoquePage,
});

type Product = {
  id: string;
  name: string;
  marca: string | null;
  referencia: string | null;
  codigo: string | null;
  stock: number;
  min_stock: number;
  stock_controlled: boolean;
};

function EstoquePage() {
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const { org, refresh: refreshBranding } = useBranding();
  const [q, setQ] = useState("");

  const enabled = !!org?.stock_control_enabled;

  const { data: products = [] } = useQuery({
    queryKey: ["stock-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, marca, referencia, codigo, stock, min_stock, stock_controlled")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Product[];
    },
  });

  const toggleOrg = useMutation({
    mutationFn: async (value: boolean) => {
      if (!org?.id) throw new Error("Organização não encontrada");
      const { error } = await supabase
        .from("organizations")
        .update({ stock_control_enabled: value })
        .eq("id", org.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Configuração atualizada");
      await refreshBranding();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateProduct = useMutation({
    mutationFn: async (payload: { id: string; patch: Partial<Product> }) => {
      const { error } = await supabase.from("products").update(payload.patch).eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stock-products"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const adjustStock = useMutation({
    mutationFn: async ({ product, newStock }: { product: Product; newStock: number }) => {
      const value = Math.max(0, Number(newStock) || 0);
      const { error } = await supabase.from("products").update({ stock: value }).eq("id", product.id);
      if (error) throw error;
      return { product, newStock: value };
    },
    onSuccess: ({ product, newStock }) => {
      qc.invalidateQueries({ queryKey: ["stock-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      if (enabled && product.stock_controlled && newStock <= product.min_stock && product.min_stock > 0) {
        toast.warning(`Estoque baixo: ${product.name} — restam ${newStock} (mín. ${product.min_stock})`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = products.filter(p => {
    if (!q) return true;
    const n = q.toLowerCase();
    return p.name.toLowerCase().includes(n)
      || (p.marca ?? "").toLowerCase().includes(n)
      || (p.referencia ?? "").toLowerCase().includes(n)
      || (p.codigo ?? "").toLowerCase().includes(n);
  });

  const lowCount = enabled
    ? products.filter(p => p.stock_controlled && p.min_stock > 0 && Number(p.stock) <= p.min_stock).length
    : 0;

  const exportInventoryPDF = async (rows: Product[], stockEnabled: boolean) => {
    try {
      const doc = new jsPDF({ orientation: "portrait", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const org = await loadOrgHeaderInfo();

      doc.setDrawColor(200);
      doc.setLineWidth(0.1);
      doc.roundedRect(8, 8, pageWidth - 16, 28, 2, 2, "D");
      try { doc.addImage(org.logoDataUrl, "PNG", 11, 11, 12, 12); } catch { /* noop */ }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30);
      doc.text(org.name, 26, 17);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80);
      if (org.cnpj) doc.text(`CNPJ: ${org.cnpj}`, 26, 22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text("INVENTÁRIO DE ESTOQUE", pageWidth - 11, 16, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(new Date().toLocaleDateString("pt-BR"), pageWidth - 11, 22, { align: "right" });

      autoTable(doc, {
        startY: 42,
        head: [["Código", "Produto", "Marca", "Ref.", "Estoque", "Mín.", "Contagem Física"]],
        body: rows.map(p => [
          p.codigo || "—",
          p.name,
          p.marca || "—",
          p.referencia || "—",
          String(p.stock),
          String(p.min_stock),
          "",
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [40, 40, 40], halign: "center" },
        columnStyles: {
          0: { halign: "center" },
          4: { halign: "center" },
          5: { halign: "center" },
          6: { halign: "center", cellWidth: 30, minCellHeight: 8 },
        },
      });

      doc.save(`inventario-${new Date().toISOString().slice(0, 10)}.pdf`);
      void stockEnabled;
    } catch (e) {
      toast.error((e as Error).message || "Falha ao gerar PDF");
    }
  };


  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Link to="/admin">
          <Button variant="outline" size="icon" className="rounded-full" aria-label="Voltar"><ArrowLeft className="size-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2"><Package className="size-6 text-primary" /> Controle de Estoque</h1>
          <p className="text-sm text-muted-foreground">{products.length} itens {enabled ? "· controle ativo" : "· controle desativado"}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Configuração da organização</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium">Controlar estoque nesta organização</p>
            <p className="text-xs text-muted-foreground">
              Quando ativado, cada venda dá baixa automaticamente no estoque dos itens marcados abaixo.
            </p>
          </div>
          <Switch
            checked={enabled}
            disabled={!isAdmin || toggleOrg.isPending}
            onCheckedChange={(v) => toggleOrg.mutate(v)}
          />
        </CardContent>
      </Card>

      {enabled && lowCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="size-4" />
          <span>{lowCount} {lowCount === 1 ? "item está" : "itens estão"} com estoque baixo ou zerado.</span>
        </div>
      )}

      <div className="card-surface flex items-center gap-3 p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por código, nome, marca ou referência..." className="pl-9" />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportInventoryPDF(filtered, enabled)}
          className="gap-2 shrink-0"
        >
          <FileText className="size-4" />
          <span className="hidden sm:inline">Inventário PDF</span>
        </Button>
      </div>

      <div className="card-surface overflow-hidden">
        <table className="w-full text-[10px] sm:text-xs">
          <thead className="bg-secondary/50 uppercase text-muted-foreground text-[9px] sm:text-[10px]">
            <tr>
              <th className="px-1 py-2 text-left">Código</th>
              <th className="px-2 py-2 text-left">Produto</th>
              <th className="px-1 py-2 text-left">Estoque</th>
              <th className="px-1 py-2 text-left">Mín.</th>
              {enabled && <th className="px-1 py-2 text-left">Controlar</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(p => {
              const low = enabled && p.stock_controlled && p.min_stock > 0 && Number(p.stock) <= p.min_stock;
              return (
                <tr key={p.id} className={low ? "bg-destructive/10" : "hover:bg-secondary/30"}>
                  <td className="px-1 py-1.5 tabular-nums font-mono text-[10px]">{p.codigo || "—"}</td>
                  <td className="px-2 py-1.5">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-[9px] text-muted-foreground truncate">{p.marca || "—"} · {p.referencia || "—"}</div>
                  </td>
                  <td className="px-1 py-1.5 text-right">
                    <Input
                      type="number"
                      min={0}
                      key={`stock-${p.id}-${p.stock}`}
                      defaultValue={p.stock}
                      disabled={!isAdmin || !enabled}
                      onBlur={(e) => {
                        const v = Number(e.target.value) || 0;
                        if (v !== p.stock) adjustStock.mutate({ product: p, newStock: v });
                      }}
                      className={`h-7 w-16 text-right tabular-nums text-xs px-1 ${low ? "text-destructive font-semibold" : ""}`}
                    />
                  </td>
                  <td className="px-1 py-1.5 text-right">
                    <Input
                      type="number"
                      min={0}
                      defaultValue={p.min_stock}
                      disabled={!isAdmin || !enabled}
                      onBlur={(e) => {
                        const v = Number(e.target.value) || 0;
                        if (v !== p.min_stock) updateProduct.mutate({ id: p.id, patch: { min_stock: v } as any });
                      }}
                      className="h-7 w-14 text-right tabular-nums text-xs px-1"
                    />
                  </td>
                  {enabled && (
                    <td className="px-1 py-1.5 text-center">
                      <Switch
                        checked={p.stock_controlled}
                        disabled={!isAdmin}
                        onCheckedChange={(v) => updateProduct.mutate({ id: p.id, patch: { stock_controlled: v } as any })}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum produto encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
