import type jsPDF from "jspdf";
import { toast } from "sonner";

/**
 * Imprime o PDF disparando o diálogo de impressão do sistema.
 * Estratégia multi-ambiente:
 *  1) Embute /Print no PDF (autoPrint) — viewers compatíveis abrem o diálogo.
 *  2) Tenta abrir o blob num <iframe> oculto e chamar print() — funciona em
 *     Desktop, PWA (Chrome/Edge/Brave) e Android Chrome.
 *  3) Fallback: abre o PDF em nova aba (mobile iOS/Safari) — o usuário usa
 *     o botão "Imprimir" do visualizador nativo. Sempre em retrato.
 *  4) Fallback final: download.
 *
 * `preopenedWindow` (opcional) deve vir de `preopenPrintWindow()` chamado
 * SINCRONAMENTE no handler do clique — necessário para iOS Safari permitir
 * popup quando a geração do PDF é assíncrona.
 */
export function printOrSavePdf(
  doc: jsPDF,
  filename: string,
  preopenedWindow?: Window | null,
) {
  // 1) Embute OpenAction /Print no PDF
  try {
    (doc as unknown as { autoPrint: (opts?: { variant?: string }) => void })
      .autoPrint({ variant: "non-conform" });
  } catch {
    try { (doc as unknown as { autoPrint: () => void }).autoPrint(); } catch { /* noop */ }
  }

  let blob: Blob;
  try {
    blob = doc.output("blob");
  } catch {
    try { doc.save(filename); } catch { toast.error("Falha ao gerar PDF"); }
    if (preopenedWindow) { try { preopenedWindow.close(); } catch { /* noop */ } }
    return;
  }

  // Força tipo correto e cria URL
  const pdfBlob = blob.type === "application/pdf"
    ? blob
    : new Blob([blob], { type: "application/pdf" });
  const url = URL.createObjectURL(pdfBlob);
  const revoke = () => { try { URL.revokeObjectURL(url); } catch { /* noop */ } };

  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;

  // 2) Mobile iOS: iframe não consegue chamar print() em PDFs. Abre nova aba.
  if (isIOS) {
    const win = preopenedWindow ?? window.open(url, "_blank");
    if (!win) {
      downloadFallback(url, filename, revoke);
      return;
    }
    try { if (preopenedWindow) win.location.href = url; } catch { /* noop */ }
    setTimeout(revoke, 120_000);
    toast.message("Abra e use Imprimir do visualizador.");
    return;
  }

  // 3) Desktop / PWA / Android: iframe oculto + print()
  if (preopenedWindow) { try { preopenedWindow.close(); } catch { /* noop */ } }

  // Injeta @page retrato no documento atual (para fallback de window.print)
  injectPortraitPageStyle();

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  iframe.setAttribute("aria-hidden", "true");

  let printed = false;
  const tryPrint = () => {
    if (printed) return;
    printed = true;
    try {
      const w = iframe.contentWindow;
      if (!w) throw new Error("iframe sem contentWindow");
      w.focus();
      w.print();
      toast.success("Abrindo diálogo de impressão...");
    } catch {
      // Fallback: abre em nova aba
      const win = window.open(url, "_blank");
      if (!win) downloadFallback(url, filename, revoke);
      else toast.message("Use Imprimir do visualizador aberto.");
    }
    // Mantém iframe alguns minutos para o diálogo concluir
    setTimeout(() => { try { iframe.remove(); } catch { /* noop */ } revoke(); }, 120_000);
  };

  iframe.onload = () => setTimeout(tryPrint, 250);
  iframe.src = url;
  document.body.appendChild(iframe);

  // Safety: se onload não disparar em 3s, tenta mesmo assim
  setTimeout(tryPrint, 3000);
}

function downloadFallback(url: string, filename: string, revoke: () => void) {
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(revoke, 60_000);
  toast.message("PDF baixado para impressão manual.");
}

function injectPortraitPageStyle() {
  const id = "__lovable_print_portrait__";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = "@media print { @page { size: A4 portrait; margin: 10mm; } }";
  document.head.appendChild(style);
}

/**
 * Pré-abre uma janela em branco de forma síncrona — útil para iOS Safari
 * quando a geração do PDF é assíncrona.
 */
export function preopenPrintWindow(): Window | null {
  try {
    return window.open("", "_blank");
  } catch {
    return null;
  }
}
