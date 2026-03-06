import PDFDocument from "pdfkit";
import QRCode from "qrcode";

export async function generateTicketPDF(ticket) {

  const doc = new PDFDocument();
  const buffers = [];

  doc.on("data", buffers.push.bind(buffers));

  const qr = await QRCode.toDataURL(ticket.ticketId);

  doc.fontSize(26).text("TechFest Canada Pass", { align: "center" });

  doc.moveDown();

  doc.fontSize(16).text(`Name: ${ticket.name}`);
  doc.text(`Ticket ID: ${ticket.ticketId}`);
  doc.text(`Tier: ${ticket.type}`);
  doc.text(`Date: ${new Date(ticket.purchaseDate).toDateString()}`);

  doc.moveDown();

  doc.image(qr, {
    fit: [150, 150],
    align: "center"
  });

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => {
      const pdf = Buffer.concat(buffers);
      resolve(pdf);
    });
  });
}