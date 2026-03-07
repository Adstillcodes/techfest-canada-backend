import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/* ================= WELCOME EMAIL ================= */

export async function sendWelcomeEmail(email, name) {
  try {
    await resend.emails.send({
      from: "TechFest <tickets@techfestcanada.com>",
      to: email,
      subject: "Welcome to TechFest Canada 🚀",
      html: `
        <h2>Welcome ${name}!</h2>

        <p>Your account has been created successfully.</p>

        <p>
          You can now purchase your delegate pass below.
        </p>

        <a href="https://techfest-canada-frontend.vercel.app/tickets"
           style="
             display:inline-block;
             padding:12px 22px;
             background:#8B5CF6;
             color:white;
             text-decoration:none;
             border-radius:6px;
             font-weight:bold;
           ">
           Buy Your Pass
        </a>

        <br/><br/>

        <p>We look forward to seeing you at TechFest Canada.</p>

        <b>— TechFest Team</b>
      `
    });

    console.log("📧 Welcome email sent");

  } catch (err) {

    console.error("❌ Welcome email failed:", err);

  }
}

/* ================= TICKET EMAIL ================= */

export async function sendTicketEmail(email, name, pdfBuffer) {
  try {

    await resend.emails.send({
      from: "TechFest Tickets <tickets@techfestcanada.com>",
      to: email,
      subject: "Your TechFest Ticket 🎟️",
      html: `
        <h2>Hello ${name},</h2>

        <p>Your ticket purchase has been confirmed.</p>

        <p>
          Your delegate pass is attached as a PDF.
        </p>

        <p>Please bring this ticket to the event.</p>

        <br/>

        <b>TechFest Canada</b>
      `,
      attachments: [
        {
          filename: "techfest-ticket.pdf",
          content: pdfBuffer
        }
      ]
    });

    console.log("📧 Ticket email sent");

  } catch (err) {

    console.error("❌ Ticket email failed:", err);

  }
}