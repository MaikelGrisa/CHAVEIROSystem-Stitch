import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { brl } from "@/lib/format";
import { useIsAdmin } from "@/lib/useRole";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, RefreshCw, ArrowLeft } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/referencias")({
  component: ReferenciasPage,
});

type Reference = {
  id: string;
  name: string;
  purchase_price: number;
};

function allowReturnToAdmin() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("adm-return-allowed", "1");
  localStorage.setItem("adm-return-allowed-at", String(Date.now()));
}

function ReferenciasPage() {
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Reference | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Reference | null>(null);
  

  // We'll create a new table 'references' via migration if it doesn't exist, 
  // but for now let's assume we use a 'references' table.
  const { data: references = [], isLoading } = useQuery({
    queryKey: ["product_references"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_references")
        .select("*")
        .order("name", { ascending: true });
      if (error) {
        // If table doesn't exist yet, we'll return empty
        if (error.code === '42P01') return [];
        throw error;
      }
      return data as Reference[];
    },
  });

  const filtered = references.filter(r => 
    !q || r.name.toLowerCase().includes(q.toLowerCase())
  );

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_references").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["product_references"] }); toast.success("Referência excluída"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncPrices = useMutation({
    mutationFn: async () => {
      // Logic to pull purchase prices from references to products
      const { data: refs } = await supabase.from("product_references").select("*");
      if (!refs) return;
      
      for (const ref of refs) {
        await supabase
          .from("products")
          .update({ purchase_price: ref.purchase_price })
          .eq("referencia", ref.name);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Preços de compra sincronizados com sucesso!");
    },
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
            <h1 className="text-xl sm:text-3xl font-bold truncate whitespace-nowrap">Produtos e Serviços</h1>
            <p className="text-muted-foreground">
              {references.length} referências de preço de compra
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Button onClick={() => syncPrices.mutate()} variant="outline" className="gap-2">
                <RefreshCw className={`size-4 ${syncPrices.isPending ? "animate-spin" : ""}`} /> Sincronizar Preços
              </Button>
              <Button onClick={() => setCreating(true)} className="bg-primary text-primary-foreground hover:opacity-90 glow gap-2">
                <Plus className="size-4" /> Nova Referência
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="card-surface flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome..." className="pl-9" />
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <div>
          <table className="w-full table-fixed text-[11px] sm:text-sm">
            <thead className="bg-secondary/50 text-[9px] sm:text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className={`px-2 sm:px-4 py-3 text-left ${isAdmin ? 'w-[58%]' : 'w-[70%]'} whitespace-nowrap truncate`}>Referência</th>
                <th className="px-2 sm:px-4 py-3 text-right w-[30%] whitespace-nowrap">Preço Compra</th>
                {isAdmin && <th className="px-1 sm:px-4 py-3 w-[12%]" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="px-2 sm:px-4 py-2 font-medium truncate" title={r.name}>{r.name}</td>
                  <td className="px-2 sm:px-4 py-2 text-right tabular-nums whitespace-nowrap truncate">{brl(r.purchase_price)}</td>
                  {isAdmin && (
                    <td className="px-1 sm:px-4 py-2">
                      <div className="flex justify-end gap-0.5">
                        <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-8 sm:w-8" onClick={() => setEditing(r)}><Pencil className="size-3 sm:size-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-8 sm:w-8" onClick={() => setConfirmDel(r)}><Trash2 className="size-3 sm:size-4 text-destructive" /></Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && !isLoading && (
                <tr><td colSpan={3} className="py-12 text-center text-muted-foreground">Nenhuma referência encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RefDialog
        open={creating || !!editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        reference={editing}
      />

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => { if (!o) setConfirmDel(null); }}
        title={confirmDel ? `Excluir "${confirmDel.name}"?` : "Excluir referência?"}
        description="Esta ação não pode ser desfeita."
        confirmLabel="Sim, excluir"
        destructive
        requirePin
        onConfirm={() => { if (confirmDel) { del.mutate(confirmDel.id); setConfirmDel(null); } }}
      />

    </div>
  );
}

function RefDialog({ open, onClose, reference }: { open: boolean; onClose: () => void; reference: Reference | null }) {
  const qc = useQueryClient();
  const isEdit = !!reference;
  const [form, setForm] = useState<Partial<Reference>>({});
  

  const upsert = useMutation({
    mutationFn: async (data: Partial<Reference>) => {
      const payload = {
        name: data.name ?? reference?.name ?? "",
        purchase_price: Number(data.purchase_price ?? reference?.purchase_price ?? 0),
      };
      if (!payload.name) throw new Error("Nome é obrigatório");
      if (isEdit && reference) {
        const { error } = await supabase.from("product_references").update(payload).eq("id", reference.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("product_references").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product_references"] });
      toast.success(isEdit ? "Referência atualizada" : "Referência criada");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar referência" : "Nova referência"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); upsert.mutate(form); }}
          className="space-y-4"
          key={reference?.id ?? "new"}
        >
          <div className="space-y-2">
            <Label>Nome (Produto | Fornecedor)</Label>
            <Input required defaultValue={reference?.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Preço de Compra</Label>
            <Input type="number" step="0.01" min={0} defaultValue={reference?.purchase_price ?? 0} onChange={e => setForm(f => ({ ...f, purchase_price: Number(e.target.value) }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={upsert.isPending} className="bg-primary text-primary-foreground">{isEdit ? "Salvar" : "Criar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
