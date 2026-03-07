import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/* ================= WELCOME EMAIL ================= */

export async function sendWelcomeEmail(email, name) {

  try {

    await resend.emails.send({
      from: "TechFest Canada <noreply@techfestcanada.com>",
      to: email,
      subject: "Welcome to TechFest Canada 🚀",

      html: `
        <h2>Welcome ${name}!</h2>

        <p>Thank you for joining TechFest Canada.</p>

        <p>You can now purchase your delegate pass below:</p>

        <a href="${process.env.FRONTEND_URL}/tickets"
        style="
        display:inline-block;
        padding:12px 20px;
        background:#8b5cf6;
        color:white;
        border-radius:6px;
        text-decoration:none;
        ">
        Get Your Pass
        </a>

        <p style="margin-top:20px;">
        We look forward to seeing you in Toronto.
        </p>
      `
    });

    console.log("Welcome email sent");

  } catch (err) {

    console.error("WELCOME EMAIL ERROR:", err);

  }
}

/* ================= PASSWORD RESET EMAIL ================= */

export async function sendResetPasswordEmail(email, resetLink) {

  try {

    await resend.emails.send({
      from: "TechFest Canada <noreply@techfestcanada.com>",
      to: email,
      subject: "Reset your password",

      html: `
        <h2>Password Reset Request</h2>

        <p>You requested to reset your password.</p>

        <p>Click the button below to create a new password:</p>

        <a href="${resetLink}"
        style="
        display:inline-block;
        padding:12px 20px;
        background:#f97316;
        color:white;
        border-radius:6px;
        text-decoration:none;
        ">
        Reset Password
        </a>

        <p style="margin-top:20px;">
        If you did not request this, you can safely ignore this email.
        </p>
      `
    });

    console.log("Reset password email sent");

  } catch (err) {

    console.error("RESET EMAIL ERROR:", err);

  }
}