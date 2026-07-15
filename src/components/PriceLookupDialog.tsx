import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import logoUrl from "@/assets/logo.png";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  codigo: string | null;
  sale_price: number | null;
};

export function PriceLookupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search() {
    const q = term.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    const like = `%${q}%`;
    const { data } = await supabase
      .from("products")
      .select("id,name,sku,codigo,sale_price")
      .or(`name.ilike.${like},sku.ilike.${like},codigo.ilike.${like},codigo_fornecedor.ilike.${like},referencia.ilike.${like}`)
      .order("name")
      .limit(50);
    setResults((data as Product[]) ?? []);
    setLoading(false);
  }

  function handleOpenChange(o: boolean) {
    if (!o) {
      setTerm("");
      setResults([]);
      setSearched(false);
    }
    onOpenChange(o);
  }

  const fmt = (v: number | null) =>
    v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Chaveiro TOP" className="w-10" />
            <DialogTitle>Consulta de Preços</DialogTitle>
          </div>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
          className="flex gap-2"
        >
          <Input
            autoFocus
            placeholder="Código ou nome do produto"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <Button type="submit" disabled={loading}>
            <Search className="size-4" />
          </Button>
        </form>
        <div className="max-h-80 overflow-y-auto divide-y border rounded-md">
          {loading && <div className="p-3 text-sm text-muted-foreground">Buscando...</div>}
          {!loading && searched && results.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">Nenhum produto encontrado.</div>
          )}
          {!loading &&
            results.map((p) => (
              <div key={p.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {p.codigo || p.sku || "sem código"}
                  </div>
                </div>
                <div className="text-base font-semibold text-primary whitespace-nowrap">
                  {fmt(p.sale_price)}
                </div>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
