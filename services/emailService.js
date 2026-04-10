import { Resend } from "resend";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const resend = new Resend(process.env.RESEND_API_KEY);

/* =========================================================
   SANITIZE EMAIL HTML - Remove <title> tags
========================================================= */

export function sanitizeEmailHtml(html) {
  if (!html) return html;
  // Remove <title> tags and their content
  return html.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "");
}

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
    console.log(`[EMAIL SERVICE] HTML length: ${html.length}`);
    console.log(`[EMAIL SERVICE] HTML first 200 chars:\n${html.substring(0, 200)}`);
    console.log(`[EMAIL SERVICE] HTML middle 200 chars:\n${html.substring(Math.floor(html.length/2 - 100), Math.floor(html.length/2 + 100))}`);
    console.log(`[EMAIL SERVICE] HTML last 200 chars:\n${html.substring(html.length - 200)}`);
    console.log(`[EMAIL SERVICE] HTML contains </body>: ${html.includes('</body>')}`);
    console.log(`[EMAIL SERVICE] HTML contains </html>: ${html.includes('</html>')}`);
    console.log(`[EMAIL SERVICE] HTML contains <title>: ${html.includes('<title>')}`);
    console.log(`[EMAIL SERVICE] HTML contains </title>: ${html.includes('</title>')}`);
    console.log(`[EMAIL SERVICE] HTML contains <table: ${html.includes('<table')}`);
    console.log(`[EMAIL SERVICE] HTML contains </table>: ${html.includes('</table>')}`);
    
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
    
    // Log the complete payload as JSON for inspection
    const emailPayload = {
      from: "TechFest Canada <campaigns@thetechfestival.com>",
      to: [to],
      subject: subject,
      html: html,
    };
    
    console.log(`[EMAIL SERVICE] Full payload JSON (truncated):`);
    console.log(`  from: ${emailPayload.from}`);
    console.log(`  to: ${emailPayload.to}`);
    console.log(`  subject: ${emailPayload.subject}`);
    console.log(`  html length: ${emailPayload.html.length}`);
    console.log(`  html starts with: ${emailPayload.html.substring(0, 50)}`);
    console.log(`  html ends with: ${emailPayload.html.substring(emailPayload.html.length - 50)}`);
    
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
   BATCH CAMPAIGN EMAIL - Rate-limited sending
========================================================= */

export async function sendBatchCampaignEmails(emails, subject, htmlTemplate, campaignId, baseUrl, ratePerSecond = 5) {
  const delayMs = Math.ceil(1000 / ratePerSecond); // Delay between each send
  const results = [];
  
  console.log(`[BATCH SEND] Starting batch send: ${emails.length} emails at ${ratePerSecond}/sec (delay: ${delayMs}ms)`);
  
  for (let i = 0; i < emails.length; i++) {
    const { email, trackingId } = emails[i];
    
    try {
      // Generate personalized HTML for this recipient
      let personalizedHtml = htmlTemplate
        .replace(/\{\{name}}/g, email.split('@')[0])
        .replace(/\{\{email}}/g, email)
        .replace(/\{\{firstname}}/g, email.split('@')[0])
        .replace(/\{\{lastname}}/g, "")
        .replace(/\{\{company}}/g, "")
        .replace(/\{\{title}}/g, "")
        .replace(/\{\{location}}/g, "");
      
      // Add tracking pixel
      const trackingPixel = `<img src="${baseUrl}/api/track/open/${campaignId}/${encodeURIComponent(email)}" width="1" height="1" style="display:none" alt="" />`;
      if (personalizedHtml.includes('</body>')) {
        personalizedHtml = personalizedHtml.replace('</body>', trackingPixel + '</body>');
      } else if (personalizedHtml.includes('</html>')) {
        personalizedHtml = personalizedHtml.replace('</html>', trackingPixel + '</html>');
      }
      
      // Add footer
      const footer = generateCampaignFooter(baseUrl, campaignId, email);
      if (personalizedHtml.includes('</body>')) {
        personalizedHtml = personalizedHtml.replace('</body>', footer + '</body>');
      } else {
        personalizedHtml += footer;
      }
      
      const emailPayload = {
        from: "TechFest Canada <campaigns@thetechfestival.com>",
        to: [email],
        subject: subject,
        html: personalizedHtml,
      };
      
      const result = await resend.emails.send(emailPayload);
      
      if (result.error) {
        console.error(`[BATCH SEND] Error to ${email}:`, result.error);
        results.push({ email, success: false, error: result.error });
      } else {
        results.push({ email, success: true, id: result.data?.id });
      }
    } catch (err) {
      console.error(`[BATCH SEND] Exception to ${email}:`, err.message);
      results.push({ email, success: false, error: err.message });
    }
    
    // Rate limiting delay (skip delay for last email)
    if (i < emails.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    // Progress log every 25 emails
    if ((i + 1) % 25 === 0 || i === emails.length - 1) {
      console.log(`[BATCH SEND] Progress: ${i + 1}/${emails.length} sent`);
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  console.log(`[BATCH SEND] Complete: ${successCount} success, ${failCount} failed`);
  
  return { results, successCount, failCount };
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

/* =========================================================
   UNSUBSCRIBE CONFIRMATION EMAIL
======================================================== */

export async function sendUnsubscribeConfirmationEmail(email) {
  try {
    const baseUrl = process.env.FRONTEND_URL || "https://www.thetechfestival.com";
    
    await resend.emails.send({
      from: "TechFest Canada <campaigns@thetechfestival.com>",
      to: email,
      subject: "You've been unsubscribed from TechFest Canada",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f0ff;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
      <div style="background:linear-gradient(135deg,#7a3fd1,#f5a623);padding:40px 30px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:24px;">The Tech Festival Canada</h1>
        <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:14px;">Unsubscribe Confirmation</p>
      </div>
      
      <div style="padding:40px 30px;text-align:center;">
        <div style="font-size:48px;margin-bottom:20px;">✓</div>
        <h2 style="color:#333;margin:0 0 20px;">You've been unsubscribed</h2>
        <p style="color:#666;font-size:16px;line-height:1.6;">
          You've been successfully unsubscribed from The Tech Festival Canada emails.
        </p>
        <p style="color:#666;font-size:16px;line-height:1.6;">
          We're sorry to see you go! If you unsubscribed by mistake, you can always re-subscribe on our website.
        </p>
        
        <div style="margin-top:30px;">
          <a href="${baseUrl}" style="display:inline-block;background:linear-gradient(135deg,#7a3fd1,#f5a623);color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Return to TechFest Canada
          </a>
        </div>
      </div>
      
      <div style="background:#1a1035;padding:30px;text-align:center;">
        <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">
          The Tech Festival Canada • Toronto, Ontario
        </p>
      </div>
    </div>
  </div>
</body>
</html>
      `
    });

    console.log("Unsubscribe confirmation email sent");
  } catch (err) {
    console.error("UNSUBSCRIBE CONFIRMATION EMAIL ERROR:", err);
  }
}

/* =========================================================
   SHARED CAMPAIGN EMAIL FOOTER
   Used by both campaigns.js and campaignAutomation.js
======================================================== */

export function generateCampaignFooter(baseUrl, campaignId, email) {
  const unsubscribeUrl = `${baseUrl}/api/track/unsubscribe/${campaignId}/${encodeURIComponent(email)}`;
  const viewBrowserUrl = `${baseUrl}/api/track/view/${campaignId}/${encodeURIComponent(email)}`;
  
  return `
    <div style="background:#1a1035;padding:20px;text-align:center;margin-top:20px;border-radius:0 0 12px 12px;">
      <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">
        The Tech Festival Canada • Toronto, Ontario
      </p>
      <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:10px 0 0;">
        <a href="${unsubscribeUrl}" style="color:rgba(255,255,255,0.5);text-decoration:none;">Unsubscribe</a> | 
        <a href="${viewBrowserUrl}" style="color:rgba(255,255,255,0.5);text-decoration:none;">View in browser</a>
      </p>
    </div>
  `;
}
