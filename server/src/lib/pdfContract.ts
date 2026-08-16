import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { getBusinessPublic } from "./business.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ACCENT = "#e11c49";
const INK = "#1a1a1a";
const MUTED = "#5c5c5c";
const LINE = "#e5e5e5";
const SOFT = "#f7f7f8";
const WHITE = "#ffffff";

function fontPaths() {
  const candidates = [
    path.join(__dirname, "../../assets/fonts"),
    path.join(process.cwd(), "assets/fonts"),
  ];
  for (const dir of candidates) {
    const regular = path.join(dir, "DejaVuSans.ttf");
    const bold = path.join(dir, "DejaVuSans-Bold.ttf");
    if (fs.existsSync(regular) && fs.existsSync(bold)) {
      return { regular, bold };
    }
  }
  return null;
}

function money(n: number) {
  return `€${Number(n || 0).toFixed(2)}`;
}

function shortRef(id: string) {
  return id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: "Në pritje",
    CONFIRMED: "Konfirmuar",
    ACTIVE: "Aktive",
    COMPLETED: "Përfunduar",
    CANCELLED: "Anuluar",
    REJECTED: "Refuzuar",
  };
  return map[status] || status;
}

function paymentLabel(method: string, status: string) {
  const methods: Record<string, string> = {
    CASH: "Cash në marrje",
    CARD: "Kartë",
    TRANSFER: "Transfertë bankare",
  };
  const statuses: Record<string, string> = {
    PENDING: "Pa paguar",
    PAID: "Paguar",
    REFUNDED: "Rimbursuar",
    FAILED: "Dështuar",
  };
  return `${methods[method] || method} · ${statuses[status] || status}`;
}

function depositLabel(status?: string | null) {
  const map: Record<string, string> = {
    NONE: "Asnjë",
    HELD: "Mbajtur",
    RETURNED: "Kthyer",
    FORFEITED: "Mbajtur (humbur)",
  };
  return map[status || ""] || status || "—";
}

export function buildReservationPdf(data: {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  carLabel: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  pickupLocation: string;
  returnLocation: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  carSubtotal: number;
  extrasTotal: number;
  locationFees: number;
  totalPrice: number;
  depositAmount?: number;
  depositStatus?: string | null;
  extras: Array<{ name?: string; price?: number }>;
  createdAt: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const biz = getBusinessPublic();
    const fonts = fontPaths();
    const doc = new PDFDocument({
      margin: 0,
      size: "A4",
      info: {
        Title: `Auto Rental Faturë ${shortRef(data.id)}`,
        Author: "Auto Rental",
        Subject: "Konfirmim rezervimi / faturë",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    if (fonts) {
      doc.registerFont("Body", fonts.regular);
      doc.registerFont("BodyBold", fonts.bold);
    }
    const body = fonts ? "Body" : "Helvetica";
    const bold = fonts ? "BodyBold" : "Helvetica-Bold";

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const left = 48;
    const right = pageW - 48;
    const contentW = right - left;

    // Top accent bar
    doc.rect(0, 0, pageW, 8).fill(ACCENT);

    // Header band
    doc.rect(0, 8, pageW, 86).fill(INK);
    doc.fillColor(WHITE).font(bold).fontSize(22).text("Auto Rental", left, 28, {
      width: contentW * 0.55,
    });
    doc
      .font(body)
      .fontSize(9)
      .fillColor("#d0d0d0")
      .text("Qira makinash · www.landixhelo.me", left, 56, {
        width: contentW * 0.55,
      });

    doc
      .fillColor(WHITE)
      .font(bold)
      .fontSize(16)
      .text("FATURË", left + contentW * 0.55, 28, {
        width: contentW * 0.45,
        align: "right",
      });
    doc
      .font(body)
      .fontSize(9)
      .fillColor("#d0d0d0")
      .text(`Nr. ${shortRef(data.id)}`, left + contentW * 0.55, 50, {
        width: contentW * 0.45,
        align: "right",
      })
      .text(`Data: ${data.createdAt}`, left + contentW * 0.55, 64, {
        width: contentW * 0.45,
        align: "right",
      });

    let y = 118;

    // Business + client cards
    const colGap = 16;
    const colW = (contentW - colGap) / 2;

    function card(x: number, title: string, lines: string[]) {
      const h = 92;
      doc.roundedRect(x, y, colW, h, 6).fill(SOFT);
      doc
        .fillColor(ACCENT)
        .font(bold)
        .fontSize(9)
        .text(title.toUpperCase(), x + 14, y + 12, { width: colW - 28 });
      doc.fillColor(INK).font(bold).fontSize(11).text(lines[0] || "—", x + 14, y + 30, {
        width: colW - 28,
      });
      doc.font(body).fontSize(9).fillColor(MUTED);
      let ly = y + 46;
      for (const line of lines.slice(1).filter(Boolean)) {
        doc.text(line, x + 14, ly, { width: colW - 28 });
        ly += 13;
      }
    }

    const bizLines = [
      biz.name,
      [biz.street, biz.address].filter(Boolean).join(", ") || biz.address,
      biz.phone ? `Tel: ${biz.phone}` : "",
      biz.email,
      biz.nipt ? `NIPT: ${biz.nipt}` : "",
    ].filter(Boolean) as string[];

    const clientLines = [
      data.customerName,
      data.customerEmail,
      data.customerPhone || "",
      `Statusi: ${statusLabel(data.status)}`,
    ].filter(Boolean) as string[];

    card(left, "Nga", bizLines);
    card(left + colW + colGap, "Për", clientLines);
    y += 108;

    // Trip summary strip
    doc.roundedRect(left, y, contentW, 54, 6).lineWidth(1).strokeColor(LINE).stroke();
    const stripCols = [
      { label: "Makina", value: data.carLabel },
      { label: "Periudha", value: `${data.startDate} → ${data.endDate}` },
      { label: "Ditë", value: String(data.totalDays) },
      {
        label: "Marrje / Kthim",
        value: `${data.pickupLocation} / ${data.returnLocation}`,
      },
    ];
    const stripW = contentW / stripCols.length;
    stripCols.forEach((c, i) => {
      const sx = left + i * stripW + 10;
      doc
        .fillColor(MUTED)
        .font(body)
        .fontSize(8)
        .text(c.label.toUpperCase(), sx, y + 10, { width: stripW - 16 });
      doc
        .fillColor(INK)
        .font(bold)
        .fontSize(9)
        .text(c.value, sx, y + 26, { width: stripW - 16, ellipsis: true });
    });
    y += 72;

    // Line items table
    doc.fillColor(INK).font(bold).fontSize(11).text("Detajet e pagesës", left, y);
    y += 18;

    const cols = {
      desc: left,
      descW: contentW - 190,
      days: left + contentW - 190,
      daysW: 50,
      unit: left + contentW - 140,
      unitW: 60,
      amount: left + contentW - 80,
      amountW: 80,
    };

    doc.roundedRect(left, y, contentW, 26, 4).fill(INK);
    doc.fillColor(WHITE).font(bold).fontSize(8);
    doc.text("PËRSHKRIMI", cols.desc + 10, y + 9, { width: cols.descW - 12 });
    doc.text("DITË", cols.days, y + 9, { width: cols.daysW, align: "right" });
    doc.text("ÇMIMI", cols.unit, y + 9, { width: cols.unitW, align: "right" });
    doc.text("SHUMA", cols.amount, y + 9, {
      width: cols.amountW - 10,
      align: "right",
    });
    y += 26;

    type Row = { desc: string; days: string; unit: string; amount: number };
    const rows: Row[] = [
      {
        desc: `Qira — ${data.carLabel}`,
        days: String(data.totalDays),
        unit: money(data.totalDays ? data.carSubtotal / data.totalDays : data.carSubtotal),
        amount: data.carSubtotal,
      },
    ];

    for (const e of data.extras || []) {
      const perDay = Number(e.price || 0);
      rows.push({
        desc: `Extra — ${e.name || "Shtesë"}`,
        days: String(data.totalDays),
        unit: money(perDay),
        amount: perDay * data.totalDays,
      });
    }

    if (data.locationFees > 0) {
      rows.push({
        desc: "Tarifa lokacioni (marrje/kthim)",
        days: "—",
        unit: money(data.locationFees),
        amount: data.locationFees,
      });
    }

    rows.forEach((row, idx) => {
      const rowH = 28;
      if (idx % 2 === 0) {
        doc.rect(left, y, contentW, rowH).fill(SOFT);
      }
      doc.fillColor(INK).font(body).fontSize(9);
      doc.text(row.desc, cols.desc + 10, y + 9, {
        width: cols.descW - 12,
        ellipsis: true,
      });
      doc.text(row.days, cols.days, y + 9, {
        width: cols.daysW,
        align: "right",
      });
      doc.text(row.unit, cols.unit, y + 9, {
        width: cols.unitW,
        align: "right",
      });
      doc.font(bold).text(money(row.amount), cols.amount, y + 9, {
        width: cols.amountW - 10,
        align: "right",
      });
      y += rowH;
    });

    doc
      .moveTo(left, y)
      .lineTo(right, y)
      .strokeColor(LINE)
      .lineWidth(1)
      .stroke();
    y += 16;

    // Totals panel
    const panelW = 220;
    const panelX = right - panelW;
    const deposit = Number(data.depositAmount || 0);
    const panelH = deposit > 0 ? 110 : 78;

    doc.roundedRect(panelX, y, panelW, panelH, 6).fill(SOFT);
    let py = y + 12;
    const labelX = panelX + 14;
    const valueW = panelW - 28;

    function totalLine(
      label: string,
      value: string,
      opts?: { strong?: boolean; accent?: boolean }
    ) {
      doc
        .font(opts?.strong ? bold : body)
        .fontSize(opts?.strong ? 11 : 9)
        .fillColor(opts?.accent ? ACCENT : opts?.strong ? INK : MUTED)
        .text(label, labelX, py, { width: valueW * 0.55, continued: false });
      doc
        .font(opts?.strong ? bold : body)
        .fontSize(opts?.strong ? 11 : 9)
        .fillColor(opts?.accent ? ACCENT : INK)
        .text(value, labelX, py, { width: valueW, align: "right" });
      py += opts?.strong ? 20 : 16;
    }

    totalLine("Nëntotali qira", money(data.carSubtotal));
    if (data.extrasTotal > 0) totalLine("Extras", money(data.extrasTotal));
    if (data.locationFees > 0) totalLine("Lokacioni", money(data.locationFees));
    py += 2;
    doc
      .moveTo(panelX + 12, py)
      .lineTo(panelX + panelW - 12, py)
      .strokeColor(LINE)
      .stroke();
    py += 8;
    totalLine("TOTALI", money(data.totalPrice), { strong: true, accent: true });
    if (deposit > 0) {
      totalLine(`Depozitë (${depositLabel(data.depositStatus)})`, money(deposit));
    }

    // Payment note on the left of totals
    doc
      .fillColor(MUTED)
      .font(body)
      .fontSize(9)
      .text("Pagesa", left, y + 8, { width: contentW - panelW - 20 });
    doc
      .fillColor(INK)
      .font(bold)
      .fontSize(10)
      .text(paymentLabel(data.paymentMethod, data.paymentStatus), left, y + 24, {
        width: contentW - panelW - 20,
      });

    y += panelH + 28;

    // Notes
    doc.roundedRect(left, y, contentW, 72, 6).lineWidth(1).strokeColor(LINE).stroke();
    doc
      .fillColor(ACCENT)
      .font(bold)
      .fontSize(8)
      .text("SHËNIM", left + 14, y + 12);
    doc
      .fillColor(MUTED)
      .font(body)
      .fontSize(8)
      .text(
        "Ky dokument është konfirmim rezervimi / faturë shërbimi qiraje. Klienti duhet të ketë patentë të vlefshme dhe dokument identifikimi në marrje. Anullimet dhe depozita trajtohen sipas Kushteve të Auto Rental. Nuk zëvendëson faturë fiskale elektronike nëse kërkohet nga ligji.",
        left + 14,
        y + 26,
        { width: contentW - 28, align: "left" }
      );

    y += 92;

    // Signature lines
    const sigW = (contentW - 40) / 2;
    doc
      .moveTo(left, y + 36)
      .lineTo(left + sigW, y + 36)
      .strokeColor(LINE)
      .stroke();
    doc
      .moveTo(left + sigW + 40, y + 36)
      .lineTo(right, y + 36)
      .stroke();
    doc
      .fillColor(MUTED)
      .font(body)
      .fontSize(8)
      .text("Nënshkrimi i klientit", left, y + 42, { width: sigW })
      .text("Nënshkrimi i Auto Rental", left + sigW + 40, y + 42, {
        width: sigW,
      });

    // Footer
    doc.rect(0, pageH - 36, pageW, 36).fill(INK);
    doc
      .fillColor("#d0d0d0")
      .font(body)
      .fontSize(8)
      .text(
        [
          biz.phone && `Tel ${biz.phone}`,
          biz.email,
          "www.landixhelo.me",
          biz.hours && `Orari ${biz.hours}`,
        ]
          .filter(Boolean)
          .join("  ·  "),
        left,
        pageH - 22,
        { width: contentW, align: "center" }
      );

    doc.end();
  });
}
