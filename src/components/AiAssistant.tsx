import { useState, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { Send, X, FileText, Share2, Trash2, Loader2, Mic, Square, Printer } from "lucide-react";
import aiBtnUrl from "@/assets/ai-button-transparent.png";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { header, footer, HEADER_BOTTOM, loadLogoDataUrl } from "@/lib/pdf";
import { askLocksmithAi } from "@/lib/ai-chat.functions";



type Msg = { role: "user" | "assistant"; content: string; at: number };

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};

const STORAGE_KEY = "km-ai-chat-v3";
const STALE_ERROR_RE = /LOVABLE_APY|LOVABLE_API_KEY\s+n[ãa]o\s+configurada/i;

function loadMessages(): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((message) => !STALE_ERROR_RE.test(String(message?.content ?? "")));
  } catch { return []; }
}

function renderInline(text: string) {
  const parts: Array<ReactNode> = [];
  const regex = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let last = 0; let m: RegExpExecArray | null; let i = 0;
  while ((m = regex.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={i++} className="font-semibold text-foreground">{m[1]}</strong>);
    else if (m[2]) parts.push(<code key={i++} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{m[2]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderMarkdown(content: string) {
  const lines = content.split("\n");
  return lines.map((line, idx) => {
    if (/^#{1,6}\s/.test(line)) {
      const txt = line.replace(/^#+\s/, "");
      return <div key={idx} className="mt-2 font-bold text-foreground">{renderInline(txt)}</div>;
    }
    if (/^[-*]\s/.test(line)) {
      return <div key={idx} className="ml-3 flex gap-2"><span className="text-primary">•</span><span>{renderInline(line.replace(/^[-*]\s/, ""))}</span></div>;
    }
    if (/^\s*$/.test(line)) return <div key={idx} className="h-2" />;
    return <div key={idx}>{renderInline(line)}</div>;
  });
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(data.error || `Falha na IA (${res.status})`);
  return data;
}

type FormKind =
  | { kind: "abrir" }
  | { kind: "micha-tipo" }
  | { kind: "micha-auto" }
  | { kind: "micha-resid" }
  | { kind: "programar" };

const PRESETS = [
  { label: "Como abrir um veículo?", form: { kind: "abrir" } as FormKind },
  { label: "Qual micha usar?", form: { kind: "micha-tipo" } as FormKind },
  { label: "Como programar/clonar chave automotiva nova?", form: { kind: "programar" } as FormKind },
];

export function AiAssistant({ variant = "inline" }: { variant?: "inline" | "floating" } = {}) {
  const askAi = useServerFn(askLocksmithAi);
  const [open, setOpen] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeForm, setActiveForm] = useState<FormKind | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [recording, setRecording] = useState(false);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  function mergeTranscript(text: string) {
    const clean = text.trim();
    if (!clean) return;
    setInput((current) => (current ? `${current.trimEnd()} ${clean}` : clean));
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function startRecording() {
    if (recording || loading) return;
    const SpeechRecognition = typeof window !== "undefined"
      ? ((window as WindowWithSpeechRecognition).SpeechRecognition ?? (window as WindowWithSpeechRecognition).webkitSpeechRecognition)
      : undefined;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        speechRecognitionRef.current = recognition;
        recognition.lang = "pt-BR";
        recognition.interimResults = false;
        recognition.continuous = false;
        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0]?.transcript ?? "")
            .join(" ");
          mergeTranscript(transcript);
        };
        recognition.onerror = () => {
          toast.error("Não foi possível captar a fala. Tente novamente.");
        };
        recognition.onend = () => {
          setRecording(false);
          speechRecognitionRef.current = null;
        };
        recognition.start();
        setRecording(true);
        return;
      } catch {
        speechRecognitionRef.current = null;
        setRecording(false);
      }
    }

    toast.error("Ditado por voz não disponível neste navegador. Digite sua pergunta.");
  }

  function stopRecording() {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setRecording(false);
      return;
    }
    setRecording(false);
  }


  // Sem persistência: histórico só vive enquanto a tela está aberta.
  // Ao fechar, é descartado (economiza tokens Gemini e protege privacidade).
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Limpa qualquer histórico antigo salvo em versões anteriores
      localStorage.removeItem("km-ai-chat-v1");
      localStorage.removeItem("km-ai-chat-v2");
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 80);
    } else {
      // Fechou a tela → limpa tudo
      setMessages([]);
      setActiveForm(null);
      setInput("");
    }
  }, [open, messages.length]);

  async function sendText(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: t, at: Date.now() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const payload = next.map(m => ({ role: m.role, content: m.content }));
      let content = "";
      try {
        const response = await postJson<{ content: string }>("/api/ai-chat", { messages: payload });
        content = response.content;
      } catch (apiError) {
        const apiMessage = apiError instanceof Error ? apiError.message : String(apiError);
        if (!STALE_ERROR_RE.test(apiMessage)) throw apiError;

        const response = await askAi({ data: { messages: payload } });
        content = response.content;
      }
      const safe = (content && content.trim()) || "_(Resposta vazia da IA. Tente reformular a pergunta.)_";
      setMessages([...next, { role: "assistant", content: safe, at: Date.now() }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao consultar a IA";
      const visibleMsg = STALE_ERROR_RE.test(msg)
        ? "Não foi possível conectar à IA agora. Tente novamente."
        : msg;
      console.error("[AiAssistant] erro:", e);
      toast.error(visibleMsg);
      if (STALE_ERROR_RE.test(msg) && typeof window !== "undefined") {
        localStorage.removeItem("km-ai-chat-v1");
        localStorage.removeItem("km-ai-chat-v2");
        localStorage.removeItem(STORAGE_KEY);
      }
      setMessages([...next, { role: "assistant", content: `⚠️ **Erro:** ${visibleMsg}`, at: Date.now() }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }

  }

  function clearChat() {
    if (!confirm("Limpar toda a conversa?")) return;
    setMessages([]);
    setActiveForm(null);
  }

  async function buildPdf() {
    const { loadOrgHeaderInfo } = await import("@/lib/pdf-org");
    const orgInfo = await loadOrgHeaderInfo();
    const doc = new jsPDF();
    header(doc, "Consulta IA Chaveiro", `${messages.length} mensagens`, orgInfo);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = HEADER_BOTTOM;
    const marginX = 14;
    const maxWidth = pageWidth - marginX * 2;

    for (const m of messages) {
      const label = m.role === "user" ? "Pergunta" : "Resposta IA";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(m.role === "user" ? 30 : 200, m.role === "user" ? 30 : 90, m.role === "user" ? 30 : 20);
      if (y > pageHeight - 25) { doc.addPage(); y = HEADER_BOTTOM; }
      doc.text(`${label} — ${new Date(m.at).toLocaleString("pt-BR")}`, marginX, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(40);
      const clean = m.content.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
      const lines = doc.splitTextToSize(clean, maxWidth) as string[];
      for (const ln of lines) {
        if (y > pageHeight - 15) { doc.addPage(); y = HEADER_BOTTOM; }
        doc.text(ln, marginX, y);
        y += 5;
      }
      y += 4;
    }
    footer(doc);
    return doc;
  }

  async function downloadPdf() {
    if (!messages.length) { toast.error("Nenhuma mensagem para exportar"); return; }
    const doc = await buildPdf();
    const fname = `consulta-ia-${new Date().toISOString().slice(0, 10)}.pdf`;
    const blob = doc.output("blob");

    // Mobile-safe: doc.save() falha silenciosamente em iOS Safari / WebView Android.
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

    if (isMobile) {
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };
      const file = new File([blob], fname, { type: "application/pdf" });
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        try { await nav.share({ files: [file], title: "Consulta IA Chaveiro" }); return; }
        catch { /* fallback abaixo */ }
      }
      // Fallback: abre o PDF numa nova aba para o usuário salvar manualmente.
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (!win) {
        // Pop-up bloqueado — força o anchor download
        const a = document.createElement("a");
        a.href = url; a.download = fname; a.rel = "noopener";
        document.body.appendChild(a); a.click(); a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success("PDF gerado. Use o menu do navegador para salvar/compartilhar.");
      return;
    }

    doc.save(fname);
  }

  async function printPdf() {
    if (!messages.length) { toast.error("Nenhuma mensagem para imprimir"); return; }
    const doc = await buildPdf();
    const fname = `consulta-ia-${new Date().toISOString().slice(0, 10)}.pdf`;
    const { printOrSavePdf } = await import("@/lib/pdf-print");
    printOrSavePdf(doc, fname);
  }



  async function shareWhatsapp() {
    if (!messages.length) { toast.error("Nenhuma mensagem para enviar"); return; }
    const doc = await buildPdf();
    const fname = `consulta-ia-${new Date().toISOString().slice(0, 10)}.pdf`;
    const blob = doc.output("blob");
    const file = new File([blob], fname, { type: "application/pdf" });
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> }) : null;
    if (nav?.canShare?.({ files: [file] }) && nav.share) {
      try {
        await nav.share({ files: [file], title: "Consulta IA Chaveiro", text: "Consulta IA Chaveiro TOP" });
        return;
      } catch { /* fallback */ }
    }
    doc.save(fname);
    const txt = encodeURIComponent("Segue consulta da IA Chaveiro TOP (PDF em anexo).");
    window.open(`https://wa.me/?text=${txt}`, "_blank");
    toast.success("PDF baixado. Anexe-o no WhatsApp que abriu.");
  }

  // Trigger styles — visible & accessible on both mobile and desktop
  const triggerClass = variant === "floating"
    ? "hidden md:inline-flex fixed bottom-6 right-6 z-[60] size-16 items-center justify-center rounded-full bg-transparent transition hover:scale-110 active:scale-95"
    : "relative inline-flex size-11 items-center justify-center rounded-full bg-transparent transition hover:scale-105 active:scale-95";
  const iconSize = variant === "floating" ? "size-12 md:size-14" : "size-9";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Assistente IA"
        title="Assistente IA Chaveiro"
        className={triggerClass}
      >
        <img src={aiBtnUrl} alt="" aria-hidden className={`${iconSize} object-contain`} />
        <span className={`absolute ${variant === "floating" ? "top-1 right-1 size-3.5" : "-top-0.5 -right-0.5 size-3"} flex`}>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-full w-full rounded-full bg-emerald-500 ring-2 ring-background" />
        </span>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/50 backdrop-blur-sm sm:items-stretch sm:justify-end" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-[100dvh] w-full max-w-2xl flex-col bg-background shadow-2xl sm:rounded-l-2xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border bg-gradient-to-r from-primary/10 to-transparent px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-emerald-500/40 overflow-hidden">
                  <img src={aiBtnUrl} alt="" className="size-7 object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold leading-tight truncate">Assistente IA</div>
                  <div className="text-[11px] text-muted-foreground leading-tight">Especialista em chaveiro · em tempo real</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={downloadPdf} title="Baixar PDF" className="gap-1 px-2">
                  <FileText className="size-4" /><span className="hidden sm:inline text-xs">PDF</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={printPdf} title="Imprimir" className="gap-1 px-2">
                  <Printer className="size-4" /><span className="hidden sm:inline text-xs">Imprimir</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={shareWhatsapp} title="Enviar via WhatsApp" className="gap-1 px-2 text-emerald-600 hover:text-emerald-700">
                  <Share2 className="size-4" /><span className="hidden sm:inline text-xs">WhatsApp</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={clearChat} title="Limpar conversa" className="px-2 text-destructive hover:text-destructive">
                  <Trash2 className="size-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="px-2"><X className="size-5" /></Button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>Olá! Sou seu assistente especialista!</p>
                  <p>Posso ajudar com situações e dúvidas sobre:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Qual Micha Lishi usar por montadora, veículo</li>
                    <li>• Qual Micha Lishi usar em aberturas residenciais</li>
                    <li>• Como e qual equipamento usar para programação de veículo me fornecendo detalhes tais como marca/modelo/ano</li>
                    <li>• Clonagem de Transponders</li>
                    <li>• Serviços específicos de chaveiro</li>
                  </ul>
                  <div className="flex flex-col gap-2 pt-2">
                    {PRESETS.map(p => (
                      <button
                        key={p.label}
                        onClick={() => { setActiveForm(p.form); setTimeout(() => scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50); }}
                        className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-left text-sm text-foreground/80 hover:bg-muted/70 transition"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <p className="pt-2 text-xs italic">Se desejar me pergunte o que precisar referente ao serviço que precisa realizar!</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                    <div className="space-y-0.5 leading-relaxed">{renderMarkdown(m.content)}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Consultando IA…
                  </div>
                </div>
              )}

              {/* Perguntas prontas só aparecem no estado inicial (sem mensagens).
                  Após a IA responder, não reaparecem — evita poluir e induzir o usuário. */}


              {activeForm && (
                <PresetForm
                  form={activeForm}
                  onCancel={() => setActiveForm(null)}
                  onChange={(next) => setActiveForm(next)}
                  onSubmit={(text) => { setActiveForm(null); sendText(text); }}
                />
              )}
            </div>

            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(input); } }}
                  placeholder={recording ? "Ouvindo… toque no quadrado para parar" : "Pergunte ou toque no microfone para falar"}
                  rows={2}
                  disabled={recording}
                  className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-70"
                />
                <Button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={loading}
                  title={recording ? "Parar ditado" : "Falar"}
                  aria-label={recording ? "Parar gravação" : "Falar"}
                  className={`h-10 px-3 ${recording ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                >
                  {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
                </Button>
                <Button onClick={() => sendText(input)} disabled={loading || recording || !input.trim()} className="h-10 px-3">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground text-center">Enter envia · Shift+Enter quebra linha · 🎤 grava áudio</div>

            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function FieldRow({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </label>
  );
}

function PresetForm({
  form, onSubmit, onCancel, onChange,
}: {
  form: FormKind;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  onChange: (next: FormKind) => void;
}) {
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  const [cilindro, setCilindro] = useState("");
  const [tipoChave, setTipoChave] = useState("");

  function btn(cls = "") {
    return `rounded-md px-3 py-2 text-sm font-medium transition ${cls}`;
  }

  if (form.kind === "micha-tipo") {
    return (
      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <div className="text-sm font-semibold">Qual micha usar?</div>
        <div className="text-xs text-muted-foreground">É para serviço automotivo ou residencial?</div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button onClick={() => onChange({ kind: "micha-auto" })} className={btn("bg-primary text-primary-foreground hover:opacity-90")}>Automotiva</button>
          <button onClick={() => onChange({ kind: "micha-resid" })} className={btn("bg-secondary text-secondary-foreground hover:opacity-90")}>Residencial</button>
        </div>
        <button onClick={onCancel} className="text-[11px] text-muted-foreground hover:underline">Cancelar</button>
      </div>
    );
  }

  if (form.kind === "abrir" || form.kind === "micha-auto" || form.kind === "programar") {
    const title =
      form.kind === "abrir" ? "Como abrir um veículo?" :
      form.kind === "micha-auto" ? "Qual micha usar? (Automotiva)" :
      "Como programar/clonar chave automotiva nova?";
    const ready = marca.trim() && modelo.trim() && ano.trim();
    return (
      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">Informe os dados do veículo:</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <FieldRow label="Marca" value={marca} onChange={setMarca} placeholder="Ex: Fiat" />
          <FieldRow label="Modelo" value={modelo} onChange={setModelo} placeholder="Ex: Uno" />
          <FieldRow label="Ano" value={ano} onChange={setAno} placeholder="Ex: 2018" />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            disabled={!ready}
            onClick={() => onSubmit(`${title} Marca: ${marca}, Modelo: ${modelo}, Ano: ${ano}.`)}
            className={btn("bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50")}
          >
            Consultar IA
          </button>
          <button onClick={onCancel} className="text-[11px] text-muted-foreground hover:underline">Cancelar</button>
        </div>
      </div>
    );
  }

  if (form.kind === "micha-resid") {
    const tipos = ["Yale", "Tetra", "Multiponto", "Gorje", "Pantográfica"];
    const ready = cilindro.trim() && tipoChave;
    return (
      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <div className="text-sm font-semibold">Qual micha usar? (Residencial)</div>
        <FieldRow label="Marca do cilindro" value={cilindro} onChange={setCilindro} placeholder="Ex: Pado, Stam, La Fonte…" />
        <div className="space-y-1">
          <span className="text-xs font-medium">Modelo da chave</span>
          <div className="flex flex-wrap gap-1.5">
            {tipos.map(t => (
              <button
                key={t}
                onClick={() => setTipoChave(t)}
                className={`rounded-full border px-3 py-1 text-xs transition ${tipoChave === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted hover:bg-muted/70"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            disabled={!ready}
            onClick={() => onSubmit(`Qual micha usar? (Residencial) Marca do cilindro: ${cilindro}, Modelo da chave: ${tipoChave}.`)}
            className={btn("bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50")}
          >
            Consultar IA
          </button>
          <button onClick={onCancel} className="text-[11px] text-muted-foreground hover:underline">Cancelar</button>
        </div>
      </div>
    );
  }

  return null;
}
