import { Resend } from "resend";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const resend = new Resend(process.env.RESEND_API_KEY);

/* =========================================================
   HELPER: GENERATE TICKET PDF
========================================================= */

async function generateTicketPDF({ name, ticketId, tier }) {

  return new Promise(async (resolve) => {

    const doc = new PDFDocument();

    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));

    doc.on("end", () => {

      const pdfData = Buffer.concat(buffers);

      resolve(pdfData);

    });

    /* ================= PDF CONTENT ================= */

    doc.fontSize(24).text("TechFest Canada", { align: "center" });

    doc.moveDown();

    doc.fontSize(16).text("Official Delegate Pass");

    doc.moveDown();

    doc.text(`Name: ${name}`);
    doc.text(`Ticket ID: ${ticketId}`);
    doc.text(`Pass Type: ${tier}`);

    doc.moveDown();

    doc.text("Venue: The Carlu, Toronto");
    doc.text("Event: October 2026");

    doc.moveDown();

    /* ================= QR CODE ================= */

  if (!ticketId) {
  throw new Error("Ticket ID missing when generating QR code");
}

const qrData = await QRCode.toDataURL(String(ticketId));
     
     const base64 = qrData.replace(/^data:image\/png;base64,/, "");

    const img = Buffer.from(base64, "base64");

    doc.image(img, {
      fit: [150, 150],
      align: "center"
    });

    doc.moveDown();

    doc.text("Present this QR code at event check-in.", {
      align: "center"
    });

    doc.end();
  });
}

/* =========================================================
   WELCOME EMAIL
========================================================= */

export async function sendWelcomeEmail(email, name) {

  try {

    await resend.emails.send({

      from: "TechFest Canada <noreply@thetechfestival.com>",

      to: email,

      subject: "Welcome to TechFest Canada 🚀",

      html: `
      <h2>Welcome ${name}!</h2>

      <p>Thank you for joining TechFest Canada.</p>

      <p>You can now purchase your delegate pass below.</p>

      <a href="${process.env.FRONTEND_URL}/tickets"
      style="padding:12px 20px;background:#8b5cf6;color:white;border-radius:6px;text-decoration:none;">
      Purchase Tickets
      </a>
      `
    });

    console.log("Welcome email sent");

  } catch (err) {

    console.error("WELCOME EMAIL ERROR:", err);

  }
}

/* =========================================================
   PASSWORD RESET EMAIL
========================================================= */

export async function sendResetPasswordEmail(email, resetLink) {

  try {

    await resend.emails.send({

      from: "TechFest Canada <noreply@thetechfestival.com>",

      to: email,

      subject: "Reset your password",

      html: `
      <h2>Password Reset Request</h2>

      <p>Click below to reset your password.</p>

      <a href="${resetLink}"
      style="padding:12px 20px;background:#f97316;color:white;border-radius:6px;text-decoration:none;">
      Reset Password
      </a>
      `
    });

    console.log("Reset email sent");

  } catch (err) {

    console.error("RESET EMAIL ERROR:", err);

  }
}

/* =========================================================
   TICKET EMAIL WITH PDF
========================================================= */

export async function sendTicketEmail({ email, name, ticketId, tier }) {

  try {

    const pdfBuffer = await generateTicketPDF({
      name,
      ticketId,
      tier
    });

    await resend.emails.send({

      from: "TechFest Canada <tickets@thetechfestival.com>",

      to: email,

      subject: "Your TechFest Canada Pass 🎟",

      html: `
      <h2>Your TechFest Canada Pass</h2>

      <p>Hello ${name},</p>

      <p>Your ticket purchase was successful.</p>

      <p><strong>Ticket ID:</strong> ${ticketId}</p>
      <p><strong>Pass Type:</strong> ${tier}</p>

      <p>Your ticket PDF is attached to this email.</p>

      <p>We look forward to seeing you in Toronto!</p>
      `,

      attachments: [
        {
          filename: `techfest-ticket-${ticketId}.pdf`,
          content: pdfBuffer
        }
      ]
    });

    console.log("Ticket email sent");

  } catch (err) {

    console.error("TICKET EMAIL ERROR:", err);

  }
}

/* =========================================================
   CAMPAIGN EMAIL
========================================================= */

export async function sendCampaignEmail({ to, subject, html, campaignId, recipientEmail, recipientTrackingId, baseUrl }) {
  try {
    await resend.emails.send({
      from: "TechFest Canada <campaigns@thetechfestival.com>",
      to,
      subject,
      html,
    });

    console.log(`Campaign email sent to ${to}`);
    return { success: true };
  } catch (err) {
    console.error("CAMPAIGN EMAIL ERROR:", err);
    return { success: false, error: err.message };
  }
}

/* =========================================================
   TRACKED LINK WRAPPER
   Wraps URLs in HTML with click tracking
========================================================= */

export function wrapLinksWithTracking(html, campaignId, recipientEmail, baseUrl) {
  if (!html) return html;
  
  try {
    const trackedHtml = html.replace(
      /href=["'](https?:\/\/[^"']+)["']/gi,
      (match, url) => {
        const encodedUrl = encodeURIComponent(url);
        const trackingUrl = `${baseUrl}/api/track/click?url=${encodedUrl}&campaignId=${campaignId}&email=${encodeURIComponent(recipientEmail)}`;
        return `href="${trackingUrl}"`;
      }
    );
    return trackedHtml;
  } catch (err) {
    console.error("Error in wrapLinksWithTracking:", err);
    return html;
  }
}
