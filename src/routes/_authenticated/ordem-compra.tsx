import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, NotebookPen, MessageCircle, Pencil, GripVertical, Printer, FileText } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useBranding } from "@/lib/branding";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/_authenticated/ordem-compra")({
  component: OrdemCompraPage,
});

type Item = { id: string; name: string; codigo: string | null; quantity: number; checked: boolean; position: number };
type CatalogProduct = { id: string; name: string; codigo: string | null; sku: string | null };
type PurchaseListRow = { product_id: string; name: string; codigo: string | null; quantity: number; checked: boolean; position: number };
type PurchaseListPayload = Partial<PurchaseListRow> & { product_id: string; created_by?: string | null };
type DbResult<T> = PromiseLike<{ data: T | null; error: Error | null }>;
type PurchaseListTable = {
  select: (columns: string) => DbResult<PurchaseListRow[]> & { order: (column: string, options?: { ascending?: boolean }) => DbResult<PurchaseListRow[]> & { order: (column: string, options?: { ascending?: boolean }) => DbResult<PurchaseListRow[]> } };
  upsert: (payload: PurchaseListPayload | PurchaseListPayload[], options?: { onConflict?: string }) => DbResult<PurchaseListRow[]>;
  delete: () => DbResult<null> & { eq: (column: string, value: string) => DbResult<null>; neq: (column: string, value: string) => DbResult<null> };
};
const purchaseListTable = () => (supabase as unknown as { from: (table: string) => PurchaseListTable }).from("purchase_list_items");


function SortableRow({ item, onToggle, onEdit }: { item: Item; onToggle: () => void; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2 py-1.5 text-xs sm:gap-3 sm:px-4 sm:py-1.5 sm:text-sm bg-card"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        title="Arrastar para reordenar"
        aria-label="Arrastar"
      >
        <GripVertical className="size-4" />
      </button>
      <input
        type="checkbox"
        checked={item.checked}
        onChange={onToggle}
        className="size-4 shrink-0 cursor-pointer accent-primary sm:size-5"
        title="Marcar como comprado (remove da lista)"
      />
      <span className="shrink-0 font-bold tabular-nums text-primary">
        {item.codigo || "—"}
      </span>
      <span className="min-w-0 flex-1 truncate">{item.name}</span>
      <span className="shrink-0 tabular-nums font-medium">
        {item.quantity}
      </span>
      <Button variant="ghost" size="icon" className="size-7 shrink-0 sm:size-8" onClick={onEdit} title="Editar">
        <Pencil className="size-3.5 sm:size-4" />
      </Button>
    </li>
  );
}


function OrdemCompraPage() {
  const qc = useQueryClient();
  const { org } = useBranding();
  const stockEnabled = !!org?.stock_control_enabled;
  const [term, setTerm] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [cart, setCart] = useState<Array<{ id: string; name: string; codigo: string | null; quantity: number }>>([]);
  const [pending, setPending] = useState<{ id: string; name: string; codigo: string | null; isEdit?: boolean } | null>(null);
  const [pendingQty, setPendingQty] = useState<number>(1);
  const [stockConfirm, setStockConfirm] = useState<Item | null>(null);
  const [stockPicker, setStockPicker] = useState<Item | null>(null);
  const [pickerTerm, setPickerTerm] = useState("");
  
  

  const { data: items = [] } = useQuery({
    queryKey: ["purchase-list-items"],
    queryFn: async () => {
      const { data, error } = await purchaseListTable()
        .select("product_id, name, codigo, quantity, checked, position")
        .order("position", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.product_id,
        name: row.name,
        codigo: row.codigo,
        quantity: row.quantity,
        checked: row.checked,
        position: row.position ?? 0,
      })) as Item[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("purchase-list-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_list_items" }, () => {
        qc.invalidateQueries({ queryKey: ["purchase-list-items"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const { data: catalog = [] } = useQuery({
    queryKey: ["products-catalog-purchase"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, codigo, sku")
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .filter((p: CatalogProduct) =>
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.codigo ?? "").toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [term, catalog]);

  function selectProduct(p: CatalogProduct) {
    setCart(prev => {
      const idx = prev.findIndex(c => c.id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { id: p.id, name: p.name, codigo: p.codigo ?? p.sku ?? null, quantity: 1 }];
    });
    setTerm("");
  }

  function addManualToCart(name: string) {
    const n = name.trim();
    if (!n) return;
    setCart(prev => [...prev, { id: (crypto?.randomUUID?.() ?? `manual-${Date.now()}-${prev.length}`), name: n, codigo: null, quantity: 1 }]);
    setTerm("");
  }


  const addOrUpdate = useMutation({
    mutationFn: async ({ item, quantity, replace }: { item: NonNullable<typeof pending>; quantity: number; replace?: boolean }) => {
      const existing = items.find(i => i.id === item.id);
      const { data: u } = await supabase.auth.getUser();
      const maxPos = items.reduce((m, i) => Math.max(m, i.position ?? 0), 0);
      const payload: PurchaseListPayload = {
        product_id: item.id,
        name: item.name,
        codigo: item.codigo,
        quantity: replace ? quantity : (existing ? existing.quantity + quantity : quantity),
        checked: false,
        created_by: u.user?.id ?? null,
        ...(existing ? {} : { position: maxPos + 1 }),
      };
      const { error } = await purchaseListTable().upsert(payload, { onConflict: "product_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-list-items"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addManyToList = useMutation({
    mutationFn: async (entries: Array<{ id: string; name: string; codigo: string | null; quantity: number }>) => {
      if (entries.length === 0) return;
      const { data: u } = await supabase.auth.getUser();
      let maxPos = items.reduce((m, i) => Math.max(m, i.position ?? 0), 0);
      const payload: PurchaseListPayload[] = entries.map(entry => {
        const existing = items.find(i => i.id === entry.id);
        const row: PurchaseListPayload = {
          product_id: entry.id,
          name: entry.name,
          codigo: entry.codigo,
          quantity: existing ? existing.quantity + entry.quantity : entry.quantity,
          checked: false,
          created_by: u.user?.id ?? null,
        };
        if (!existing) {
          maxPos += 1;
          row.position = maxPos;
        }
        return row;
      });
      const { error } = await purchaseListTable().upsert(payload, { onConflict: "product_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-list-items"] });
      toast.success("Itens adicionados");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id?: string) => {
      const query = purchaseListTable().delete();
      const { error } = id ? await query.eq("product_id", id) : await query.neq("product_id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-list-items"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: async (newOrder: Item[]) => {
      const len = newOrder.length;
      const payload: PurchaseListPayload[] = newOrder.map((it, idx) => ({
        product_id: it.id,
        name: it.name,
        codigo: it.codigo,
        quantity: it.quantity,
        checked: it.checked,
        position: len - idx,
      }));
      const { error } = await purchaseListTable().upsert(payload, { onConflict: "product_id" });
      if (error) throw error;
    },
    onMutate: async (newOrder) => {
      await qc.cancelQueries({ queryKey: ["purchase-list-items"] });
      const prev = qc.getQueryData<Item[]>(["purchase-list-items"]);
      const len = newOrder.length;
      qc.setQueryData(["purchase-list-items"], newOrder.map((it, idx) => ({ ...it, position: len - idx })));
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["purchase-list-items"], ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["purchase-list-items"] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex(i => i.id === active.id);
    const newIdx = items.findIndex(i => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(items, oldIdx, newIdx);
    reorder.mutate(next);
  }


  function confirmPending() {
    if (!pending) return;
    const name = pending.name.trim();
    if (!name) { toast.error("Informe o nome do produto"); return; }
    const qty = Math.max(1, Number(pendingQty) || 1);
    addOrUpdate.mutate({ item: { ...pending, name }, quantity: qty, replace: pending.isEdit });
    setPending(null);
    setPendingQty(1);
  }

  function editItem(item: Item) {
    setPending({ id: item.id, name: item.name, codigo: item.codigo, isEdit: true });
    setPendingQty(item.quantity);
  }

  const addToStock = useMutation({
    mutationFn: async ({ item, targetId }: { item: Item; targetId?: string }) => {
      const productId = targetId ?? item.id;
      const { data: prod, error: e1 } = await supabase
        .from("products")
        .select("stock, name")
        .eq("id", productId)
        .maybeSingle();
      if (e1) throw e1;
      if (!prod) throw new Error("Produto não encontrado no catálogo");
      const current = Number(prod?.stock ?? 0);
      const next = current + Number(item.quantity || 0);
      const { error: e2 } = await supabase.from("products").update({ stock: next }).eq("id", productId);
      if (e2) throw e2;
      return { next, name: prod.name as string };
    },
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["stock-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Estoque atualizado: ${res.name} (${res.next})`);
      remove.mutate(vars.item.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function isValidUuid(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  }

  function toggleChecked(id: string) {
    const item = items.find(i => i.id === id);
    if (stockEnabled && item) {
      setStockConfirm(item);
      return;
    }
    remove.mutate(id);
  }






  function buildPDF() {
    const doc = new jsPDF({ orientation: "portrait", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const now = new Date();
    const dateStr = now.toLocaleDateString("pt-BR");
    const ocNumber = `OC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

    doc.setFillColor(229, 231, 235);
    doc.rect(10, 10, pageWidth - 20, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text("ORDEM DE COMPRA", 14, 22);
    doc.setFontSize(10);
    doc.text(ocNumber, pageWidth - 14, 18, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(dateStr, pageWidth - 14, 25, { align: "right" });

    autoTable(doc, {
      startY: 36,
      head: [["Código", "Produto", "Qtd"]],
      body: items.map(i => [i.codigo || "—", i.name, String(i.quantity)]),
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [229, 231, 235], textColor: 30, fontStyle: "bold" },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 40 },
        2: { halign: "center", cellWidth: 20 },
      },
    });

    return { doc, ocNumber, dateStr };
  }

  async function generatePDF(action: "download" | "print" = "download") {
    if (items.length === 0) return;
    const { doc, ocNumber } = buildPDF();
    if (action === "print") {
      const { printOrSavePdf } = await import("@/lib/pdf-print");
      printOrSavePdf(doc, `${ocNumber}.pdf`);
    } else {
      doc.save(`${ocNumber}.pdf`);
    }
  }

  async function sendWhatsApp() {
    if (items.length === 0) return;
    const { doc, ocNumber, dateStr } = buildPDF();
    const blob = doc.output("blob");
    const file = new File([blob], `${ocNumber}.pdf`, { type: "application/pdf" });
    const text = `*Ordem de Compra* ${ocNumber}\nData: ${dateStr}\nItens: ${items.length}`;

    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share?: (data?: ShareData) => Promise<void>;
    };
    const isMobile = typeof window !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    if (isMobile && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share?.({ files: [file], title: ocNumber, text });
        return;
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    // Desktop (ou mobile sem suporte a share): apenas baixa o PDF
    doc.save(`${ocNumber}.pdf`);
    toast.success("PDF baixado.");
  }

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <NotebookPen className="size-6 sm:size-7 text-primary shrink-0" />
          <h1 className="text-lg sm:text-2xl font-bold whitespace-nowrap truncate">Lista de Compras</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => { setTerm(""); setAddOpen(true); }}
            size="icon"
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 size-10"
            title="Adicionar item"
          >
            <Plus className="size-5" />
          </Button>
          {items.length > 0 && (
            <>
              <Button
                onClick={() => generatePDF("download")}
                size="icon"
                variant="outline"
                className="rounded-full size-10"
                title="Baixar PDF"
              >
                <FileText className="size-5" />
              </Button>
              <Button
                onClick={() => generatePDF("print")}
                size="icon"
                variant="outline"
                className="rounded-full size-10"
                title="Imprimir"
              >
                <Printer className="size-5" />
              </Button>
              <Button
                onClick={sendWhatsApp}
                size="icon"
                className="rounded-full bg-[#25D366] text-white hover:bg-[#1ebe5d] size-10"
                title="Enviar por WhatsApp"
              >
                <MessageCircle className="size-5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <h2 className="font-semibold">Lista de compras ({items.length})</h2>
        </div>

        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nenhum item. Toque no botão <Plus className="inline size-4 text-primary" /> para adicionar.
          </div>

        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <ul className="divide-y divide-border">
                {items.map(item => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    onToggle={() => toggleChecked(item.id)}
                    onEdit={() => editItem(item)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>


      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPending(null)}>
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="font-semibold">{pending.isEdit ? "Editar item" : "Adicionar à lista"}</h3>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Código</label>
              <Input
                value={pending.codigo ?? ""}
                onChange={e => setPending(p => p ? { ...p, codigo: e.target.value || null } : p)}
                placeholder="Opcional"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Produto</label>
              <Input
                value={pending.name}
                onChange={e => setPending(p => p ? { ...p, name: e.target.value } : p)}
                placeholder="Nome do produto"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Quantidade</label>
              <Input
                type="number"
                min={1}
                value={pendingQty}
                onChange={e => setPendingQty(Number(e.target.value))}
                onKeyDown={e => { if (e.key === "Enter") confirmPending(); }}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPending(null)}>Cancelar</Button>
              <Button onClick={confirmPending}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}


      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={() => { setAddOpen(false); setCart([]); }}>
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-xl space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold">Adicionar itens</h3>
            <Input
              autoFocus
              placeholder="Buscar por nome ou código..."
              value={term}
              onChange={e => setTerm(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && term.trim() && results.length === 0) { addManualToCart(term); } }}
            />
            <div className="max-h-48 overflow-auto rounded-md border border-border">
              {results.length > 0 ? (
                results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProduct(p)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      {p.codigo || p.sku || ""}
                      <Plus className="size-4 text-primary" />
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  {term.trim() ? "Nenhum produto encontrado." : "Digite para buscar."}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => addManualToCart(term)}
              disabled={!term.trim()}
            >
              <Plus className="size-4 mr-1" />
              {term.trim() ? `Adicionar manualmente: ${term.trim()}` : "Adicionar item manual"}
            </Button>

            {cart.length > 0 && (
              <div className="rounded-md border border-border divide-y divide-border max-h-48 overflow-auto">
                <div className="px-3 py-1.5 text-xs font-semibold bg-secondary/40">
                  Itens a adicionar ({cart.length})
                </div>
                {cart.map((c, idx) => (
                  <div key={`${c.id}-${idx}`} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-bold text-primary mr-1">{c.codigo || "—"}</span>
                      {c.name}
                    </span>
                    <Input
                      type="number"
                      min={1}
                      value={c.quantity}
                      onChange={e => {
                        const v = Math.max(1, Number(e.target.value) || 1);
                        setCart(prev => prev.map((it, i) => i === idx ? { ...it, quantity: v } : it));
                      }}
                      className="h-8 w-16 text-center"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))}
                      title="Remover"
                    >
                      <span aria-hidden>×</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setAddOpen(false); setCart([]); }}>Fechar</Button>
              <Button
                disabled={cart.length === 0 || addManyToList.isPending}
                onClick={() => {
                  addManyToList.mutate(cart, {
                    onSuccess: () => { setCart([]); setAddOpen(false); setTerm(""); },
                  });
                }}
              >
                Confirmar ({cart.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!stockConfirm}
        onOpenChange={(o) => {
          if (!o && stockConfirm) {
            // "Não": não acrescenta ao estoque, mas remove da lista (item comprado)
            remove.mutate(stockConfirm.id);
            setStockConfirm(null);
          }
        }}
        title="Acrescentar ao estoque?"
        description={stockConfirm ? `Adicionar ${stockConfirm.quantity} unidade(s) de "${stockConfirm.name}" ao estoque?` : ""}
        confirmLabel="Sim"
        cancelLabel="Não"
        onConfirm={() => {
          if (!stockConfirm) return;
          const hasValidProduct = stockConfirm.codigo && isValidUuid(stockConfirm.id);
          if (!hasValidProduct) {
            setStockPicker(stockConfirm);
            setPickerTerm("");
            setStockConfirm(null);
            return;
          }
          addToStock.mutate({ item: stockConfirm });
          setStockConfirm(null);
        }}
      />

      {stockPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={() => setStockPicker(null)}>
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-xl space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold">Selecionar produto do estoque</h3>
            <p className="text-xs text-muted-foreground">
              O item "{stockPicker.name}" não tem código vinculado. Escolha um produto do catálogo para acrescentar {stockPicker.quantity} unidade(s).
            </p>
            <Input
              autoFocus
              placeholder="Buscar por nome ou código..."
              value={pickerTerm}
              onChange={e => setPickerTerm(e.target.value)}
            />
            <div className="max-h-80 overflow-auto rounded-md border border-border divide-y divide-border">
              {(() => {
                const q = pickerTerm.trim().toLowerCase();
                const list = (catalog as CatalogProduct[]).filter(p =>
                  !q ||
                  (p.name ?? "").toLowerCase().includes(q) ||
                  (p.codigo ?? "").toLowerCase().includes(q) ||
                  (p.sku ?? "").toLowerCase().includes(q),
                );
                if (catalog.length === 0) {
                  return <div className="px-3 py-4 text-center text-sm text-muted-foreground">Lista de Preço vazia.</div>;
                }
                if (list.length === 0) {
                  return <div className="px-3 py-4 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</div>;
                }
                return list.slice(0, 200).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      addToStock.mutate({ item: stockPicker, targetId: p.id });
                      setStockPicker(null);
                      setPickerTerm("");
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span className="font-mono text-xs tabular-nums text-primary shrink-0 w-16 truncate">{p.codigo || p.sku || "—"}</span>
                    <span className="flex-1 truncate">{p.name}</span>
                  </button>
                ));
              })()}
            </div>
            <p className="text-[10px] text-muted-foreground">{catalog.length} itens na Lista de Preço</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  // Cancelar mantém o item na Lista de Compras
                  setStockPicker(null);
                  setPickerTerm("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}
