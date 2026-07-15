import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { brl } from "@/lib/format";
import { useIsAdmin } from "@/lib/useRole";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ArrowLeft } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/produtos")({
  component: ProdutosPage,
});

// Mirrors the original "Lista de Preço" sheet:
// Produto | Código | Cód. Forn. | Marca | Referencia Prod. Serv. | Compra | Venda | % Lucro (= Venda - Compra)
type Product = {
  id: string;
  sku: string | null;
  codigo: string | null;
  codigo_fornecedor: string | null;
  marca: string | null;
  referencia: string | null;
  name: string;
  supplier: string | null;
  category: string | null;
  purchase_price: number;
  sale_price: number;
  stock: number;
};

function allowReturnToAdmin() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("adm-return-allowed", "1");
  localStorage.setItem("adm-return-allowed-at", String(Date.now()));
}

function ProdutosPage() {
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Product | null>(null);
  

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, sku, codigo, codigo_fornecedor, marca, referencia, name, supplier, category, purchase_price, sale_price, stock")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = products.filter(p => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      p.name.toLowerCase().includes(needle) ||
      (p.marca ?? "").toLowerCase().includes(needle) ||
      (p.referencia ?? "").toLowerCase().includes(needle) ||
      String(p.codigo ?? "").includes(needle) ||
      (p.codigo_fornecedor ?? "").toLowerCase().includes(needle)
    );
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Produto excluído"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin" search={{ retorno: "adm" }} onPointerDown={allowReturnToAdmin} onClick={allowReturnToAdmin}>
            <Button variant="outline" size="icon" className="rounded-full" aria-label="Voltar para ADM"><ArrowLeft className="size-4" /></Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold truncate whitespace-nowrap">Lista de Preço</h1>
            <p className="text-muted-foreground">
              {products.length} itens {!isAdmin && " · somente leitura"}
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex flex-col items-center gap-1">
            <Button onClick={() => setCreating(true)} size="icon" className="bg-primary text-primary-foreground glow rounded-full size-10">
              <Plus className="size-5" />
            </Button>
            <span className="text-[10px] text-muted-foreground font-medium">Novo produto</span>
          </div>
        )}
      </div>

      <div className="card-surface flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar nome, código, marca, referência..." className="pl-9" />
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <div>
          <table className="w-full table-fixed text-[8px] sm:text-[11px] leading-tight">
            <thead className="bg-secondary/50 text-[7px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className={`px-1 sm:px-2 py-2 text-left whitespace-nowrap ${isAdmin ? 'w-[18%]' : 'w-[20%]'}`}>Produto</th>
                <th className="px-1 sm:px-2 py-2 text-right whitespace-nowrap w-[9%]">Cód.</th>
                <th className="px-1 sm:px-2 py-2 text-right whitespace-nowrap w-[9%]">C.Forn</th>
                <th className="px-1 sm:px-2 py-2 text-left whitespace-nowrap w-[10%]">Marca</th>
                <th className="px-1 sm:px-2 py-2 text-left whitespace-nowrap w-[12%]">Ref.</th>
                <th className="px-1 sm:px-2 py-2 text-right whitespace-nowrap w-[11%]">Compra</th>
                <th className="px-1 sm:px-2 py-2 text-right whitespace-nowrap w-[11%]">Venda</th>
                <th className="px-1 sm:px-2 py-2 text-right whitespace-nowrap w-[12%]">Lucro</th>
                {isAdmin && <th className="px-0 py-2 w-[8%]" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(p => {
                const compra = Number(p.purchase_price) || 0;
                const venda = Number(p.sale_price) || 0;
                const lucro = venda - compra;
                return (
                  <tr key={p.id} className="hover:bg-secondary/30">
                    <td className="px-1 sm:px-2 py-1.5 font-medium truncate" title={p.name}>{p.name}</td>
                    <td className="px-1 sm:px-2 py-1.5 text-right font-mono text-[7px] sm:text-[10px] text-primary tabular-nums whitespace-nowrap truncate">{p.codigo ?? "—"}</td>
                    <td className="px-1 sm:px-2 py-1.5 text-right text-muted-foreground tabular-nums whitespace-nowrap truncate">{p.codigo_fornecedor ?? "—"}</td>
                    <td className="px-1 sm:px-2 py-1.5 text-muted-foreground truncate" title={p.marca || ""}>{p.marca || "—"}</td>
                    <td className="px-1 sm:px-2 py-1.5 text-muted-foreground truncate" title={p.referencia || ""}>{p.referencia || "—"}</td>
                    <td className="px-1 sm:px-2 py-1.5 text-right tabular-nums whitespace-nowrap truncate">{brl(compra)}</td>
                    <td className="px-1 sm:px-2 py-1.5 text-right tabular-nums text-primary font-semibold whitespace-nowrap truncate">{brl(venda)}</td>
                    <td className={`px-1 sm:px-2 py-1.5 text-right tabular-nums font-semibold whitespace-nowrap truncate ${lucro >= 0 ? "text-success" : "text-destructive"}`}>{brl(lucro)}</td>
                    {isAdmin && (
                      <td className="px-0 py-1.5">
                        <div className="flex justify-end gap-0">
                          <Button size="icon" variant="ghost" className="h-5 w-5 sm:h-7 sm:w-7" onClick={() => setEditing(p)}><Pencil className="size-3 sm:size-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5 sm:h-7 sm:w-7" onClick={() => setConfirmDel(p)}><Trash2 className="size-3 sm:size-3.5 text-destructive" /></Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">Nenhum produto encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductDialog
        open={creating || !!editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        product={editing}
      />

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => { if (!o) setConfirmDel(null); }}
        title={confirmDel ? `Excluir "${confirmDel.name}"?` : "Excluir produto?"}
        description="Esta ação não pode ser desfeita."
        confirmLabel="Sim, excluir"
        destructive
        requirePin
        onConfirm={() => { if (confirmDel) { del.mutate(confirmDel.id); setConfirmDel(null); } }}
      />

    </div>
  );
}

function ProductDialog({ open, onClose, product }: { open: boolean; onClose: () => void; product: Product | null }) {
  const qc = useQueryClient();
  const isEdit = !!product;
  const [form, setForm] = useState<Partial<Product>>({});

  // Reset form state whenever the dialog opens or the target product changes,
  // otherwise values from a previous edit leak into the next save (and can
  // trigger unique constraint violations on `codigo`).
  useEffect(() => {
    if (open) setForm({});
  }, [open, product?.id]);

  const compra = Number(form.purchase_price ?? product?.purchase_price ?? 0);
  const venda = Number(form.sale_price ?? product?.sale_price ?? 0);

  const { data: references = [] } = useQuery({
    queryKey: ["product_references"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_references")
        .select("name, purchase_price")
        .order("name", { ascending: true });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data as { name: string; purchase_price: number }[];
    },
    enabled: open,
  });

  const upsert = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const payload = {
        name: data.name ?? product?.name ?? "",
        codigo: data.codigo !== undefined ? data.codigo : (product?.codigo ?? null),
        codigo_fornecedor: (data.codigo_fornecedor ?? product?.codigo_fornecedor) || null,
        marca: (data.marca ?? product?.marca) || null,
        referencia: (data.referencia ?? product?.referencia) || null,
        supplier: (data.supplier ?? product?.supplier) || null,
        category: (data.category ?? product?.category) || null,
        purchase_price: Number(data.purchase_price ?? product?.purchase_price ?? 0),
        sale_price: Number(data.sale_price ?? product?.sale_price ?? 0),
        stock: Number(data.stock ?? product?.stock ?? 0),
      };
      if (!payload.name) throw new Error("Nome é obrigatório");
      if (!payload.referencia) throw new Error("Referência Prod./Serv. é obrigatória");

      if (isEdit && product) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(isEdit ? "Produto atualizado" : "Produto criado");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); upsert.mutate(form); }}
          className="grid grid-cols-2 gap-3"
          key={product?.id ?? "new"}
        >
          <div className="col-span-2">
            <Field label="Produto"><Input required defaultValue={product?.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
          </div>
          <Field label="Código"><Input defaultValue={product?.codigo ?? ""} onChange={e => setForm(f => ({ ...f, codigo: e.target.value || null }))} /></Field>
          <Field label="Cód. Fornecedor"><Input defaultValue={product?.codigo_fornecedor ?? ""} onChange={e => setForm(f => ({ ...f, codigo_fornecedor: e.target.value }))} /></Field>
          <Field label="Marca"><Input defaultValue={product?.marca ?? ""} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} /></Field>
          <Field label="Referência Prod./Serv. *">
            <select
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              defaultValue={product?.referencia ?? ""}
              onChange={e => {
                const name = e.target.value;
                const ref = references.find(r => r.name === name);
                setForm(f => ({
                  ...f,
                  referencia: name || null,
                  ...(ref ? { purchase_price: Number(ref.purchase_price) || 0 } : {}),
                }));
              }}
            >
              <option value="">Selecione uma referência...</option>
              {references.map(r => (
                <option key={r.name} value={r.name}>{r.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Fornecedor"><Input defaultValue={product?.supplier ?? ""} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} /></Field>
          <Field label="Categoria"><Input defaultValue={product?.category ?? ""} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></Field>
          <Field label="Preço de compra"><Input type="number" step="0.01" min={0} value={form.purchase_price ?? product?.purchase_price ?? 0} onChange={e => setForm(f => ({ ...f, purchase_price: Number(e.target.value) }))} /></Field>
          <Field label="Preço de venda"><Input type="number" step="0.01" min={0} defaultValue={product?.sale_price ?? 0} onChange={e => setForm(f => ({ ...f, sale_price: Number(e.target.value) }))} /></Field>
          
          <div className="col-span-2 rounded-lg bg-secondary/40 p-3 text-sm">
            <span className="text-muted-foreground">% Lucro (Venda − Compra):</span>{" "}
            <span className={`float-right font-bold tabular-nums ${venda - compra >= 0 ? "text-success" : "text-destructive"}`}>{brl(venda - compra)}</span>
          </div>
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={upsert.isPending} className="bg-primary text-primary-foreground">{isEdit ? "Salvar" : "Criar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
