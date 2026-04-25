import PDFDocument from "pdfkit";
import QRCode from "qrcode";

export async function generateTicketPDF(ticket) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const buffers = [];
  doc.on("data", buffers.push.bind(buffers));

  const qr = await QRCode.toDataURL(ticket.ticketId);

  /* ================= HEADER ================= */
  doc
    .rect(0, 0, doc.page.width, 90)
    .fill("#7a3fd1");

  doc
    .fillColor("white")
    .fontSize(22)
    .text("The Tech Festival Canada", 0, 30, { align: "center" });

  doc
    .fillColor("#f5a623")
    .fontSize(12)
    .text("OFFICIAL DELEGATE PASS", 0, 60, {
      align: "center",
      characterSpacing: 3
    });

  /* ================= BODY ================= */
  doc.moveDown(5);
  doc.fillColor("black");

  doc
    .fontSize(20)
    .fillColor("#1a1035")
    .text(`Hello, ${ticket.name}`, { align: "left" });

  doc.moveDown(0.5);
  doc
    .fontSize(12)
    .fillColor("#555")
    .text("Welcome to TechFest Canada. Below are your pass details — please keep this document handy for check-in.");

  doc.moveDown(1.5);

  /* ================= DETAILS BOX ================= */
  const boxTop = doc.y;
  doc
    .roundedRect(50, boxTop, doc.page.width - 100, 140, 8)
    .fillAndStroke("#f8f5ff", "#ece4ff");

  doc.fillColor("#7a3fd1").fontSize(10).text("TICKET ID", 70, boxTop + 15, {
    characterSpacing: 1.5
  });
  doc.fillColor("#1a1035").fontSize(14).text(ticket.ticketId, 70, boxTop + 30);

  doc.fillColor("#7a3fd1").fontSize(10).text("PASS TIER", 70, boxTop + 55, {
    characterSpacing: 1.5
  });
  doc.fillColor("#1a1035").fontSize(14).text(ticket.type, 70, boxTop + 70);

  doc.fillColor("#7a3fd1").fontSize(10).text("PURCHASE DATE", 70, boxTop + 95, {
    characterSpacing: 1.5
  });
  doc
    .fillColor("#1a1035")
    .fontSize(14)
    .text(new Date(ticket.purchaseDate).toDateString(), 70, boxTop + 110);

  /* ================= EVENT INFO ================= */
  doc.moveDown(2);
  doc.y = boxTop + 160;

  doc
    .fontSize(12)
    .fillColor("#7a3fd1")
    .text("EVENT DETAILS", 50, doc.y, { characterSpacing: 1.5 });

  doc.moveDown(0.5);
  doc.fillColor("#333").fontSize(13);
  doc.text("Dates:  26 & 27 October 2026");
  doc.text("Venue:  The Westin Harbour Castle, Toronto");

  /* ================= QR CODE ================= */
  doc.moveDown(2);
  doc
    .fontSize(12)
    .fillColor("#7a3fd1")
    .text("CHECK-IN QR CODE", { align: "center", characterSpacing: 1.5 });
  doc.moveDown(0.5);

  doc.image(qr, {
    fit: [150, 150],
    align: "center"
  });

  doc.moveDown(0.5);
  doc
    .fontSize(10)
    .fillColor("#888")
    .text("Present this QR code at the venue entrance.", { align: "center" });

  /* ================= FOOTER ================= */
  const footerTop = doc.page.height - 60;
  doc
    .rect(0, footerTop, doc.page.width, 60)
    .fill("#1a1035");

  doc
    .fillColor("white")
    .fontSize(10)
    .text(
      "The Tech Festival Canada  •  Toronto, Ontario",
      0,
      footerTop + 18,
      { align: "center" }
    );

  doc
    .fillColor("rgba(255,255,255,0.6)")
    .fontSize(9)
    .text(
      "Questions? Contact marcom@thetechfestival.com  •  thetechfestival.com",
      0,
      footerTop + 35,
      { align: "center" }
    );

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => {
      const pdf = Buffer.concat(buffers);
      resolve(pdf);
    });
  });
}
