import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/* ================= WELCOME EMAIL ================= */

export async function sendWelcomeEmail(email, name) {

  try {

    await resend.emails.send({
      from: "TechFest <onboarding@resend.dev>",
      to: email,
      subject: "Welcome to TechFest Canada 🚀",
      html: `
        <h2>Welcome ${name}!</h2>

        <p>Your account has been created successfully.</p>

        <a href="https://techfest-canada-frontend.vercel.app/tickets"
        style="padding:12px 20px;background:#8B5CF6;color:white;border-radius:6px;text-decoration:none;">
        Buy Your Pass
        </a>

        <p>— TechFest Team</p>
      `
    });

    console.log("📧 Welcome email sent");

  } catch (err) {

    console.error("❌ Welcome email failed:", err);

  }

}

/* ================= PASSWORD RESET EMAIL ================= */

export async function sendPasswordResetEmail(email, name, resetURL) {

  try {

    await resend.emails.send({

      from: "TechFest Support <onboarding@resend.dev>",

      to: email,

      subject: "Reset your TechFest password",

      html: `
        <h2>Hello ${name}</h2>

        <p>You requested a password reset.</p>

        <p>Click the button below to reset your password:</p>

        <a href="${resetURL}"
        style="
        padding:12px 20px;
        background:#8B5CF6;
        color:white;
        border-radius:6px;
        text-decoration:none;
        ">
        Reset Password
        </a>

        <p>This link expires in 30 minutes.</p>

        <p>If you did not request this, ignore this email.</p>
      `

    });

    console.log("📧 Reset email sent");

  } catch (err) {

    console.error("❌ Reset email failed:", err);

  }

}

/* ================= TICKET EMAIL ================= */

export async function sendTicketEmail(email, name, pdfBuffer) {

  try {

    await resend.emails.send({

      from: "TechFest Tickets <onboarding@resend.dev>",

      to: email,

      subject: "Your TechFest Ticket 🎟️",

      html: `
        <h2>Hello ${name}</h2>

        <p>Your ticket purchase has been confirmed.</p>

        <p>Your delegate pass is attached as a PDF.</p>
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