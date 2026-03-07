import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/* ================= WELCOME EMAIL ================= */

export async function sendWelcomeEmail(email, name) {
  try {

    console.log("📨 Attempting welcome email to:", email);

    const response = await resend.emails.send({
      from: "TechFest <onboarding@resend.dev>",
      to: email,
      subject: "Welcome to TechFest Canada 🚀",
      html: `
        <h2>Welcome ${name}!</h2>
        <p>Your account has been created successfully.</p>
      `
    });

    console.log("✅ Resend response:", response);

  } catch (err) {

    console.error("❌ Welcome email failed:", err);

  }
}

/* ================= TICKET EMAIL ================= */

export async function sendTicketEmail(email, name, pdfBuffer) {
  try {

    console.log("📨 Sending ticket email to:", email);

    const response = await resend.emails.send({
      from: "TechFest <onboarding@resend.dev>",
      to: email,
      subject: "Your TechFest Ticket 🎟️",
      html: `
        <h2>Hello ${name}</h2>
        <p>Your ticket purchase has been confirmed.</p>
      `,
      attachments: [
        {
          filename: "techfest-ticket.pdf",
          content: pdfBuffer
        }
      ]
    });

    console.log("✅ Ticket email response:", response);

  } catch (err) {

    console.error("❌ Ticket email failed:", err);

  }
}