import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { brl } from "./format";
import { loadOrgHeaderInfo } from "./pdf-org";


interface ReceiptData {
  receiptNumber: number;
  date: string;
  customer: {
    name: string;
    taxId: string;
    address?: string;
    phone?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    paymentMethod?: string;
  }>;
  totalAmount: number;
}

export async function generateReceiptPDF(data: ReceiptData, action: "download" | "print" = "download") {
  // Sempre retrato para impressão direta consistente
  const doc = new jsPDF({ orientation: "portrait", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  const org = await loadOrgHeaderInfo();

  // Header Box - compact
  doc.setDrawColor(200);
  doc.setLineWidth(0.1);
  doc.roundedRect(8, 8, pageWidth - 16, 32, 2, 2, "D");

  try {
    doc.addImage(org.logoDataUrl, "PNG", 11, 11, 12, 12);
  } catch (e) {
    console.error("Could not load logo for PDF", e);
  }

  // Company Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text(org.name, 26, 17);

  // Company Info - compact
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  let yPos = 22;
  if (org.cnpj) { doc.text(`CNPJ: ${org.cnpj}`, 26, yPos); yPos += 3.2; }
  const addrLine = [org.address, org.cityState].filter(Boolean).join(" - ");
  if (addrLine) { doc.text(addrLine, 26, yPos); yPos += 3.2; }
  const cepPhone = [org.zip ? `CEP ${org.zip}` : null, org.phone ? `WhatsApp: ${org.phone}` : null].filter(Boolean).join("  |  ");
  if (cepPhone) { doc.text(cepPhone, 26, yPos); yPos += 3.2; }
  if (org.website) doc.text(org.website, 26, yPos);
  else if (org.email) doc.text(org.email, 26, yPos);

  // Receipt Number and Date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(`RECIBO Nº ${data.receiptNumber}`, pageWidth - 11, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Data: ${new Date(data.date).toLocaleDateString("pt-BR")}`, pageWidth - 11, 22, { align: "right" });

  // Customer Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(40);
  doc.text("DADOS DO CLIENTE", 8, 47);
  doc.setDrawColor(220);
  doc.line(8, 49, pageWidth - 8, 49);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60);
  doc.text("Nome:", 8, 55);
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.text(data.customer.name, 21, 55);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  doc.text("CPF/CNPJ:", 8, 60);
  doc.setTextColor(20);
  doc.text(data.customer.taxId, 27, 60);

  if (data.customer.address) {
    doc.setTextColor(60);
    doc.text("Endereço:", 8, 65);
    doc.setTextColor(20);
    doc.text(data.customer.address, 26, 65);
  }

  // Items Table
  autoTable(doc, {
    startY: 70,
    head: [["Descrição", "Qtd", "Unit.", "Pagamento", "Total"]],
    body: data.items.map(item => [
      item.description,
      item.quantity,
      brl(item.unitPrice),
      item.paymentMethod || "—",
      brl(item.total)
    ]),
    foot: [[
      { content: "TOTAL GERAL", colSpan: 4, styles: { halign: "right", fontStyle: "bold", fontSize: 9 } },
      { content: brl(data.totalAmount), styles: { fontStyle: "bold", fontSize: 9 } }
    ]],
    headStyles: {
      fillColor: [60, 60, 60],
      textColor: 255,
      fontStyle: "bold",
      halign: 'center',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 12 },
      2: { halign: 'right', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'right', cellWidth: 22 },
    },
    footStyles: { fillColor: [245, 245, 245], textColor: 0 },
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: 8, right: 8 },
  });

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 6;
  doc.setDrawColor(230);
  doc.setLineWidth(0.1);
  doc.line(15, finalY, pageWidth - 15, finalY);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100);
  const footerCity = org.cityState ? ` em ${org.cityState}` : "";
  doc.text(
    `*****  ${org.name.toUpperCase()}${footerCity ? " | o seu chaveiro" + footerCity : ""}  *****`,
    pageWidth / 2,
    finalY + 4,
    { align: "center" }
  );

  const safeName = (data.customer.name || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const fname = `RECIBO - ${data.receiptNumber} - ${safeName}.pdf`;
  if (action === "print") {
    const { printOrSavePdf } = await import("./pdf-print");
    printOrSavePdf(doc, fname);
  } else {
    doc.save(fname);
  }
}
