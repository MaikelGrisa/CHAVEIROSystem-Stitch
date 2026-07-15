import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { Printer, Search, Loader2, ArrowLeft, Plus, Trash2, FileText, Save } from "lucide-react";
import { generateReceiptPDF } from "@/lib/receipt-pdf";
import { formatCpfCnpj } from "@/lib/br-formatters";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useBranding } from "@/lib/branding";



type ManualItem = { id: string; description: string; quantity: number; unitPrice: number; paymentMethod: string };
const PAYMENT_OPTIONS = ["PIX", "Dinheiro", "Débito", "Crédito", "Boleto"];


export const Route = createFileRoute("/_authenticated/relatorios")({
  component: ReceiptMenuPage,
});

function ReceiptMenuPage() {
  const qc = useQueryClient();
  const { org } = useBranding();
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [taxId, setTaxId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedMovIds, setSelectedMovIds] = useState<string[]>([]);
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [mDesc, setMDesc] = useState("");
  const [mQty, setMQty] = useState<number>(1);
  const [mPrice, setMPrice] = useState<number>(0);
  const [mPayment, setMPayment] = useState<string>("Dinheiro");
  const [isSearching, setIsSearching] = useState(false);
  const [taxIdFocus, setTaxIdFocus] = useState(false);
  const [nameFocus, setNameFocus] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);


  const { data: taxIdSuggestions = [] } = useQuery({
    queryKey: ["customer-suggestions-taxid", taxId],
    queryFn: async () => {
      const digits = (taxId || "").replace(/\D/g, "");
      if (digits.length < 2) return [];
      const formatted = formatCpfCnpj(digits);
      const { data } = await supabase
        .from("customers")
        .select("*")
        .or(`tax_id.ilike.%${digits}%,tax_id.ilike.%${formatted}%`)
        .limit(8);
      return data || [];
    },
    enabled: (taxId || "").replace(/\D/g, "").length >= 2,
  });

  const { data: nameSuggestions = [] } = useQuery({
    queryKey: ["customer-suggestions-name", customerName],
    queryFn: async () => {
      if (!customerName || customerName.length < 2) return [];
      const { data } = await supabase
        .from("customers")
        .select("*")
        .ilike("name", `%${customerName}%`)
        .limit(8);
      return data || [];
    },
    enabled: customerName.length >= 2,
  });

  const pickCustomer = (c: any) => {
    setSelectedCustomerId(c.id);
    setTaxId(c.tax_id);
    setCustomerName(c.name);
    setCustomerAddress((c.details as any)?.address || "");
    setTaxIdFocus(false);
    setNameFocus(false);
    toast.success("Cliente carregado. Você pode editar os dados.");
  };

  const saveCustomerEdits = async () => {
    if (!customerName.trim() || !taxId.trim()) {
      toast.error("Informe CPF/CNPJ e Nome");
      return;
    }
    setIsSavingCustomer(true);
    try {
      if (selectedCustomerId) {
        const { error } = await supabase
          .from("customers")
          .update({ tax_id: taxId, name: customerName, details: { address: customerAddress } })
          .eq("id", selectedCustomerId);
        if (error) throw error;
        toast.success("Cadastro do cliente atualizado");
      } else {
        if (!org?.id) throw new Error("Organização não carregada");
        const { data, error } = await supabase
          .from("customers")
          .upsert(
            { organization_id: org.id, tax_id: taxId, name: customerName, details: { address: customerAddress } },
            { onConflict: "organization_id,tax_id" }
          )
          .select()
          .single();
        if (error) throw error;
        setSelectedCustomerId(data.id);
        toast.success("Cliente cadastrado");
      }
      qc.invalidateQueries({ queryKey: ["customer-suggestions-taxid"] });
      qc.invalidateQueries({ queryKey: ["customer-suggestions-name"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar cliente");
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const deleteCustomer = async () => {
    if (!selectedCustomerId) return;
    setIsSavingCustomer(true);
    try {
      const { error } = await supabase.from("customers").delete().eq("id", selectedCustomerId);
      if (error) throw error;
      toast.success("Cliente excluído");
      setSelectedCustomerId(null);
      setTaxId("");
      setCustomerName("");
      setCustomerAddress("");
      qc.invalidateQueries({ queryKey: ["customer-suggestions-taxid"] });
      qc.invalidateQueries({ queryKey: ["customer-suggestions-name"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir cliente");
    } finally {
      setIsSavingCustomer(false);
    }
  };


  const addManualItem = () => {
    const desc = mDesc.trim();
    if (!desc) { toast.error("Informe a descrição"); return; }
    if (mQty <= 0) { toast.error("Quantidade deve ser maior que zero"); return; }
    if (mPrice < 0) { toast.error("Preço inválido"); return; }
    setManualItems(prev => [...prev, {
      id: crypto.randomUUID(),
      description: desc.slice(0, 200),
      quantity: mQty,
      unitPrice: mPrice,
      paymentMethod: mPayment,
    }]);
    setMDesc(""); setMQty(1); setMPrice(0);
  };


  // Fetch movements for selected date
  const { data: movements = [], isLoading: isLoadingMovs } = useQuery({
    queryKey: ["movements-for-receipt", dateFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movements")
        .select("*, products(name)")
        .eq("type", "out")
        .gte("occurred_at", `${dateFilter}T00:00:00`)
        .lte("occurred_at", `${dateFilter}T23:59:59`)
        .order("occurred_at", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch or Search Customer data
  const handleSearchCustomer = async () => {
    if (!taxId) return;
    setIsSearching(true);
    const cleanTaxId = taxId.replace(/\D/g, "");
    
    try {
      const { data: cached } = await supabase.from("customers").select("*").eq("tax_id", taxId).single();
      
      if (cached) {
        setCustomerName(cached.name);
        setCustomerAddress((cached.details as any)?.address || "");
        toast.success("Cliente encontrado no cadastro");
      } else {
        toast.info("Buscando dados na Receita...");
        
        if (cleanTaxId.length === 14) {
          const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanTaxId}`);
          if (resp.ok) {
            const data = await resp.json();
            // Using razao_social as the primary name from the search
            const companyName = data.razao_social || data.nome_fantasia;
            setCustomerName(companyName);
            const addr = `${data.logradouro}, ${data.numero}${data.complemento ? " " + data.complemento : ""} - ${data.bairro}, ${data.municipio}/${data.uf}`;
            setCustomerAddress(addr);
            toast.success("Empresa encontrada: " + companyName);
          } else {
            toast.error("CNPJ não encontrado");
          }
        } else if (cleanTaxId.length === 11) {
          await new Promise(r => setTimeout(r, 800));
          toast.info("Busca de CPF requer consulta manual ou serviço pago. Por favor, insira o nome.");
        } else {
          toast.error("Documento inválido");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao conectar com o serviço de busca");
    } finally {
      setIsSearching(false);
    }
  };

  const selectedItems = useMemo(() => {
    return movements.filter(m => selectedMovIds.includes(m.id));
  }, [movements, selectedMovIds]);

  const totalAmount = useMemo(() => {
    const a = selectedItems.reduce((sum, m) => sum + (m.quantity * Number(m.unit_price)), 0);
    const b = manualItems.reduce((sum, m) => sum + m.quantity * m.unitPrice, 0);
    return a + b;
  }, [selectedItems, manualItems]);

  const totalCount = selectedItems.length + manualItems.length;


  const printReceipt = useMutation({
    mutationFn: async (action: "download" | "print" = "download") => {
      // Defaults quando cliente não informado
      const defaultAddress = [org?.city, (org?.state || "").toUpperCase()].filter(Boolean).join("/") || "Cidade/Estado";
      const finalName = customerName.trim() || "CONSUMIDOR FINAL";
      const finalTaxId = taxId.trim() || "000.000.000-00";
      const finalAddress = customerAddress.trim() || defaultAddress;
      const isAnonymous = !customerName.trim() || !taxId.trim();

      // 1. Get next receipt number (atomic, per organization)
      const { data: nextNum, error: numErr } = await supabase.rpc("next_receipt_number");
      if (numErr) throw numErr;
      const currentNumber = Number(nextNum);

      // 2. Save/Update Customer (apenas se dados reais informados)
      let customerId: string | null = null;
      if (!isAnonymous) {
        if (!org?.id) throw new Error("Organização não carregada");
        const { data: customer, error: custError } = await supabase
          .from("customers")
          .upsert(
            { organization_id: org.id, tax_id: finalTaxId, name: finalName, details: { address: finalAddress } },
            { onConflict: "organization_id,tax_id" }
          )
          .select()
          .single();
        if (custError) throw custError;
        customerId = customer.id;
      }

      // 3. Create Receipt record (vendas selecionadas + itens manuais)
      const items = [
        ...selectedItems.map(m => ({
          description: m.products?.name || "Serviço/Produto",
          quantity: m.quantity,
          unitPrice: Number(m.unit_price),
          total: m.quantity * Number(m.unit_price),
          paymentMethod: m.payment_method || undefined,
        })),
        ...manualItems.map(m => ({
          description: m.description,
          quantity: m.quantity,
          unitPrice: m.unitPrice,
          total: m.quantity * m.unitPrice,
          paymentMethod: m.paymentMethod || undefined,
        })),
      ];


      const { error: receiptError } = await supabase.from("receipts").insert({
        receipt_number: currentNumber,
        customer_id: customerId,
        customer_data: { name: finalName, taxId: finalTaxId, address: finalAddress },
        items,
        total_amount: totalAmount,
        created_by: (await supabase.auth.getUser()).data.user?.id
      });
      if (receiptError) throw receiptError;


      // 5. Generate PDF
      await generateReceiptPDF({
        receiptNumber: currentNumber,
        date: new Date().toISOString(),
        customer: { name: finalName, taxId: finalTaxId, address: finalAddress },
        items,
        totalAmount
      }, action);

      return currentNumber;
    },
    onSuccess: (num) => {
      toast.success(`Recibo Nº ${num} gerado com sucesso!`);
      setSelectedMovIds([]);
      setManualItems([]);
    },

    onError: (e: any) => toast.error(e.message)
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link to="/movimentacoes">
          <Button variant="outline" size="icon" className="rounded-full shadow-sm">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="text-xl sm:text-3xl font-bold truncate whitespace-nowrap">Emissão de Recibo</h1>
      </div>


      <div className="grid gap-6">
        <Card>
          <CardHeader><CardTitle>1. Dados do Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>CPF ou CNPJ</Label>
              <div className="flex gap-2 relative">
                <div className="flex-1 relative">
                  <Input
                    placeholder="000.000.000-00"
                    value={taxId}
                    onChange={e => { setTaxId(formatCpfCnpj(e.target.value)); setSelectedCustomerId(null); }}
                    onFocus={() => setTaxIdFocus(true)}
                    onBlur={() => setTimeout(() => setTaxIdFocus(false), 200)}
                  />

                  {taxIdFocus && taxIdSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                      {taxIdSuggestions.map((c: any) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => pickCustomer(c)}
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                        >
                          <div className="font-medium">{c.tax_id}</div>
                          <div className="text-xs text-muted-foreground">{c.name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="secondary" onClick={handleSearchCustomer} disabled={isSearching || !taxId}>
                  {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome Completo / Razão Social</Label>
              <div className="relative">
                <Input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  onFocus={() => setNameFocus(true)}
                  onBlur={() => setTimeout(() => setNameFocus(false), 200)}
                />
                {nameFocus && nameSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                    {nameSuggestions.map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => pickCustomer(c)}
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                      >
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.tax_id}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endereço (Opcional)</Label>
              <Input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
            </div>
            <div className="flex items-center justify-between gap-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {selectedCustomerId ? "Editando cliente já cadastrado" : "Novo cliente (será criado ao salvar)"}
              </p>
              <div className="flex gap-2">
                {selectedCustomerId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteOpen(true)}
                    disabled={isSavingCustomer}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    Excluir
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={saveCustomerEdits}
                  disabled={isSavingCustomer || !customerName || !taxId}
                  className="gap-2"
                >
                  {isSavingCustomer ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {selectedCustomerId ? "Atualizar cadastro" : "Salvar cliente"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>


        <Card>
          <CardHeader><CardTitle>2. Selecionar Vendas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Data das Vendas</Label>
              <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            </div>
            
            <div className="max-h-[300px] overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px] px-2"></TableHead>
                    <TableHead className="px-2">Produto/Serviço</TableHead>
                    <TableHead className="text-right px-2 w-[80px]">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="px-2">
                        <Checkbox 
                          checked={selectedMovIds.includes(m.id)} 
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedMovIds([...selectedMovIds, m.id]);
                            else setSelectedMovIds(selectedMovIds.filter(id => id !== m.id));
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-[11px] sm:text-xs font-medium px-2 leading-tight">
                        <div className="line-clamp-1" title={`${m.products?.name || "S/N"} (x${m.quantity})`}>
                          {m.products?.name || "S/N"} <span className="text-muted-foreground">(x{m.quantity})</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-[11px] sm:text-xs tabular-nums px-2 font-semibold">
                        {brl(m.quantity * Number(m.unit_price))}
                      </TableCell>
                    </TableRow>
                  ))}
                  {movements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-xs">
                        {isLoadingMovs ? "Carregando..." : "Nenhuma venda nesta data."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>

          <CardHeader><CardTitle>3. Itens Manuais (produto ou serviço avulso)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-5 space-y-1">
                <Label className="text-xs">Descrição</Label>
                <Input
                  value={mDesc}
                  onChange={e => setMDesc(e.target.value)}
                  placeholder="Ex.: Cópia de chave codificada"
                  maxLength={200}
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Qtd</Label>
                <Input type="number" min={1} step={1} value={mQty} onChange={e => setMQty(Number(e.target.value))} />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Preço Unit.</Label>
                <Input type="number" min={0} step="0.01" value={mPrice} onChange={e => setMPrice(Number(e.target.value))} />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Pagamento</Label>
                <select
                  value={mPayment}
                  onChange={e => setMPayment(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {PAYMENT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="sm:col-span-1 flex items-end">
                <Button type="button" onClick={addManualItem} className="w-full gap-1">
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            {manualItems.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-2">Descrição</TableHead>
                      <TableHead className="text-center px-2 w-[60px]">Qtd</TableHead>
                      <TableHead className="text-right px-2 w-[90px]">Unit.</TableHead>
                      <TableHead className="text-center px-2 w-[90px]">Pagto</TableHead>
                      <TableHead className="text-right px-2 w-[90px]">Total</TableHead>
                      <TableHead className="w-[40px] px-1" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manualItems.map(it => (
                      <TableRow key={it.id}>
                        <TableCell className="text-xs px-2">{it.description}</TableCell>
                        <TableCell className="text-center text-xs px-2">{it.quantity}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums px-2">{brl(it.unitPrice)}</TableCell>
                        <TableCell className="text-center text-xs px-2">{it.paymentMethod}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums px-2 font-semibold">{brl(it.quantity * it.unitPrice)}</TableCell>
                        <TableCell className="px-1">
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => setManualItems(prev => prev.filter(x => x.id !== it.id))}>
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {totalCount > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Resumo do Recibo</p>
              <p className="text-2xl font-bold">{totalCount} {totalCount === 1 ? "item" : "itens"} - Total: {brl(totalAmount)}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 px-6"
                onClick={() => printReceipt.mutate("download")}
                disabled={printReceipt.isPending}
              >
                {printReceipt.isPending ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                Baixar PDF
              </Button>
              <Button
                size="lg"
                className="gap-2 px-8"
                onClick={() => printReceipt.mutate("print")}
                disabled={printReceipt.isPending}
              >
                {printReceipt.isPending ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
                Imprimir Recibo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Excluir cliente "${customerName}"?`}
        description="Esta ação não pode ser desfeita. Os recibos já emitidos serão mantidos no histórico."
        confirmLabel="Excluir"
        destructive
        requirePin
        onConfirm={deleteCustomer}
      />

    </div>
  );
}
