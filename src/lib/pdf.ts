import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "@/assets/logo.png";
import { printOrSavePdf } from "./pdf-print";
import { loadOrgHeaderInfo, type OrgHeaderInfo } from "./pdf-org";

export type PdfAction = "download" | "print";

function finalizePdf(doc: jsPDF, filename: string, action: PdfAction = "download") {
  if (action === "print") printOrSavePdf(doc, filename);
  else doc.save(filename);
}
import { brl, monthLabel } from "./format";
import { feeForDate, boletoFeeForDate, type FeeHistoryRow } from "./payment-fees";

export type PieSlice = { label: string; value: number; color: [number, number, number] };

export function drawPie(doc: jsPDF, cx: number, cy: number, r: number, slices: PieSlice[]) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return;
  let start = -Math.PI / 2;
  for (const s of slices) {
    if (s.value <= 0) continue;
    const angle = (s.value / total) * Math.PI * 2;
    const steps = Math.max(2, Math.ceil(angle / (Math.PI / 40)));
    doc.setFillColor(s.color[0], s.color[1], s.color[2]);
    for (let i = 0; i < steps; i++) {
      const a1 = start + (i / steps) * angle;
      const a2 = start + ((i + 1) / steps) * angle;
      doc.triangle(cx, cy, cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2), "F");
    }
    start += angle;
  }
}

export function drawPieLegend(doc: jsPDF, x: number, y: number, slices: PieSlice[]) {
  doc.setFontSize(9);
  doc.setTextColor(40);
  let yy = y;
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  for (const s of slices) {
    if (s.value <= 0) continue;
    doc.setFillColor(s.color[0], s.color[1], s.color[2]);
    doc.rect(x, yy - 3, 3, 3, "F");
    doc.text(`${s.label}: ${brl(s.value)} (${((s.value / total) * 100).toFixed(1)}%)`, x + 5, yy);
    yy += 5;
  }
  return yy;
}

export const PAYMENT_PDF_COLORS: Record<string, [number, number, number]> = {
  "PIX": [0, 196, 159],
  "Dinheiro": [255, 187, 40],
  "Débito": [0, 136, 254],
  "Crédito": [255, 128, 66],
  "Boleto": [168, 85, 247],
};

export const COST_PDF_COLORS: Record<string, [number, number, number]> = {
  "Materiais": [0, 136, 254],
  "Taxa Débito": [0, 196, 159],
  "Taxa Crédito": [255, 128, 66],
  "Taxa Boleto": [168, 85, 247],
};

export function computeCostComposition(
  sales: Array<{ quantity: number; unit_price: number; unit_cost?: number | null; unit_cost_includes_fee?: boolean | null; payment_method?: string | null; occurred_at: string; card_brand?: string | null }>,
  feeHistory: FeeHistoryRow[] | undefined,
) {
  let material = 0, debitFee = 0, creditFee = 0, boletoFee = 0;
  for (const m of sales) {
    const qty = Number(m.quantity);
    const sPrice = Number(m.unit_price);
    const baseUnit = Number(m.unit_cost ?? 0);
    const legacy = m.unit_cost_includes_fee !== false;
    const pct = feeForDate(feeHistory, m.occurred_at, m.payment_method, m.card_brand);
    const feeFromPct = qty * sPrice * pct / 100;
    if (legacy) {
      material += Math.max(0, qty * baseUnit - feeFromPct);
      if (m.payment_method === "Débito") debitFee += feeFromPct;
      else if (m.payment_method === "Crédito") creditFee += feeFromPct;
    } else {
      material += qty * baseUnit;
      if (m.payment_method === "Débito") debitFee += feeFromPct;
      else if (m.payment_method === "Crédito") creditFee += feeFromPct;
      else if (m.payment_method === "Boleto") boletoFee += boletoFeeForDate(feeHistory, m.occurred_at);
    }
  }
  return { material, debitFee, creditFee, boletoFee };
}

export function costSlices(c: { material: number; debitFee: number; creditFee: number; boletoFee: number }): PieSlice[] {
  return [
    { label: "Materiais", value: c.material, color: COST_PDF_COLORS["Materiais"] },
    { label: "Taxa Débito", value: c.debitFee, color: COST_PDF_COLORS["Taxa Débito"] },
    { label: "Taxa Crédito", value: c.creditFee, color: COST_PDF_COLORS["Taxa Crédito"] },
    { label: "Taxa Boleto", value: c.boletoFee, color: COST_PDF_COLORS["Taxa Boleto"] },
  ].filter(s => s.value > 0);
}



interface Product {
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
}
interface Movement { occurred_at: string; type: "in" | "out"; quantity: number; unit_price: number; unit_cost?: number | null; unit_cost_includes_fee?: boolean | null; payment_method?: string | null; products?: { name: string; sku: string | null; codigo?: string | null; purchase_price?: number | null } | null; }
interface Expense { occurred_at: string; kind: "despesa" | "compra_estoque"; descricao: string | null; produto: string | null; fornecedor: string | null; valor: number; }

const LOGO_URL = logoUrl;

export async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_URL, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function header(doc: jsPDF, title: string, subtitle?: string, org?: OrgHeaderInfo | null) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setDrawColor(200);
  doc.setLineWidth(0.1);
  doc.roundedRect(10, 10, pageWidth - 20, 40, 2, 2, "D");

  const logoSrc = org?.logoDataUrl || LOGO_URL;
  try {
    doc.addImage(logoSrc, "PNG", 14, 14, 15, 15);
  } catch (e) {
    console.error("Could not load logo for PDF", e);
  }

  const companyName = org?.name || "Chaveiro System";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(30);
  doc.text(companyName, 42, 24);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  let y = 30;
  if (org?.cnpj) { doc.text(`CNPJ: ${org.cnpj}`, 42, y); y += 4; }
  const addrLine = [org?.address, org?.cityState].filter(Boolean).join(" - ");
  if (addrLine) { doc.text(addrLine, 42, y); y += 4; }
  const contactBits: string[] = [];
  if (org?.phone) contactBits.push(`WhatsApp: ${org.phone}`);
  if (org?.website) contactBits.push(org.website);
  else if (org?.email) contactBits.push(org.email);
  if (contactBits.length) doc.text(contactBits.join("   |   "), 42, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(title, pageWidth - 14, 22, { align: "right" });
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(subtitle, pageWidth - 14, 30, { align: "right" });
  }
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, pageWidth - 14, 38, { align: "right" });
}

export const HEADER_BOTTOM = 56;

export function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Gerado em ${new Date().toLocaleString("pt-BR")} — Página ${i}/${pages}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }
}

export async function exportProductsPDF(products: Product[], action: PdfAction = "download") {
  const org = await loadOrgHeaderInfo();
  const doc = new jsPDF({ orientation: "portrait" });
  header(doc, "Lista de Preço", `${products.length} itens`, org);
  autoTable(doc, {
    startY: HEADER_BOTTOM,
    head: [["Produto", "Código", "Cód. Forn.", "Marca", "Referência", "Compra", "Venda", "% Lucro"]],
    body: products.map(p => {
      const lucro = Number(p.sale_price) - Number(p.purchase_price);
      return [
        p.name,
        p.codigo ?? "—",
        p.codigo_fornecedor ?? "—",
        p.marca ?? "—",
        p.referencia ?? "—",
        brl(p.purchase_price),
        brl(p.sale_price),
        brl(lucro),
      ];
    }),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [255, 158, 65], textColor: 20 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  footer(doc);
  finalizePdf(doc, `lista-preco-${new Date().toISOString().slice(0, 10)}.pdf`, action);
}

function renderCostCompositionSection(doc: jsPDF, sales: Movement[], feeHistory?: FeeHistoryRow[]) {
  const comp = computeCostComposition(sales as any, feeHistory);
  const slices = costSlices(comp);
  if (slices.length === 0) return;
  const total = slices.reduce((s, x) => s + x.value, 0);
  const startY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text("Composição de Custos", 14, startY);

  autoTable(doc, {
    startY: startY + 4,
    head: [["Categoria", "Valor", "%"]],
    body: slices.map(s => [s.label, brl(s.value), `${((s.value / total) * 100).toFixed(1)}%`]),
    foot: [["TOTAL", brl(total), "100%"]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [40, 40, 40], textColor: 255 },
    footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: "bold" },
  });
}

export async function exportMonthlyPDF(ym: string, movs: Movement[], expenses: Expense[] = [], feeHistory?: FeeHistoryRow[], action: PdfAction = "download") {
  const org = await loadOrgHeaderInfo();
  const doc = new jsPDF();
  const sales = movs.filter(m => m.type === "out");
  const vendas = sales.reduce((s, m) => s + m.quantity * Number(m.unit_price), 0);
  const despesas = expenses.filter(e => e.kind === "despesa").reduce((s, e) => s + Number(e.valor), 0);
  const compras = expenses.filter(e => e.kind === "compra_estoque").reduce((s, e) => s + Number(e.valor), 0);
  const comp = computeCostComposition(sales as any, feeHistory);
  const custoProdutos = comp.material + comp.debitFee + comp.creditFee + comp.boletoFee;
  const lucroLiquido = vendas - (despesas + custoProdutos);

  header(doc, `Balanço Mensal — ${monthLabel(ym)}`, "VENDAS - (DESPESAS + CUSTO PRODUTOS)", org);

  autoTable(doc, {
    startY: HEADER_BOTTOM,
    head: [["Balanço", "Valor"]],
    body: [
      ["VENDAS", brl(vendas)],
      ["CUSTO PRODUTOS", brl(custoProdutos)],
      ["DESPESAS", brl(despesas)],
      ["COMPRAS ESTOQUE", brl(compras)],
      ["LUCRO LÍQUIDO", brl(lucroLiquido)],
    ],
    styles: { fontSize: 11 },
    headStyles: { fillColor: [255, 158, 65], textColor: 20 },
  });

  renderCostCompositionSection(doc, sales, feeHistory);

  if (expenses.filter(e => e.kind === "despesa").length) {
    autoTable(doc, {
      head: [["Data", "Descrição", "Fornecedor", "Valor"]],
      body: expenses.filter(e => e.kind === "despesa").map(e => [
        new Date(e.occurred_at).toLocaleDateString("pt-BR"),
        e.descricao ?? "—", e.fornecedor ?? "—", brl(Number(e.valor)),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255 },
    });
  }

  if (expenses.filter(e => e.kind === "compra_estoque").length) {
    autoTable(doc, {
      head: [["Data", "Produtos", "Descrição", "Fornecedor", "Valor"]],
      body: expenses.filter(e => e.kind === "compra_estoque").map(e => [
        new Date(e.occurred_at).toLocaleDateString("pt-BR"),
        e.produto ?? "—", e.descricao ?? "—", e.fornecedor ?? "—", brl(Number(e.valor)),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255 },
    });
  }

  if (movs.length) {
    autoTable(doc, {
      head: [["Data", "Tipo", "Produto", "Qtd", "Unit.", "Total"]],
      body: movs.map(m => [
        new Date(m.occurred_at).toLocaleDateString("pt-BR"),
        m.type === "in" ? "Entrada" : "Venda",
        m.products?.name ?? "—",
        String(m.quantity),
        brl(m.unit_price),
        brl(m.quantity * m.unit_price),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255 },
    });
  }

  footer(doc);
  finalizePdf(doc, `balanco-${ym}.pdf`, action);
}

export async function exportTopSellingPDF(ym: string, movs: Movement[], action: PdfAction = "download") {
  const org = await loadOrgHeaderInfo();
  const doc = new jsPDF();
  header(doc, `Produtos Mais Vendidos — ${monthLabel(ym)}`, "RANKING POR QUANTIDADE", org);

  // Agrupar vendas por produto
  const rankingMap = new Map<string, { name: string; codigo: string; qty: number; total: number }>();
  
  movs.filter(m => m.type === "out").forEach(m => {
    const key = m.products?.name || "Desconhecido";
    const cur = rankingMap.get(key) || { 
      name: key, 
      codigo: String(m.products?.codigo ?? "—"), 
      qty: 0, 
      total: 0 
    };
    cur.qty += m.quantity;
    cur.total += m.quantity * Number(m.unit_price);
    rankingMap.set(key, cur);
  });

  const sorted = Array.from(rankingMap.values()).sort((a, b) => b.qty - a.qty);

  autoTable(doc, {
    startY: HEADER_BOTTOM,
    head: [["Pos.", "Código", "Produto", "Qtd Vendida", "Total R$"]],
    body: sorted.map((item, idx) => [
      `${idx + 1}º`,
      item.codigo,
      item.name,
      String(item.qty),
      brl(item.total)
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [255, 158, 65], textColor: 20 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });


  footer(doc);
  finalizePdf(doc, `mais-vendidos-${ym}.pdf`, action);
}

export async function exportMonthlyDetailedPDF(ym: string, movs: Movement[], expenses: Expense[] = [], feeHistory?: FeeHistoryRow[], action: PdfAction = "download") {
  const org = await loadOrgHeaderInfo();
  const doc = new jsPDF();
  const sales = movs.filter(m => m.type === "out");
  const vendas = sales.reduce((s, m) => s + m.quantity * Number(m.unit_price), 0);
  const compDet = computeCostComposition(sales as any, feeHistory);
  const custoProdutos = compDet.material + compDet.debitFee + compDet.creditFee + compDet.boletoFee;
  const lucroBruto = vendas - custoProdutos;
  const despesasList = expenses.filter(e => e.kind === "despesa");
  const comprasList = expenses.filter(e => e.kind === "compra_estoque");
  const totalDespesas = despesasList.reduce((s, e) => s + Number(e.valor), 0);
  const totalCompras = comprasList.reduce((s, e) => s + Number(e.valor), 0);
  const lucroLiquido = vendas - (totalDespesas + custoProdutos);
  const margem = vendas > 0 ? (lucroLiquido / vendas) * 100 : 0;
  const ticketMedio = sales.length > 0 ? vendas / sales.length : 0;

  header(doc, `Balanço Detalhado — ${monthLabel(ym)}`, "RESUMO COMPLETO DO PERÍODO", org);

  // Resumo financeiro
  autoTable(doc, {
    startY: HEADER_BOTTOM,
    head: [["Indicador", "Valor"]],
    body: [
      ["Vendas (faturamento)", brl(vendas)],
      ["Custo dos produtos vendidos", brl(custoProdutos)],
      ["Lucro bruto (vendas - custo)", brl(lucroBruto)],
      ["Despesas operacionais", brl(totalDespesas)],
      ["Compras de estoque (caixa)", brl(totalCompras)],
      ["LUCRO LÍQUIDO", brl(lucroLiquido)],
      ["Margem líquida", `${margem.toFixed(1)}%`],
      ["Nº de vendas", String(sales.length)],
      ["Ticket médio", brl(ticketMedio)],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [255, 158, 65], textColor: 20 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Meios de pagamento
  const payMap = new Map<string, { total: number; count: number }>();
  sales.forEach(m => {
    const k = m.payment_method || "Não informado";
    const cur = payMap.get(k) || { total: 0, count: 0 };
    cur.total += m.quantity * Number(m.unit_price);
    cur.count += 1;
    payMap.set(k, cur);
  });
  if (payMap.size > 0) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [["Meio de pagamento", "Qtd vendas", "Total", "% do faturamento"]],
      body: Array.from(payMap.entries()).map(([k, v]) => [
        k, String(v.count), brl(v.total), `${vendas > 0 ? ((v.total / vendas) * 100).toFixed(1) : "0"}%`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255 },
    });
  }

  renderCostCompositionSection(doc, sales, feeHistory);

  // Vendas por dia
  const dayMap = new Map<string, { vendas: number; qtd: number }>();
  sales.forEach(m => {
    const d = new Date(m.occurred_at).toLocaleDateString("pt-BR");
    const cur = dayMap.get(d) || { vendas: 0, qtd: 0 };
    cur.vendas += m.quantity * Number(m.unit_price);
    cur.qtd += 1;
    dayMap.set(d, cur);
  });
  if (dayMap.size > 0) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [["Dia", "Nº vendas", "Faturamento"]],
      body: Array.from(dayMap.entries())
        .sort((a, b) => a[0].split("/").reverse().join("").localeCompare(b[0].split("/").reverse().join("")))
        .map(([d, v]) => [d, String(v.qtd), brl(v.vendas)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255 },
    });
  }

  // Ranking produtos vendidos
  const prodMap = new Map<string, { name: string; codigo: string; qty: number; total: number; cost: number }>();
  sales.forEach(m => {
    const k = m.products?.name || "Desconhecido";
    const cur = prodMap.get(k) || { name: k, codigo: String(m.products?.codigo ?? "—"), qty: 0, total: 0, cost: 0 };
    cur.qty += m.quantity;
    cur.total += m.quantity * Number(m.unit_price);
    cur.cost += m.quantity * Number(m.products?.purchase_price ?? 0);
    prodMap.set(k, cur);
  });
  const ranking = Array.from(prodMap.values()).sort((a, b) => b.total - a.total);
  if (ranking.length > 0) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [["Pos.", "Código", "Produto", "Qtd", "Faturamento", "Lucro"]],
      body: ranking.map((p, i) => [
        `${i + 1}º`, p.codigo, p.name, String(p.qty), brl(p.total), brl(p.total - p.cost),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 158, 65], textColor: 20 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
  }

  // Despesas detalhadas
  if (despesasList.length > 0) {
    doc.addPage();
    header(doc, `Despesas — ${monthLabel(ym)}`, `Total: ${brl(totalDespesas)}`, org);
    autoTable(doc, {
      startY: HEADER_BOTTOM,
      head: [["Data", "Descrição", "Fornecedor", "Valor"]],
      body: despesasList.map(e => [
        new Date(e.occurred_at).toLocaleDateString("pt-BR"),
        e.descricao ?? "—", e.fornecedor ?? "—", brl(Number(e.valor)),
      ]),
      foot: [["", "", "TOTAL", brl(totalDespesas)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255 },
      footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: "bold" },
    });
  }

  // Compras detalhadas
  if (comprasList.length > 0) {
    doc.addPage();
    header(doc, `Compras de Estoque — ${monthLabel(ym)}`, `Total: ${brl(totalCompras)}`, org);
    autoTable(doc, {
      startY: HEADER_BOTTOM,
      head: [["Data", "Produtos", "Descrição", "Fornecedor", "Valor"]],
      body: comprasList.map(e => [
        new Date(e.occurred_at).toLocaleDateString("pt-BR"),
        e.produto ?? "—", e.descricao ?? "—", e.fornecedor ?? "—", brl(Number(e.valor)),
      ]),
      foot: [["", "", "", "TOTAL", brl(totalCompras)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255 },
      footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: "bold" },
    });
  }

  // Movimentações detalhadas
  if (movs.length > 0) {
    doc.addPage();
    header(doc, `Movimentações — ${monthLabel(ym)}`, `${movs.length} lançamentos`, org);
    autoTable(doc, {
      startY: HEADER_BOTTOM,
      head: [["Data", "Tipo", "Produto", "Pagto", "Qtd", "Unit.", "Total"]],
      body: movs.map(m => [
        new Date(m.occurred_at).toLocaleDateString("pt-BR"),
        m.type === "in" ? "Entrada" : "Venda",
        m.products?.name ?? "—",
        m.payment_method ?? "—",
        String(m.quantity),
        brl(m.unit_price),
        brl(m.quantity * m.unit_price),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
    });
  }

  footer(doc);
  finalizePdf(doc, `balanco-detalhado-${ym}.pdf`, action);
}

