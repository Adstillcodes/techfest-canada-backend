import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export async function sendWelcomeEmail(email, name) {
  const mailOptions = {
    from: `"TechFest Canada" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Welcome to TechFest Canada 🚀",
    html: `
      <h2>Welcome ${name}!</h2>
      <p>We're excited to have you join the TechFest Canada platform.</p>
      <p>You can now purchase your event pass below.</p>

      <a href="${process.env.FRONTEND_URL}/tickets"
         style="padding:12px 18px;background:#ff7a00;color:white;text-decoration:none;border-radius:6px;">
         Buy Your Pass
      </a>

      <p>See you at the event! 🚀</p>
      <p>TechFest Team</p>
    `
  };

  await transporter.sendMail(mailOptions);
}

export async function sendTicketEmail(email, name, pdfBuffer) {
  const mailOptions = {
    from: `"TechFest Canada" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your TechFest Pass 🎟",
    html: `
      <h2>Hello ${name}</h2>
      <p>Your ticket purchase was successful.</p>
      <p>Your pass is attached as a PDF.</p>
      <p>Please bring it to the event for entry.</p>
    `,
    attachments: [
      {
        filename: "TechFest-Pass.pdf",
        content: pdfBuffer
      }
    ]
  };

  await transporter.sendMail(mailOptions);
}