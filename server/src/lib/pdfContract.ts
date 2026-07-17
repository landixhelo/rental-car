import PDFDocument from "pdfkit";

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
  extras: Array<{ name?: string; price?: number }>;
  createdAt: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("AutoRent — Kontratë Rezervimi", { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#555").text(`ID: ${data.id}`);
    doc.text(`Krijuar: ${data.createdAt}`);
    doc.fillColor("#000");
    doc.moveDown();

    doc.fontSize(13).text("Klienti");
    doc.fontSize(11).text(data.customerName);
    doc.text(data.customerEmail);
    if (data.customerPhone) doc.text(data.customerPhone);
    doc.moveDown();

    doc.fontSize(13).text("Makina & periudha");
    doc.fontSize(11).text(data.carLabel);
    doc.text(`${data.startDate} → ${data.endDate} (${data.totalDays} ditë)`);
    doc.text(`Marrje: ${data.pickupLocation}`);
    doc.text(`Kthim: ${data.returnLocation}`);
    doc.text(`Statusi: ${data.status}`);
    doc.moveDown();

    doc.fontSize(13).text("Pagesa");
    doc.fontSize(11).text(`Metoda: ${data.paymentMethod}`);
    doc.text(`Statusi pagesës: ${data.paymentStatus}`);
    doc.text(`Nëntotali makina: €${data.carSubtotal.toFixed(2)}`);
    doc.text(`Extras: €${data.extrasTotal.toFixed(2)}`);
    if (data.extras?.length) {
      for (const e of data.extras) {
        doc.text(`  • ${e.name || "Extra"}${e.price != null ? ` (€${e.price}/ditë)` : ""}`);
      }
    }
    doc.text(`Tarifa lokacioni: €${data.locationFees.toFixed(2)}`);
    doc.moveDown(0.3);
    doc.fontSize(12).text(`TOTALI: €${data.totalPrice.toFixed(2)}`, {
      underline: true,
    });
    doc.moveDown();

    doc.fontSize(10).fillColor("#444").text(
      "Kjo është një konfirmim rezervimi. Klienti duhet të ketë patentë të vlefshme dhe dokument identifikimi në momentin e marrjes. Anullimet dhe depozita trajtohen sipas Kushteve të AutoRent. www.landixhelo.me",
      { align: "left" }
    );

    doc.end();
  });
}
