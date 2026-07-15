import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { brl } from "./format";
import { loadOrgHeaderInfo } from "./pdf-org";


export type ServiceOrderAutoInfo = {
  montadora?: string; modelo?: string; ano?: string; placa?: string; chassis?: string;
  codAlarme?: string; codImobilizador?: string; codChave?: string; codRadio?: string;
  tipoChip?: string; alarmeTelecomando?: string;
};

export interface ServiceOrderPDFData {
  number: number;
  kind: "os" | "orcamento";
  status: string;
  date: string;
  validityDate?: string | null;
  customer: { name: string; phone?: string | null; doc?: string | null; address?: string | null };
  equipment?: string | null;
  problem?: string | null;
  services: Array<{ description: string; quantity: number; unitPrice: number }>;
  products: Array<{ description: string; quantity: number; unitPrice: number }>;
  total: number;
  notes?: string | null;
  showProducts?: boolean;
  scheduledAt?: string | null;
  scheduledHasTime?: boolean;
  serviceAddress?: string | null;
  mapsLink?: string | null;
  serviceType?: "automotivo" | "residencial" | "comercial_industrial";
  auto?: ServiceOrderAutoInfo | null;
  partsUsed?: Array<{ description: string; quantity: number }>;
}

export async function generateServiceOrderPDF(data: ServiceOrderPDFData, options: { download?: boolean; action?: "download" | "print" } = {}) {
  const { download = true, action } = options;
  const doc = new jsPDF({ orientation: "portrait", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const isOrc = data.kind === "orcamento";
  const title = isOrc ? "ORÇAMENTO" : "ORDEM DE SERVIÇO";

  const org = await loadOrgHeaderInfo();

  // Header fill color from organization primary color (fallback dark gray)
  const hexToRgb = (hex: string | null | undefined): [number, number, number] => {
    const m = /^#?([a-f\d]{6})$/i.exec((hex ?? "").trim());
    if (!m) return [60, 60, 60];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const headFill = hexToRgb(org.primaryColor);

  // Header — colored band + light gray info area
  const headerX = 10;
  const headerW = pageWidth - 20;
  const headerY = 10;
  const bandH = 12;
  const infoH = 24;

  // Light gray top band
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(headerX, headerY, headerW, bandH, 2, 2, "F");
  // Lighter gray info area
  doc.setFillColor(243, 244, 246);
  doc.rect(headerX, headerY + bandH, headerW, infoH, "F");
  // Outer border
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.roundedRect(headerX, headerY, headerW, bandH + infoH, 2, 2, "D");

  // Logo
  try { doc.addImage(org.logoDataUrl, "PNG", 14, headerY + 1.5, 9, 9); } catch (e) { console.error(e); }

  // Company name on colored band
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text(org.name, 26, headerY + 8);

  // Title & number on colored band (right)
  doc.setFontSize(12);
  doc.text(title, pageWidth - 14, headerY + 5.5, { align: "right" });
  doc.setFontSize(10);
  doc.text(`Nº ${String(data.number).padStart(4, "0")}`, pageWidth - 14, headerY + 10.5, { align: "right" });

  // Company info on light gray area
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  let y = headerY + bandH + 5;
  if (org.cnpj) { doc.text(`CNPJ: ${org.cnpj}`, 14, y); y += 3.8; }
  const addrLine = [org.address, org.cityState].filter(Boolean).join(" - ");
  if (addrLine) { doc.text(addrLine, 14, y); y += 3.8; }
  const contactBits: string[] = [];
  if (org.zip) contactBits.push(`CEP ${org.zip}`);
  if (org.phone) contactBits.push(`WhatsApp: ${org.phone}`);
  if (org.website) contactBits.push(org.website);
  else if (org.email) contactBits.push(org.email);
  if (contactBits.length) doc.text(contactBits.join("  |  "), 14, y);

  // Meta on right of light gray area
  doc.setTextColor(40, 40, 40);
  doc.text(`Data: ${new Date(data.date).toLocaleDateString("pt-BR")}`, pageWidth - 14, headerY + bandH + 5, { align: "right" });
  doc.text(`Status: ${data.status.toUpperCase()}`, pageWidth - 14, headerY + bandH + 8.8, { align: "right" });
  if (isOrc && data.validityDate) {
    doc.text(`Validade: ${new Date(data.validityDate).toLocaleDateString("pt-BR")}`, pageWidth - 14, headerY + bandH + 12.6, { align: "right" });
  }

  // Customer
  let cy = 52;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(40);
  doc.text("CLIENTE", 10, cy);
  doc.setDrawColor(220);
  doc.line(10, cy + 1.5, pageWidth - 10, cy + 1.5);
  cy += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(20);
  doc.text(`Nome: ${data.customer.name}`, 10, cy); cy += 4.5;
  if (data.customer.doc) { doc.text(`CPF/CNPJ: ${data.customer.doc}`, 10, cy); cy += 4.5; }
  if (data.customer.phone) { doc.text(`Telefone: ${data.customer.phone}`, 10, cy); cy += 4.5; }
  if (data.customer.address) { doc.text(`Endereço: ${data.customer.address}`, 10, cy); cy += 4.5; }

  // Agendamento
  if (data.scheduledAt) {
    cy += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(40);
    doc.text("AGENDAMENTO", 10, cy);
    doc.line(10, cy + 1.5, pageWidth - 10, cy + 1.5);
    cy += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    const d = new Date(data.scheduledAt);
    const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const whenStr = data.scheduledHasTime
      ? `${dateStr} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
      : dateStr;
    doc.text(`Data/Hora: ${whenStr}`, 10, cy); cy += 4.5;
    if (data.serviceAddress) {
      const lines = doc.splitTextToSize(`Local: ${data.serviceAddress}`, pageWidth - 20);
      doc.text(lines, 10, cy); cy += lines.length * 4.5;
    }
    if (data.mapsLink) {
      doc.setTextColor(0, 102, 204);
      doc.textWithLink("Abrir no Google Maps", 10, cy, { url: data.mapsLink });
      doc.setTextColor(20);
      cy += 4.5;
    }
  }


  // Equipment / problem
  if (data.equipment || data.problem) {
    cy += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(40);
    doc.text("EQUIPAMENTO / PRODUTO", 10, cy);
    doc.line(10, cy + 1.5, pageWidth - 10, cy + 1.5);
    cy += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    if (data.equipment) {
      const lines = doc.splitTextToSize(`Equipamento: ${data.equipment}`, pageWidth - 20);
      doc.text(lines, 10, cy); cy += lines.length * 4.5;
    }
    if (data.problem) {
      const lines = doc.splitTextToSize(`Descrição do problema: ${data.problem}`, pageWidth - 20);
      doc.text(lines, 10, cy); cy += lines.length * 4.5;
    }
  }

  let startY = cy + 4;

  // Services
  if (data.services.length > 0) {
    autoTable(doc, {
      startY,
      head: [["Serviços Executados", "Qtd", "Unit.", "Total"]],
      body: data.services.map(s => [s.description, s.quantity, brl(s.unitPrice), brl(s.quantity * s.unitPrice)]),
      headStyles: { fillColor: headFill, textColor: 255, fontStyle: "bold", fontSize: 9 },
      columnStyles: { 0: { cellWidth: "auto" }, 1: { halign: "center", cellWidth: 18 }, 2: { halign: "right", cellWidth: 25 }, 3: { halign: "right", cellWidth: 28 } },
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 10, right: 10 },
    });
    startY = (doc as any).lastAutoTable.finalY + 4;
  }

  // Detalhes do Tipo de Serviço/Produto
  const autoLabels: Array<[keyof ServiceOrderAutoInfo, string]> = [
    ["montadora", "Montadora"], ["modelo", "Modelo"], ["ano", "Ano"], ["placa", "Placa"],
    ["chassis", "Chassis"], ["codAlarme", "Cód. Alarme"], ["codImobilizador", "Cód. Imobilizador"],
    ["codChave", "Cód. Chave"], ["codRadio", "Cód. Rádio"], ["tipoChip", "Tipo Chip/Transponder"],
    ["alarmeTelecomando", "Alarme/Telecomando"],
  ];
  if (data.serviceType === "automotivo" && data.auto) {
    const entries = autoLabels
      .map(([k, l]) => [l, (data.auto?.[k] ?? "").toString().trim()] as [string, string])
      .filter(r => r[1]);
    if (entries.length) {
      const rows: Array<Array<{ _label: string; _value: string }>> = [];
      for (let i = 0; i < entries.length; i += 3) {
        const chunk = entries.slice(i, i + 3).map(([l, v]) => ({ _label: l, _value: v }));
        while (chunk.length < 3) chunk.push({ _label: "", _value: "" });
        rows.push(chunk);
      }
      autoTable(doc, {
        startY,
        head: [[{ content: "Detalhes do Serviço Automotivo", colSpan: 3 } as any]],
        body: rows.map(r => r.map(c => c as any)),
        headStyles: { fillColor: headFill, textColor: 255, fontStyle: "bold", fontSize: 9, halign: "left" },
        columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: "auto" }, 2: { cellWidth: "auto" } },
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2 },
        margin: { left: 10, right: 10 },
        didParseCell: (d) => {
          if (d.section === "body") {
            d.cell.text = [""];
            d.cell.styles.minCellHeight = 10;
          }
        },
        didDrawCell: (d) => {
          if (d.section !== "body") return;
          const raw = d.cell.raw as { _label?: string; _value?: string };
          if (!raw?._label) return;
          const x = d.cell.x + 2;
          const y = d.cell.y + 4;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(30, 30, 30);
          doc.text(raw._label ?? "", x, y);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(80, 80, 80);
          doc.text(raw._value ?? "", x, y + 3.8);
        },
      });
      startY = (doc as any).lastAutoTable.finalY + 4;
    }

  } else if (data.serviceType && (data.equipment || "").trim()) {
    autoTable(doc, {
      startY,
      head: [["Tipo de Serviço", ""]],
      body: [["Serviço", data.equipment as string]],
      headStyles: { fillColor: headFill, textColor: 255, fontStyle: "bold", fontSize: 9 },
      columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" }, 1: { cellWidth: "auto" } },
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 10, right: 10 },
    });
    startY = (doc as any).lastAutoTable.finalY + 4;
  }

  // Products
  if (data.products.length > 0 && data.showProducts !== false) {
    startY += 20;
    autoTable(doc, {
      startY,
      head: [["Serviços / Produtos", "Qtd", "Unit.", "Total"]],
      body: data.products.map(p => [p.description, p.quantity, brl(p.unitPrice), brl(p.quantity * p.unitPrice)]),
      headStyles: { fillColor: headFill, textColor: 255, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { textColor: [140, 140, 140] },
      columnStyles: { 0: { cellWidth: "auto" }, 1: { halign: "center", cellWidth: 18 }, 2: { halign: "right", cellWidth: 25 }, 3: { halign: "right", cellWidth: 28 } },
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 10, right: 10 },
    });
    startY = (doc as any).lastAutoTable.finalY + 4;
  }

  // Peças/Produtos Utilizados (descrição + quantidade, sem preço)
  const partsUsed = (data.partsUsed ?? [])
    .map(p => ({ description: (p.description ?? "").trim(), quantity: Number(p.quantity) || 0 }))
    .filter(p => p.description);
  if (partsUsed.length > 0) {
    autoTable(doc, {
      startY,
      head: [["Peças / Produtos Utilizados", "Qtd"]],
      body: partsUsed.map(p => [p.description, p.quantity]),
      headStyles: { fillColor: false as any, textColor: [60, 60, 60], fontStyle: "bold", fontSize: 8, lineWidth: 0 },
      columnStyles: { 0: { cellWidth: "auto" }, 1: { halign: "center", cellWidth: 20 } },
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 10, right: 10 },
    });
    startY = (doc as any).lastAutoTable.finalY + 4;
  }

  // Total — gray bar fixed near bottom of A4
  const totalBarY = 272;
  doc.setFillColor(229, 231, 235);
  doc.rect(10, totalBarY, pageWidth - 20, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(`VALOR TOTAL: ${brl(data.total)}`, pageWidth - 14, totalBarY + 5.5, { align: "right" });

  // Notes
  if (data.notes) {
    startY += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(40);
    doc.text("OBSERVAÇÕES", 10, startY);
    doc.line(10, startY + 1.5, pageWidth - 10, startY + 1.5);
    startY += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    const lines = doc.splitTextToSize(data.notes, pageWidth - 20);
    doc.text(lines, 10, startY);
    startY += lines.length * 4.5;
  }

  // Signature — fixed above total bar
  const sigY = totalBarY - 8;
  doc.setDrawColor(120);
  doc.line(30, sigY, 100, sigY);
  doc.line(pageWidth - 100, sigY, pageWidth - 30, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text("Assinatura do Cliente", 65, sigY + 4, { align: "center" });
  doc.text(org.name, pageWidth - 65, sigY + 4, { align: "center" });

  // Footer
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100);
  const footerCity = org.cityState ? ` em ${org.cityState}` : "";
  doc.text(`*****  ${org.name.toUpperCase()}${footerCity ? " | o seu chaveiro" + footerCity : ""}  *****`, pageWidth / 2, 287, { align: "center" });

  const typeLabel = isOrc ? "ORÇAMENTO" : "OS";
  const safeName = (data.customer.name || "CLIENTE")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, " ");
  const fileName = `${typeLabel} - ${data.number} - ${safeName}`.toUpperCase();
  if (action === "print") {
    const { printOrSavePdf } = await import("./pdf-print");
    printOrSavePdf(doc, `${fileName}.pdf`);
  } else if (download) {
    doc.save(`${fileName}.pdf`);
  }
  const blob = doc.output("blob");
  return { blob, fileName: `${fileName}.pdf` };
}
