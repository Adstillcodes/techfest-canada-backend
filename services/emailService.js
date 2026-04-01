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
    console.log(`[EMAIL SERVICE] ===== START SEND =====`);
    console.log(`[EMAIL SERVICE] To: ${to}`);
    console.log(`[EMAIL SERVICE] Subject: ${subject}`);
    console.log(`[EMAIL SERVICE] HTML length: ${html ? html.length : 0}`);
    console.log(`[EMAIL SERVICE] HTML type: ${typeof html}`);
    console.log(`[EMAIL SERVICE] HTML is string: ${typeof html === 'string'}`);
    console.log(`[EMAIL SERVICE] HTML first 100 chars: ${html ? html.substring(0, 100) : 'empty'}`);
    console.log(`[EMAIL SERVICE] HTML last 100 chars: ${html ? html.substring(html.length - 100) : 'empty'}`);
    
    // Validate HTML before sending
    if (!html || typeof html !== 'string') {
      console.error(`[EMAIL SERVICE] ERROR: HTML is invalid - type: ${typeof html}, value: ${html}`);
      return { success: false, error: 'Invalid HTML' };
    }
    
    // Check for basic HTML structure
    if (!html.includes('<html') || !html.includes('</html>')) {
      console.error(`[EMAIL SERVICE] WARNING: HTML may be malformed - missing html tags`);
    }
    if (!html.includes('<body') || !html.includes('</body>')) {
      console.error(`[EMAIL SERVICE] WARNING: HTML may be malformed - missing body tags`);
    }
    
    // Generate plain text version from HTML for email clients that prefer text
    const textContent = html
      .replace(/<[^>]+>/g, ' ')  // Remove HTML tags
      .replace(/\s+/g, ' ')        // Collapse whitespace
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
    
    console.log(`[EMAIL SERVICE] Text version length: ${textContent.length}`);
    
    const emailPayload = {
      from: "TechFest Canada <campaigns@thetechfestival.com>",
      to: [to],
      subject: subject,
      html: html,
      text: textContent,  // Add plain text fallback
    };
    
    console.log(`[EMAIL SERVICE] Payload from: ${emailPayload.from}`);
    console.log(`[EMAIL SERVICE] Payload to: ${emailPayload.to}`);
    console.log(`[EMAIL SERVICE] Payload subject: ${emailPayload.subject}`);
    console.log(`[EMAIL SERVICE] Payload html length: ${emailPayload.html ? emailPayload.html.length : 0}`);
    console.log(`[EMAIL SERVICE] Payload text length: ${emailPayload.text ? emailPayload.text.length : 0}`);
    
    const result = await resend.emails.send(emailPayload);

    console.log(`[EMAIL SERVICE] Resend result:`, result);
    console.log(`[EMAIL SERVICE] ===== END SEND =====`);
    
    if (result.error) {
      console.error(`[EMAIL SERVICE] Resend error:`, result.error);
      return { success: false, error: result.error };
    }
    
    return { success: true, result };
  } catch (err) {
    console.error("[EMAIL SERVICE] ===== ERROR =====");
    console.error("[EMAIL SERVICE] Error message:", err.message);
    console.error("[EMAIL SERVICE] Error stack:", err.stack);
    console.error("[EMAIL SERVICE] Error response:", err.response?.data);
    return { success: false, error: err.message, details: err.response?.data };
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
