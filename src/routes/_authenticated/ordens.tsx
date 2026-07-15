import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, FileText, ClipboardList, Pencil, MessageCircle, CheckCircle2, Printer, CalendarPlus, MapPin, Send } from "lucide-react";
import { generateServiceOrderPDF } from "@/lib/service-order-pdf";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DISPATCH_WHATSAPP, mapsLinkFrom, formatScheduleBR, googleCalendarUrl, getCurrentPosition } from "@/lib/scheduling";
import { formatPhoneBR, formatCpfCnpj, composeAddress, parseAddress } from "@/lib/br-formatters";

export const Route = createFileRoute("/_authenticated/ordens")({
  component: OrdensPage,
});

type Kind = "os" | "orcamento";
type LineItem = { description: string; quantity: number; unitPrice: number; code?: string };
type ServiceType = "automotivo" | "residencial" | "comercial_industrial";
type AutoInfo = {
  montadora: string; modelo: string; ano: string; placa: string; chassis: string;
  codAlarme: string; codImobilizador: string; codChave: string; codRadio: string;
  tipoChip: string; alarmeTelecomando: string;
};
const EMPTY_AUTO: AutoInfo = {
  montadora: "", modelo: "", ano: "", placa: "", chassis: "",
  codAlarme: "", codImobilizador: "", codChave: "", codRadio: "",
  tipoChip: "", alarmeTelecomando: "",
};
const MONTADORAS = [
  "Audi","BMW","BYD","Caoa Chery","Chery","Chevrolet","Chrysler","Citroën","Dodge","Effa",
  "Fiat","Ford","GWM","Honda","Hyundai","Iveco","JAC","Jaguar","Jeep","Kia",
  "Land Rover","Lexus","Lifan","Mahindra","Mercedes-Benz","MINI","Mitsubishi","Nissan","Peugeot","Porsche",
  "Ram","Renault","Smart","Subaru","Suzuki","Toyota","Troller","Volkswagen","Volvo",
];
const ALARME_OPCOES = ["Sem Alarme/Telecomando","Original Carro","Positron","FKS","Sistec","Taramps","Kostal"];

const MODELOS_POR_MONTADORA: Record<string, string[]> = {
  "Audi": ["A1","A3","A4","A5","A6","Q3","Q5","Q7","Q8","RS3","RS5"],
  "BMW": ["Série 1","Série 3","Série 5","Série 7","X1","X3","X5","X6"],
  "BYD": ["Dolphin","Song Plus","Yuan Plus","Han","Seal","Tan"],
  "Caoa Chery": ["Tiggo 2","Tiggo 3x","Tiggo 5x","Tiggo 7","Tiggo 8","Arrizo 5","Arrizo 6"],
  "Chery": ["QQ","Celer","Tiggo","Arrizo 5","Arrizo 6"],
  "Chevrolet": ["Onix","Onix Plus","Prisma","Cobalt","Cruze","Tracker","Spin","S10","Montana","Equinox","Trailblazer","Sonic","Novo Sonic","Celta","Classic","Corsa","Astra","Vectra","Meriva","Zafira"],
  "Chrysler": ["300C","PT Cruiser"],
  "Citroën": ["C3","C4","C4 Cactus","Aircross","Xsara","Berlingo"],
  "Dodge": ["Journey","Ram","Dakota","Durango"],
  "Effa": ["M100","Towner","Start"],
  "Fiat": ["Uno","Palio","Siena","Argo","Cronos","Mobi","Strada","Toro","Fiorino","Doblò","Punto","Bravo","Idea","500","Pulse","Fastback"],
  "Ford": ["Ka","Fiesta","Focus","EcoSport","Ranger","Territory","Bronco","Edge","Fusion","Maverick","Courier","Escort"],
  "GWM": ["Haval H6","Ora 03","Poer"],
  "Honda": ["Fit","City","Civic","HR-V","WR-V","CR-V","Accord"],
  "Hyundai": ["HB20","HB20S","Creta","Tucson","Santa Fe","i30","Azera","ix35","Elantra"],
  "Iveco": ["Daily","Tector","Stralis"],
  "JAC": ["J2","J3","J5","J6","T40","T50","T60","iEV20","iEV40"],
  "Jaguar": ["XE","XF","F-Pace","E-Pace"],
  "Jeep": ["Renegade","Compass","Commander","Cherokee","Grand Cherokee","Wrangler"],
  "Kia": ["Picanto","Rio","Cerato","Sportage","Sorento","Soul","Bongo"],
  "Land Rover": ["Discovery","Discovery Sport","Range Rover","Range Rover Evoque","Range Rover Sport","Defender"],
  "Lexus": ["IS","ES","RX","NX","UX"],
  "Lifan": ["320","530","620","X60","X80"],
  "Mahindra": ["Pik-Up","XUV500"],
  "Mercedes-Benz": ["Classe A","Classe C","Classe E","Classe S","GLA","GLC","GLE","Sprinter"],
  "MINI": ["Cooper","Countryman","Clubman"],
  "Mitsubishi": ["ASX","Eclipse Cross","Outlander","L200","Pajero","Lancer"],
  "Nissan": ["March","Versa","Sentra","Kicks","Frontier"],
  "Peugeot": ["208","2008","3008","408","5008","Partner"],
  "Porsche": ["911","Cayenne","Macan","Panamera","Taycan"],
  "Ram": ["1500","2500","3500","Rampage"],
  "Renault": ["Kwid","Sandero","Logan","Duster","Oroch","Captur","Kardian","Master"],
  "Smart": ["Fortwo","Forfour"],
  "Subaru": ["Impreza","Forester","XV","Outback"],
  "Suzuki": ["Jimny","S-Cross","Vitara","Swift"],
  "Toyota": ["Etios","Yaris","Corolla","Corolla Cross","Hilux","SW4","RAV4","Camry"],
  "Troller": ["T4"],
  "Volkswagen": ["Gol","Voyage","Polo","Virtus","Nivus","T-Cross","Taos","Saveiro","Amarok","Jetta","Passat","Tiguan","Fox","Up!","Fusca"],
  "Volvo": ["XC40","XC60","XC90","S60","S90"],
};

const META_START = "<!--META:";
const META_END = "-->";
type PartUsed = { description: string; quantity: number };
type OrdemMeta = { serviceType?: ServiceType; auto?: AutoInfo; partsUsed?: Array<string | PartUsed> };
function extractMeta(notes: string | null | undefined): { meta: OrdemMeta | null; clean: string } {
  const n = notes ?? "";
  const s = n.indexOf(META_START);
  if (s < 0) return { meta: null, clean: n };
  const e = n.indexOf(META_END, s);
  if (e < 0) return { meta: null, clean: n };
  try {
    const meta = JSON.parse(n.slice(s + META_START.length, e)) as OrdemMeta;
    const clean = (n.slice(0, s) + n.slice(e + META_END.length)).trim();
    return { meta, clean };
  } catch { return { meta: null, clean: n }; }
}
function embedMeta(clean: string, meta: OrdemMeta): string {
  const metaStr = `${META_START}${JSON.stringify(meta)}${META_END}`;
  return clean ? `${clean}\n\n${metaStr}` : metaStr;
}

const STATUS_OS: Array<{ value: string; label: string }> = [
  { value: "aberta", label: "Aberta" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelada", label: "Cancelada" },
];
const STATUS_ORC: Array<{ value: string; label: string }> = [
  { value: "aberta", label: "Pendente" },
  { value: "aprovado", label: "Aprovado" },
  { value: "rejeitado", label: "Rejeitado" },
  { value: "expirado", label: "Expirado" },
  { value: "cancelada", label: "Cancelada" },
];

const statusBadgeClass = (s: string) => {
  if (s === "concluida" || s === "entregue" || s === "aprovado") return "bg-success/15 text-success";
  if (s === "rejeitado" || s === "cancelada" || s === "expirado") return "bg-destructive/15 text-destructive";
  if (s === "em_andamento") return "bg-primary/15 text-primary";
  return "bg-muted text-muted-foreground";
};

function OrdensPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Kind | "todos">("todos");
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [confirmDelId, setConfirmDelId] = useState<string | null>(null);

  const { data: rows = [] } = useQuery({
    queryKey: ["service_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*")
        .order("number", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = rows.filter(r => filter === "todos" ? true : r.kind === filter);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service_orders"] }); toast.success("Removido"); },
  });

  const [confirmAcceptId, setConfirmAcceptId] = useState<string | null>(null);
  const accept = useMutation({
    mutationFn: async (id: string) => {
      const { data: maxRow, error: maxErr } = await supabase
        .from("service_orders")
        .select("number")
        .eq("kind", "os")
        .order("number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxErr) throw maxErr;
      const nextNumber = (Number(maxRow?.number ?? 0)) + 1;
      const { error } = await supabase
        .from("service_orders")
        .update({ kind: "os", status: "aberta", number: nextNumber })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service_orders"] }); toast.success("Orçamento aceito — convertido em OS"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const buildPDFData = (r: any) => {
    const { meta, clean } = extractMeta(r.notes);
    return {
      number: r.number,
      kind: r.kind,
      status: r.status,
      date: r.occurred_at,
      validityDate: r.validity_date,
      customer: { name: r.customer_name, phone: r.customer_phone, doc: r.customer_doc, address: r.customer_address },
      equipment: r.equipment,
      problem: r.problem,
      services: (r.services ?? []) as LineItem[],
      products: (r.products ?? []) as LineItem[],
      total: Number(r.total),
      notes: clean || null,
      showProducts: r.show_products_pdf !== false,
      scheduledAt: r.scheduled_at,
      scheduledHasTime: !!r.scheduled_has_time,
      serviceAddress: r.service_address,
      mapsLink: mapsLinkFrom({ lat: r.service_lat, lng: r.service_lng, address: r.service_address }),
      serviceType: meta?.serviceType,
      auto: meta?.auto ?? null,
      partsUsed: (meta?.partsUsed ?? []).map(p =>
        typeof p === "string" ? { description: p, quantity: 1 } : { description: p.description ?? "", quantity: Number(p.quantity) || 1 }
      ),
    };
  };

  const handlePDF = async (r: any, action: "download" | "print" = "download") => {
    try {
      await generateServiceOrderPDF(buildPDFData(r), { download: action === "download", action });
      if (action === "download") toast.success("PDF gerado");
    } catch (e) {
      console.error(e); toast.error("Erro ao gerar PDF");
    }
  };

  const handleWhatsApp = async (r: any) => {
    // Abre a aba imediatamente (gesto do usuário) para evitar bloqueio de popup no desktop
    const waWindow = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;
    try {
      const isOrc = r.kind === "orcamento";
      const tipo = isOrc ? "Orçamento" : "Ordem de Serviço";
      const numero = String(r.number).padStart(4, "0");
      const text = `Olá ${r.customer_name?.split(" ")[0] ?? ""}! Segue em anexo o ${tipo} nº ${numero} da Chaveiro TOP. Total: ${brl(Number(r.total))}.`;
      const phoneDigits = (r.customer_phone ?? "").replace(/\D/g, "");
      const phone = phoneDigits ? (phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`) : "";

      const { blob, fileName } = await generateServiceOrderPDF(buildPDFData(r), { download: false });
      const file = new File([blob], fileName, { type: "application/pdf" });

      // Mobile: Web Share API com arquivo (envia direto via app do WhatsApp)
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && nav.canShare && nav.canShare({ files: [file] })) {
        try {
          if (waWindow && !waWindow.closed) waWindow.close();
          await nav.share({ files: [file], text, title: `${tipo} ${numero}` });
          return;
        } catch (err: any) {
          if (err?.name === "AbortError") return;
        }
      }

      // Desktop (e fallback): baixa o PDF e abre o WhatsApp Web com mensagem pronta
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);

      const waMsg = `${text}\n\n(PDF "${fileName}" baixado — anexe nesta conversa.)`;
      const waUrl = phone
        ? `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(waMsg)}`
        : `https://web.whatsapp.com/send?text=${encodeURIComponent(waMsg)}`;

      if (waWindow && !waWindow.closed) {
        waWindow.location.href = waUrl;
      } else {
        // Popup bloqueado — navega na mesma aba como último recurso
        window.location.href = waUrl;
      }
      toast.success("PDF baixado — anexe no WhatsApp");
    } catch (e) {
      console.error(e);
      if (waWindow && !waWindow.closed) waWindow.close();
      toast.error("Erro ao enviar via WhatsApp");
    }
  };

  // Envia ao número fixo de despacho (+55 54 9 9158 7000) com PDF + link Maps + data
  const handleDispatch = async (r: any) => {
    if (!r.scheduled_at) {
      toast.error("Defina o agendamento (data) antes de enviar para o despacho.");
      return;
    }
    const waWindow = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;
    try {
      const isOrc = r.kind === "orcamento";
      const tipo = isOrc ? "Orçamento" : "OS";
      const numero = String(r.number).padStart(4, "0");
      const when = formatScheduleBR(r.scheduled_at, !!r.scheduled_has_time);
      const maps = mapsLinkFrom({ lat: r.service_lat, lng: r.service_lng, address: r.service_address });
      const linhas = [
        `🛠️ Agendamento — ${tipo} nº ${numero}`,
        `Cliente: ${r.customer_name}`,
        r.customer_phone ? `Telefone: ${r.customer_phone}` : "",
        `📅 ${when}`,
        r.service_address ? `📍 ${r.service_address}` : "",
        maps ? `🗺️ Localização: ${maps}` : "",
        r.equipment ? `Serviço: ${r.equipment}` : "",
      ].filter(Boolean);
      const text = linhas.join("\n");

      const { blob, fileName } = await generateServiceOrderPDF(buildPDFData(r), { download: false });
      const file = new File([blob], fileName, { type: "application/pdf" });

      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && nav.canShare && nav.canShare({ files: [file] })) {
        try {
          if (waWindow && !waWindow.closed) waWindow.close();
          await nav.share({ files: [file], text, title: `${tipo} ${numero}` });
          return;
        } catch (err: any) {
          if (err?.name === "AbortError") return;
        }
      }

      // Desktop / fallback: baixa PDF e abre WhatsApp Web já com o número de despacho
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);

      const waMsg = `${text}\n\n(PDF "${fileName}" baixado — anexe nesta conversa.)`;
      const waUrl = `https://wa.me/${DISPATCH_WHATSAPP}?text=${encodeURIComponent(waMsg)}`;
      if (waWindow && !waWindow.closed) waWindow.location.href = waUrl;
      else window.location.href = waUrl;
      toast.success("Agendamento enviado para o despacho");
    } catch (e) {
      console.error(e);
      if (waWindow && !waWindow.closed) waWindow.close();
      toast.error("Erro ao enviar agendamento");
    }
  };

  const handleGoogleCalendar = (r: any) => {
    if (!r.scheduled_at) { toast.error("Defina o agendamento (data) antes."); return; }
    const isOrc = r.kind === "orcamento";
    const tipo = isOrc ? "Orçamento" : "OS";
    const numero = String(r.number).padStart(4, "0");
    const maps = mapsLinkFrom({ lat: r.service_lat, lng: r.service_lng, address: r.service_address });
    const details = [
      `Cliente: ${r.customer_name}`,
      r.customer_phone ? `Tel: ${r.customer_phone}` : "",
      r.equipment ? `Serviço: ${r.equipment}` : "",
      maps ? `Maps: ${maps}` : "",
    ].filter(Boolean).join("\n");
    const url = googleCalendarUrl({
      title: `${tipo} ${numero} — ${r.customer_name}`,
      iso: r.scheduled_at,
      hasTime: !!r.scheduled_has_time,
      details,
      location: r.service_address || "",
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">


      <div className="card-surface relative overflow-hidden p-5 sm:p-6">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-primary to-primary/40" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold leading-tight whitespace-nowrap truncate">OS e ORÇAMENTOS</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">Gerencie suas OS e orçamentos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-full border border-border bg-secondary/30 p-1 text-xs font-semibold">
              {(["todos","os","orcamento"] as const).map(k => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`rounded-full px-3 py-1.5 transition ${filter === k ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {k === "todos" ? "Todos" : k === "os" ? "OS" : "Orçamentos"}
                </button>
              ))}
            </div>
            <Button onClick={() => { setEditing(null); setOpenDialog(true); }} size="icon" className="bg-primary text-primary-foreground glow rounded-full size-9" title="Novo">
              <Plus className="size-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile: cards */}
      <div className="sm:hidden space-y-2">
        {filtered.map(r => (
          <div key={r.id} className="card-surface p-2 space-y-1.5">
            <div className="flex items-start gap-2 text-xs">
              <div className="flex flex-col items-start shrink-0">
                <span className="text-[9px] uppercase tracking-tight text-muted-foreground font-black">Nº</span>
                <span className="font-mono font-bold">{String(r.number).padStart(4, "0")}</span>
              </div>
              <div className="flex flex-col items-start shrink-0">
                <span className="text-[9px] uppercase tracking-tight text-muted-foreground font-black">Tipo</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.kind === "os" ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}`}>
                  {r.kind === "os" ? "OS" : "Orçamento"}
                </span>
              </div>
              <div className="flex flex-col items-start shrink-0">
                <span className="text-[9px] uppercase tracking-tight text-muted-foreground font-black">Data</span>
                <span className="text-muted-foreground whitespace-nowrap">{new Date(r.occurred_at).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
              </div>
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="text-[9px] uppercase tracking-tight text-muted-foreground font-black">Cliente</span>
                <span className="truncate max-w-full" title={r.customer_name}>{r.customer_name}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 pt-4">
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="text-[9px] uppercase tracking-tight text-muted-foreground font-black">Serviço</span>
                <span className="truncate max-w-full text-xs text-muted-foreground" title={r.equipment || ""}>{r.equipment || "—"}</span>
              </div>
              <div className="shrink-0">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusBadgeClass(r.status)}`}>
                  {r.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-6">
              <div className="flex gap-0.5 shrink-0">
                {r.kind === "orcamento" && (
                  <Button size="icon" variant="ghost" className="size-7 rounded-full bg-green-600/15 hover:bg-green-600" onClick={() => setConfirmAcceptId(r.id)} title="Converter orçamento em OS">
                    <CheckCircle2 className="size-4 text-green-700 dark:text-green-400" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="size-7 rounded-full" onClick={() => handlePDF(r)} title="PDF">
                  <FileText className="size-3.5 text-primary" />
                </Button>
                <Button size="icon" variant="ghost" className="size-7 rounded-full" onClick={() => handlePDF(r, "print")} title="Imprimir">
                  <Printer className="size-3.5 text-primary" />
                </Button>
                <Button size="icon" variant="ghost" className="size-7 rounded-full" onClick={() => handleWhatsApp(r)} title="WhatsApp">
                  <MessageCircle className="size-3.5 text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" className="size-7 rounded-full" onClick={() => handleDispatch(r)} title="Enviar agendamento ao despacho">
                  <Send className="size-3.5 text-blue-600" />
                </Button>
                <Button size="icon" variant="ghost" className="size-7 rounded-full" onClick={() => handleGoogleCalendar(r)} title="Adicionar ao Google Agenda">
                  <CalendarPlus className="size-3.5 text-amber-600" />
                </Button>
                <Button size="icon" variant="ghost" className="size-7 rounded-full" onClick={() => { setEditing(r); setOpenDialog(true); }} title="Editar">
                  <Pencil className="size-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="size-7 rounded-full" onClick={() => setConfirmDelId(r.id)} title="Remover">
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
              <span className="text-xs tabular-nums font-bold">{brl(Number(r.total))}</span>

            </div>

          </div>

        ))}
        {filtered.length === 0 && (
          <div className="card-surface py-10 text-center text-muted-foreground text-sm">Nenhum registro.</div>
        )}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden sm:block card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-xs sm:text-sm">
            <thead className="text-[10px] sm:text-xs uppercase tracking-tight text-muted-foreground bg-secondary/10">
              <tr>
                <th className="px-2 py-2 text-left font-bold whitespace-nowrap">Nº</th>
                <th className="px-2 py-2 text-left font-bold whitespace-nowrap">Tipo</th>
                <th className="px-2 py-2 text-left font-bold whitespace-nowrap">Data</th>
                <th className="px-2 py-2 text-left font-bold whitespace-nowrap">Cliente</th>
                <th className="px-2 py-2 text-left font-bold whitespace-nowrap">Serviço</th>
                <th className="px-2 py-2 text-left font-bold whitespace-nowrap">Status</th>
                <th className="px-2 py-2 text-right font-bold whitespace-nowrap">Total</th>
                <th className="px-2 py-2 text-right font-bold whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-2 py-2 font-mono font-bold whitespace-nowrap">{String(r.number).padStart(4, "0")}</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold ${r.kind === "os" ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}`}>
                      {r.kind === "os" ? "OS" : "Orçamento"}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">{new Date(r.occurred_at).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                  <td className="px-2 py-2 whitespace-nowrap max-w-[180px] truncate" title={r.customer_name}>{r.customer_name}</td>
                  <td className="px-2 py-2 whitespace-nowrap max-w-[180px] truncate text-muted-foreground" title={r.equipment || ""}>{r.equipment || "—"}</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold capitalize ${statusBadgeClass(r.status)}`}>
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums font-bold whitespace-nowrap">{brl(Number(r.total))}</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="flex justify-end gap-0.5">
                    {r.kind === "orcamento" && (
                      <Button size="icon" variant="ghost" className="size-7 rounded-full bg-green-600/15 group hover:bg-green-600" onClick={() => setConfirmAcceptId(r.id)} title="Converter orçamento em OS">
                        <CheckCircle2 className="size-4 text-green-700 dark:text-green-400 group-hover:text-white" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="size-7 rounded-full group hover:bg-orange-500" onClick={() => handlePDF(r)} title="Gerar PDF">
                      <FileText className="size-3.5 text-primary group-hover:text-white" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7 rounded-full group hover:bg-orange-500" onClick={() => handlePDF(r, "print")} title="Imprimir">
                      <Printer className="size-3.5 text-primary group-hover:text-white" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7 rounded-full group hover:bg-orange-500" onClick={() => handleWhatsApp(r)} title="Enviar por WhatsApp">
                      <MessageCircle className="size-3.5 text-green-600 group-hover:text-white" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7 rounded-full group hover:bg-orange-500" onClick={() => handleDispatch(r)} title="Enviar agendamento ao despacho (+55 54 9 9158 7000)">
                      <Send className="size-3.5 text-blue-600 group-hover:text-white" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7 rounded-full group hover:bg-orange-500" onClick={() => handleGoogleCalendar(r)} title="Adicionar ao Google Agenda">
                      <CalendarPlus className="size-3.5 text-amber-600 group-hover:text-white" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7 rounded-full group hover:bg-orange-500" onClick={() => { setEditing(r); setOpenDialog(true); }} title="Editar">
                      <Pencil className="size-3.5 group-hover:text-white" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7 rounded-full group hover:bg-orange-500" onClick={() => setConfirmDelId(r.id)} title="Remover">
                      <Trash2 className="size-3.5 text-destructive group-hover:text-white" />
                    </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">Nenhum registro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>



      <OrdemDialog
        open={openDialog}
        editing={editing}
        onClose={() => { setOpenDialog(false); setEditing(null); }}
      />

      <ConfirmDialog
        open={!!confirmDelId}
        onOpenChange={(o) => { if (!o) setConfirmDelId(null); }}
        title="Remover este registro?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Sim, remover"
        destructive
        requirePin
        onConfirm={() => { if (confirmDelId) { del.mutate(confirmDelId); setConfirmDelId(null); } }}
      />

      <ConfirmDialog
        open={!!confirmAcceptId}
        onOpenChange={(o) => { if (!o) setConfirmAcceptId(null); }}
        title="Aceitar orçamento?"
        description="O orçamento será convertido em Ordem de Serviço com status Aberta."
        confirmLabel="Sim, aceitar"
        onConfirm={() => { if (confirmAcceptId) { accept.mutate(confirmAcceptId); setConfirmAcceptId(null); } }}
      />
    </div>
  );
}

function OrdemDialog({ open, editing, onClose }: { open: boolean; editing: any | null; onClose: () => void }) {
  const qc = useQueryClient();

  const { data: catalog = [] } = useQuery({
    queryKey: ["products-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, codigo, sku, sale_price")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const findByCode = (code: string) => {
    const c = code.trim().toLowerCase();
    if (!c) return null;
    return catalog.find(p =>
      (p.codigo ?? "").toLowerCase() === c ||
      (p.sku ?? "").toLowerCase() === c
    ) ?? null;
  };

  const initial = () => {
    const parsed = parseAddress(editing?.customer_address);
    const { meta, clean: cleanNotes } = extractMeta(editing?.notes);
    return {
      kind: (editing?.kind ?? "os") as Kind,
      status: editing?.status ?? "aberta",
      customer_name: editing?.customer_name ?? "",
      customer_phone: formatPhoneBR(editing?.customer_phone ?? ""),
      customer_doc: formatCpfCnpj(editing?.customer_doc ?? ""),
      customer_street: parsed.street ?? "",
      customer_neighborhood: parsed.neighborhood ?? "",
      customer_city: parsed.city ?? "",
      customer_state: parsed.state ?? "",
      equipment: editing?.equipment ?? "",
      equipment_code: "",
      problem: editing?.problem ?? "",
      services: ((editing?.services ?? []) as LineItem[]),
      products: ((editing?.products ?? []) as LineItem[]),
      occurred_at: editing?.occurred_at ? editing.occurred_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
      validity_date: editing?.validity_date ?? "",
      notes: cleanNotes,
      service_type: (meta?.serviceType ?? "residencial") as ServiceType,
      auto: { ...EMPTY_AUTO, ...(meta?.auto ?? {}) } as AutoInfo,
      show_products_pdf: editing?.show_products_pdf !== false,
      parts_used: (meta?.partsUsed ?? []).map(p =>
        typeof p === "string" ? { description: p, quantity: 1 } : { description: p.description ?? "", quantity: Number(p.quantity) || 1 }
      ) as PartUsed[],
      scheduled_date: editing?.scheduled_at ? editing.scheduled_at.slice(0, 10) : "",
      scheduled_time: editing?.scheduled_at && editing?.scheduled_has_time
        ? new Date(editing.scheduled_at).toISOString().slice(11, 16)
        : "",
      service_address: editing?.service_address ?? "",
      service_address_manual: !!editing?.service_address,
      service_lat: (editing?.service_lat ?? null) as number | null,
      service_lng: (editing?.service_lng ?? null) as number | null,
    };
  };
  const [form, setForm] = useState(initial);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const isEditing = !!editing?.id;

  // reset when dialog opens
  const [openKey, setOpenKey] = useState(0);
  if (open && openKey !== (editing?.id ? Number(`0x${editing.id.replace(/-/g, "").slice(0, 8)}`) : -1)) {
    setOpenKey(editing?.id ? Number(`0x${editing.id.replace(/-/g, "").slice(0, 8)}`) : -1);
    setForm(initial());
  }

  const setField = <K extends keyof ReturnType<typeof initial>>(k: K, v: ReturnType<typeof initial>[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));
  const setAuto = <K extends keyof AutoInfo>(k: K, v: AutoInfo[K]) =>
    setForm(prev => ({ ...prev, auto: { ...prev.auto, [k]: v } }));

  const applyEquipmentCode = () => {
    const p = findByCode(form.equipment_code);
    if (!p) { toast.error("Código não encontrado na lista de preços"); return; }
    setForm(prev => ({ ...prev, equipment: p.name, equipment_code: "" }));
  };

  const sumLines = (arr: LineItem[]) => arr.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);
  const total = sumLines(form.products) + sumLines(form.services);
  const isOrc = form.kind === "orcamento";
  const statusOpts = isOrc ? STATUS_ORC : STATUS_OS;

  const save = useMutation({
    mutationFn: async () => {
      if (!form.customer_name.trim()) throw new Error("Informe o nome do cliente");
      if (!form.customer_phone.trim()) throw new Error("Informe o telefone do cliente");
      if (!form.customer_street.trim() || !form.customer_neighborhood.trim() || !form.customer_city.trim() || !form.customer_state.trim()) {
        throw new Error("Informe o endereço completo do cliente (rua, bairro, cidade e UF)");
      }
      const composedAddress = composeAddress({
        street: form.customer_street,
        neighborhood: form.customer_neighborhood,
        city: form.customer_city,
        state: form.customer_state,
      });
      const { data: u } = await supabase.auth.getUser();
      const payload = {
        kind: form.kind,
        status: form.status as any,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone || null,
        customer_doc: form.customer_doc || null,
        customer_address: composedAddress || null,
        equipment: form.equipment || null,
        problem: form.problem || null,
        services: form.services as any,
        products: form.products as any,
        total,
        occurred_at: new Date(form.occurred_at).toISOString(),
        validity_date: isOrc && form.validity_date ? form.validity_date : null,
        notes: embedMeta(form.notes || "", {
          serviceType: form.service_type,
          auto: form.service_type === "automotivo" ? form.auto : undefined,
          partsUsed: form.parts_used
            .map(p => ({ description: (p.description ?? "").trim(), quantity: Number(p.quantity) || 0 }))
            .filter(p => p.description),
        }) || null,
        show_products_pdf: form.show_products_pdf,
        scheduled_at: form.scheduled_date
          ? new Date(`${form.scheduled_date}T${form.scheduled_time || "00:00"}:00`).toISOString()
          : null,
        scheduled_has_time: !!(form.scheduled_date && form.scheduled_time),
        service_address: (form.service_address || composedAddress) || null,
        service_lat: form.service_lat,
        service_lng: form.service_lng,
        created_by: u.user?.id ?? null,
      };
      if (editing?.id) {
        const { error } = await supabase.from("service_orders").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service_orders").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service_orders"] });
      toast.success(editing ? "Atualizado" : "Registrado");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Editar ${isOrc ? "Orçamento" : "OS"} nº ${String(editing.number).padStart(4, "0")}` : "Novo lançamento"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={e => { e.preventDefault(); if (isEditing) setConfirmEdit(true); else save.mutate(); }} className="space-y-4">
          {/* Tipo toggle deslizante */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-full border border-border bg-secondary/40 p-1 text-sm font-semibold">
              <button type="button"
                onClick={() => { setField("kind", "os"); if (!STATUS_OS.find(s => s.value === form.status)) setField("status", "aberta"); }}
                className={`rounded-full px-5 py-1.5 transition ${form.kind === "os" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}>
                Ordem de Serviço
              </button>
              <button type="button"
                onClick={() => { setField("kind", "orcamento"); if (!STATUS_ORC.find(s => s.value === form.status)) setField("status", "aberta"); }}
                className={`rounded-full px-5 py-1.5 transition ${form.kind === "orcamento" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}>
                Orçamento
              </button>
            </div>
          </div>

          {/* Cliente */}
          <fieldset className="space-y-2 rounded-lg border border-border p-3">
            <legend className="px-1 text-xs font-bold uppercase text-muted-foreground">Cliente</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label className="text-xs">Nome *</Label><Input value={form.customer_name} onChange={e => setField("customer_name", e.target.value)} required /></div>
              <div>
                <Label className="text-xs">Telefone *</Label>
                <Input
                  value={form.customer_phone}
                  onChange={e => setField("customer_phone", formatPhoneBR(e.target.value))}
                  placeholder="(54) 9 9999 9999"
                  inputMode="tel"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">CPF/CNPJ</Label>
                <Input
                  value={form.customer_doc}
                  onChange={e => setField("customer_doc", formatCpfCnpj(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Rua / Nº *</Label>
                <Input
                  value={form.customer_street}
                  onChange={e => setField("customer_street", e.target.value)}
                  placeholder="Rua Exemplo, 123"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Bairro *</Label>
                <Input value={form.customer_neighborhood} onChange={e => setField("customer_neighborhood", e.target.value)} required />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Cidade *</Label>
                  <Input value={form.customer_city} onChange={e => setField("customer_city", e.target.value)} required />
                </div>
                <div>
                  <Label className="text-xs">UF *</Label>
                  <Input
                    value={form.customer_state}
                    onChange={e => setField("customer_state", e.target.value.toUpperCase().slice(0, 2))}
                    maxLength={2}
                    placeholder="RS"
                    required
                  />
                </div>
              </div>
            </div>
          </fieldset>

          {/* Tipo de Serviço/Produto */}
          <fieldset className="space-y-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-xs font-bold uppercase text-muted-foreground">Tipo de Serviço/Produto</legend>
            <div className="flex flex-wrap gap-2">
              {([
                { v: "automotivo", l: "Automotivo" },
                { v: "residencial", l: "Residencial" },
                { v: "comercial_industrial", l: "Comercial/Industrial" },
              ] as const).map(opt => (
                <label key={opt.v} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 cursor-pointer text-xs font-medium transition ${form.service_type === opt.v ? "bg-primary text-primary-foreground border-primary" : "border-border bg-secondary/30 text-muted-foreground"}`}>
                  <input type="radio" name="service_type" className="sr-only" checked={form.service_type === opt.v} onChange={() => setField("service_type", opt.v)} />
                  {opt.l}
                </label>
              ))}
            </div>

            {form.service_type === "automotivo" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <Label className="text-xs">Montadora</Label>
                  <Select value={form.auto.montadora} onValueChange={v => setAuto("montadora", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione a montadora" /></SelectTrigger>
                    <SelectContent>{MONTADORAS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Modelo do carro</Label>
                  <Input
                    list="modelos-carro-list"
                    value={form.auto.modelo}
                    onChange={e => setAuto("modelo", e.target.value)}
                    placeholder={form.auto.montadora ? "Selecione ou digite" : "Escolha a montadora primeiro"}
                  />
                  <datalist id="modelos-carro-list">
                    {(MODELOS_POR_MONTADORA[form.auto.montadora] ?? []).map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
                <div><Label className="text-xs">Ano do carro</Label><Input value={form.auto.ano} onChange={e => setAuto("ano", e.target.value)} inputMode="numeric" /></div>
                <div><Label className="text-xs">Placa</Label><Input value={form.auto.placa} onChange={e => setAuto("placa", e.target.value.toUpperCase())} /></div>
                <div className="sm:col-span-2"><Label className="text-xs">Chassis</Label><Input value={form.auto.chassis} onChange={e => setAuto("chassis", e.target.value.toUpperCase())} /></div>
                <div><Label className="text-xs">Código do alarme</Label><Input value={form.auto.codAlarme} onChange={e => setAuto("codAlarme", e.target.value)} /></div>
                <div><Label className="text-xs">Código imobilizador</Label><Input value={form.auto.codImobilizador} onChange={e => setAuto("codImobilizador", e.target.value)} /></div>
                <div><Label className="text-xs">Código da chave</Label><Input value={form.auto.codChave} onChange={e => setAuto("codChave", e.target.value)} /></div>
                <div><Label className="text-xs">Código do rádio</Label><Input value={form.auto.codRadio} onChange={e => setAuto("codRadio", e.target.value)} /></div>
                <div><Label className="text-xs">Tipo Chip/Transponder</Label><Input value={form.auto.tipoChip} onChange={e => setAuto("tipoChip", e.target.value)} /></div>
                <div>
                  <Label className="text-xs">Alarme/Telecomando</Label>
                  <Select value={form.auto.alarmeTelecomando} onValueChange={v => setAuto("alarmeTelecomando", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{ALARME_OPCOES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </fieldset>


          {/* Produto */}
          <fieldset className="space-y-2 rounded-lg border border-border p-3">
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12">
                <Input value={form.equipment} onChange={e => setField("equipment", e.target.value)} placeholder="Ex.: Fechadura Yale YDM 4109..." className="h-9 rounded-full" />
              </div>
            </div>
            <div><Label className="text-xs">Descrição do problema / solicitação</Label><Textarea rows={2} value={form.problem} onChange={e => setField("problem", e.target.value)} /></div>
          </fieldset>

          {/* Produtos / peças / serviço */}
          <LinesEditor title="PRODUTOS/PEÇAS/SERVIÇO" items={form.products} onChange={items => setField("products", items)} />

          {/* Peças/Produtos utilizados — descrição + quantidade, sem preço */}
          <PartsUsedEditor items={form.parts_used} onChange={items => setField("parts_used", items)} />




          {/* Toggle exibição no PDF */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Exibir tabela de Peças/Produtos no PDF</Label>
              <p className="text-[11px] text-muted-foreground">Desative para ocultar a tabela de peças/produtos no PDF gerado.</p>
            </div>
            <button
              type="button"
              onClick={() => setField("show_products_pdf", !form.show_products_pdf)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${form.show_products_pdf ? "bg-primary" : "bg-muted"}`}
              aria-pressed={form.show_products_pdf}
            >
              <span className={`inline-block size-5 transform rounded-full bg-white shadow transition ${form.show_products_pdf ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Agendamento */}
          <fieldset className="space-y-2 rounded-lg border border-border p-3">
            <legend className="px-1 text-xs font-bold uppercase text-muted-foreground">Agendamento do serviço</legend>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Data</Label>
                <Input type="date" value={form.scheduled_date} onChange={e => setField("scheduled_date", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Hora (opcional)</Label>
                <Input type="time" value={form.scheduled_time} onChange={e => setField("scheduled_time", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Endereço do serviço</Label>
                <Input
                  value={form.service_address_manual ? form.service_address : composeAddress({
                    street: form.customer_street,
                    neighborhood: form.customer_neighborhood,
                    city: form.customer_city,
                    state: form.customer_state,
                  })}
                  onChange={e => {
                    setField("service_address", e.target.value);
                    setField("service_address_manual", true);
                    setField("service_lat", null);
                    setField("service_lng", null);
                  }}
                  placeholder="Puxa automático do cliente — edite se necessário"
                />
              </div>
            </div>
            {form.service_address_manual && (
              <div className="pt-1">
                <Button type="button" size="sm" variant="ghost" className="rounded-full text-xs"
                  onClick={() => { setField("service_address_manual", false); setField("service_address", ""); setField("service_lat", null); setField("service_lng", null); }}>
                  Usar endereço do cliente
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" size="sm" variant="outline" className="rounded-full text-xs"
                onClick={async () => {
                  try {
                    const { lat, lng } = await getCurrentPosition();
                    setField("service_lat", lat); setField("service_lng", lng);
                    if (form.service_address_manual && !form.service_address) {
                      setField("service_address", `Localização: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                    }
                    toast.success("Localização capturada");
                  } catch (err: any) { toast.error(err?.message || "Não foi possível obter a localização"); }
                }}>
                <MapPin className="size-3.5 mr-1" /> Usar localização atual
              </Button>
              {(() => {
                const eff = form.service_address_manual ? form.service_address : composeAddress({
                  street: form.customer_street, neighborhood: form.customer_neighborhood,
                  city: form.customer_city, state: form.customer_state,
                });
                if (!eff && !form.service_lat) return null;
                return (
                  <Button type="button" size="sm" variant="ghost" className="rounded-full text-xs"
                    onClick={() => {
                      const url = mapsLinkFrom({ lat: form.service_lat, lng: form.service_lng, address: eff });
                      if (url) window.open(url, "_blank", "noopener,noreferrer");
                    }}>
                    Pré-visualizar no Maps
                  </Button>
                );
              })()}
            </div>
            <p className="text-[11px] text-muted-foreground">A hora é opcional. O envio para o despacho via WhatsApp inclui o PDF, a data e o link de localização.</p>
          </fieldset>

          {/* Total + meta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <div>
              <Label className="text-xs">Data</Label>
              <Input type="date" value={form.occurred_at} onChange={e => setField("occurred_at", e.target.value)} required />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statusOpts.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {isOrc && (
              <div>
                <Label className="text-xs">Validade</Label>
                <Input type="date" value={form.validity_date} onChange={e => setField("validity_date", e.target.value)} />
              </div>
            )}
            <div className={isOrc ? "" : "col-span-2 sm:col-span-2"}>
              <Label className="text-xs">Valor total</Label>
              <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-right text-lg font-bold tabular-nums text-primary">{brl(total)}</div>
            </div>
          </div>

          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea rows={2} value={form.notes} onChange={e => setField("notes", e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-full">Cancelar</Button>
            <Button type="submit" disabled={save.isPending} className="bg-primary text-primary-foreground glow rounded-full">{editing ? "Salvar" : "Registrar"}</Button>
          </div>
        </form>
      </DialogContent>
      <ConfirmDialog
        open={confirmEdit}
        onOpenChange={setConfirmEdit}
        title="Confirmar edição"
        description={`Deseja realmente salvar as alterações d${isOrc ? "este orçamento" : "esta OS"}?`}
        confirmLabel="Salvar"
        requirePin
        onConfirm={() => save.mutate()}
      />
    </Dialog>
  );
}

type CatalogProduct = { id: string; name: string; codigo: string | null; sku: string | null; sale_price: number };

function LinesEditor({ title, items, onChange }: { title: string; items: LineItem[]; onChange: (i: LineItem[]) => void }) {
  const update = (idx: number, patch: Partial<LineItem>) => onChange(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  return (
    <fieldset className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <legend className="px-1 text-xs font-bold uppercase text-muted-foreground">{title}</legend>
        <div className="flex flex-col items-center gap-1">
          <Button type="button" onClick={add} size="icon" className="bg-primary text-primary-foreground glow rounded-full size-8">
            <Plus className="size-4" />
          </Button>
          <span className="text-[10px] text-muted-foreground font-medium">Adicionar</span>
        </div>
      </div>
      {items.length === 0 && <p className="text-xs text-muted-foreground">Nenhum item.</p>}
      {items.length > 0 && (
        <div className="grid grid-cols-12 gap-2 items-center text-[10px] font-semibold uppercase text-muted-foreground">
          <span className="col-span-12 sm:col-span-7">Descrição</span>
          <span className="col-span-3 sm:col-span-1 text-center">Qtd</span>
          <span className="col-span-6 sm:col-span-3 text-center">Preço unit.</span>
          <span className="col-span-3 sm:col-span-1 text-center">Ação</span>
        </div>
      )}
      {items.map((it, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
          <Input className="col-span-12 sm:col-span-7 h-8 text-xs" placeholder="Descrição" value={it.description} onChange={e => update(idx, { description: e.target.value })} />
          <Input className="col-span-3 sm:col-span-1 h-8 text-xs" type="number" min={0} step="0.01" placeholder="Qtd" value={it.quantity} onChange={e => update(idx, { quantity: Number(e.target.value) })} />
          <Input className="col-span-6 sm:col-span-3 h-8 text-xs" type="number" step="0.01" placeholder="Preço" value={it.unitPrice} onChange={e => update(idx, { unitPrice: Number(e.target.value) })} />
          <Button type="button" size="icon" variant="ghost" className="col-span-3 sm:col-span-1 size-7 rounded-full" onClick={() => remove(idx)}><Trash2 className="size-3.5 text-destructive" /></Button>
        </div>
      ))}
    </fieldset>
  );
}

function PartsUsedEditor({ items, onChange }: { items: PartUsed[]; onChange: (i: PartUsed[]) => void }) {
  const update = (idx: number, patch: Partial<PartUsed>) => onChange(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, { description: "", quantity: 1 }]);
  return (
    <fieldset className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <legend className="px-1 text-xs font-bold uppercase text-muted-foreground">Peças/Produtos Utilizados</legend>
        <div className="flex flex-col items-center gap-1">
          <Button type="button" onClick={add} size="icon" className="bg-primary text-primary-foreground glow rounded-full size-8">
            <Plus className="size-4" />
          </Button>
          <span className="text-[10px] text-muted-foreground font-medium">Adicionar</span>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Somente descrição e quantidade — sai como tabela separada no PDF, sem preço.</p>
      {items.length === 0 && <p className="text-xs text-muted-foreground">Nenhum item.</p>}
      {items.length > 0 && (
        <div className="grid grid-cols-12 gap-2 items-center text-[10px] font-semibold uppercase text-muted-foreground">
          <span className="col-span-12 sm:col-span-10">Descrição</span>
          <span className="col-span-6 sm:col-span-1 text-center">Qtd</span>
          <span className="col-span-6 sm:col-span-1 text-center">Ação</span>
        </div>
      )}
      {items.map((it, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
          <Input className="col-span-12 sm:col-span-10 h-8 text-xs" placeholder="Descrição" value={it.description} onChange={e => update(idx, { description: e.target.value })} />
          <Input className="col-span-6 sm:col-span-1 h-8 text-xs" type="number" min={0} step="1" placeholder="Qtd" value={it.quantity} onChange={e => update(idx, { quantity: Number(e.target.value) })} />
          <Button type="button" size="icon" variant="ghost" className="col-span-6 sm:col-span-1 size-7 rounded-full" onClick={() => remove(idx)}><Trash2 className="size-3.5 text-destructive" /></Button>
        </div>
      ))}
    </fieldset>
  );
}

