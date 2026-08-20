import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* ============================================================
   TTFC 2026 — Delegate pass
   Built to Baldeep's Design.pdf: landscape boarding-pass with a
   purple spine, three-band body and a perforated QR stub.

   The page IS the ticket (586 × 258pt) — no A4 letterboxing, so it
   fills a phone screen at check-in and prints as a real ticket.
   For an A4 sheet instead, see PAGE below.

   FONTS — drop these into server/fonts/ (Archivo, free on Google
   Fonts). Any missing file silently falls back to Helvetica, so a
   bad deploy degrades instead of throwing.
       Archivo-Regular.ttf  Archivo-Medium.ttf
       Archivo-SemiBold.ttf Archivo-Bold.ttf
   ============================================================ */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = process.env.TTFC_FONT_DIR || path.join(__dirname, "fonts");

/* ---- palette sampled from Design.pdf ---- */
const SPINE  = "#5926a7";   // left band
const PURPLE = "#380473";   // borders, labels, chip text
const ORANGE = "#f47600";   // eyebrow, chip, TORONTO
const INK    = "#1c152f";   // names + values
const STUB   = "#efebff";   // stub background
const DASH   = "#d0c5f8";   // perforation
const HAIR   = "#e7e1fa";   // light column dividers
const GREY   = "#6b6677";   // stub caption

/* ---- geometry (pt), scaled 1:1 from the design ---- */
const PAGE      = { w: 586, h: 258 };
const SPINE_W   = 53;
const RULE_1    = 72;      // under header band
const RULE_2    = 175.5;   // under attendee band
const PERF_X    = 426;     // perforation
const VRULE_1   = 205.5;
const VRULE_2   = 315.5;
const PAD_L     = 73.5;    // body text left edge
const BODY_R    = 412;     // body right edge (before perforation)
const STUB_L    = 444;     // stub text left edge

export function resolveAttendeeName(ticket = {}) {
  const clean = (v) => (typeof v === "string" ? v.trim() : "");

  const first = clean(ticket.firstName || ticket.first_name || ticket.givenName);
  const last  = clean(ticket.lastName  || ticket.last_name  || ticket.familyName);
  if (first || last) return [first, last].filter(Boolean).join(" ");

  const whole = clean(
    ticket.name || ticket.fullName || ticket.full_name ||
    ticket.customerName || ticket.customer_name ||
    (ticket.customer && ticket.customer.name) ||
    (ticket.billing_details && ticket.billing_details.name)
  );
  if (whole && whole.toLowerCase() !== "guest") return whole;

  const email = clean(ticket.email || (ticket.customer && ticket.customer.email));
  if (email.includes("@")) {
    const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
    if (local) {
      return local.split(" ").filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }
  }
  return "Guest";
}

function splitDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return [
    d.toLocaleDateString("en-CA", { month: "long", day: "numeric" }) + ",",
    String(d.getFullYear()),
  ];
}

function registerFont(doc, alias, file, fallback) {
  try {
    const full = path.join(FONT_DIR, file);
    if (fs.existsSync(full)) { doc.registerFont(alias, full); return alias; }
  } catch (_) { /* ignore */ }
  return fallback;
}

export async function generateTicketPDF(ticket = {}) {
  const doc = new PDFDocument({ size: [PAGE.w, PAGE.h], margin: 0 });
  const buffers = [];
  doc.on("data", buffers.push.bind(buffers));

  const F = {
    bold   : registerFont(doc, "ar-bold",  "Archivo-Bold.ttf",     "Helvetica-Bold"),
    semi   : registerFont(doc, "ar-semi",  "Archivo-SemiBold.ttf", "Helvetica-Bold"),
    medium : registerFont(doc, "ar-med",   "Archivo-Medium.ttf",   "Helvetica"),
    regular: registerFont(doc, "ar-reg",   "Archivo-Regular.ttf",  "Helvetica"),
  };

  const attendee  = resolveAttendeeName(ticket);
  const ticketId  = String(ticket.ticketId || ticket.id || "—");
  const passType  = String(ticket.type || ticket.tier || "Delegate")
                      .replace(/\s*pass$/i, "").toUpperCase();
  const purchased = splitDate(ticket.purchaseDate || ticket.createdAt);

  const qrData = await QRCode.toDataURL(ticketId, {
    errorCorrectionLevel: "H", margin: 0, width: 600,
    color: { dark: INK, light: "#ffffff" },
  });

  /* ---------- text helpers ---------- */
  const label = (text, x, y, color = PURPLE) =>
    doc.font(F.bold).fontSize(6.6).fillColor(color)
       .text(String(text).toUpperCase(), x, y, {
         characterSpacing: 1.9, lineBreak: false,
       });

  const wrap = (text, font, size, maxWidth) => {
    doc.font(font).fontSize(size);
    const out = [];
    let line = "";
    for (const word of String(text).split(/\s+/)) {
      const trial = line ? `${line} ${word}` : word;
      if (doc.widthOfString(trial) > maxWidth && line) { out.push(line); line = word; }
      else line = trial;
    }
    if (line) out.push(line);
    return out;
  };

  const lines = (arr, x, y, font, size, color, leading) => {
    doc.font(font).fontSize(size).fillColor(color);
    arr.forEach((ln, i) =>
      doc.text(ln, x, y + i * leading, { lineBreak: false, characterSpacing: -0.1 })
    );
  };

  /* ================= CANVAS ================= */
  doc.rect(0, 0, PAGE.w, PAGE.h).fill("#ffffff");
  doc.rect(PERF_X, 0, PAGE.w - PERF_X, PAGE.h).fill(STUB);
  doc.rect(0, 0, SPINE_W, PAGE.h).fill(SPINE);

  /* ---- rules ---- */
  doc.lineWidth(1.4).strokeColor(PURPLE);
  doc.moveTo(SPINE_W, RULE_1).lineTo(PERF_X, RULE_1).stroke();
  doc.moveTo(SPINE_W, RULE_2).lineTo(PERF_X, RULE_2).stroke();

  doc.lineWidth(1).strokeColor(HAIR);
  doc.moveTo(VRULE_1, RULE_2).lineTo(VRULE_1, PAGE.h).stroke();
  doc.moveTo(VRULE_2, RULE_2).lineTo(VRULE_2, PAGE.h).stroke();

  doc.lineWidth(1).strokeColor(DASH).dash(3, { space: 3 });
  doc.moveTo(PERF_X, 0).lineTo(PERF_X, PAGE.h).stroke();
  doc.undash();

  /* outer border last so nothing paints over it */
  doc.lineWidth(1.6).strokeColor(PURPLE)
     .rect(0.8, 0.8, PAGE.w - 1.6, PAGE.h - 1.6).stroke();

  /* ================= SPINE ================= */
  const spineCx = SPINE_W / 2;

  doc.save();
  doc.rotate(-90, { origin: [spineCx, 88] });
  doc.font(F.bold).fontSize(15.5).fillColor("#ffffff")
     .text("TTFC 2026", spineCx - 66, 88 - 8, {
       width: 132, align: "center", characterSpacing: 4.6, lineBreak: false,
     });
  doc.restore();

  doc.save();
  doc.rotate(-90, { origin: [spineCx, 224] });
  doc.font(F.bold).fontSize(6.6).fillColor(ORANGE)
     .text("TORONTO", spineCx - 34, 224 - 4, {
       width: 68, align: "center", characterSpacing: 2.4, lineBreak: false,
     });
  doc.restore();

  /* ================= HEADER BAND ================= */
  doc.font(F.bold).fontSize(7).fillColor(ORANGE)
     .text("OFFICIAL DELEGATE PASS", PAD_L, 19, {
       characterSpacing: 1.9, lineBreak: false,
     });

  doc.font(F.bold).fontSize(16.5).fillColor(INK)
     .text("The Tech Festival Canada", PAD_L, 36, {
       characterSpacing: -0.3, lineBreak: false,
     });

  doc.font(F.bold).fontSize(10.5).fillColor(INK)
     .text("26 & 27", PAD_L, 21, { width: BODY_R - PAD_L, align: "right", lineBreak: false })
     .text("October 2026", PAD_L, 36, { width: BODY_R - PAD_L, align: "right", lineBreak: false });

  /* ================= ATTENDEE BAND ================= */
  label("Attendee", PAD_L, 94);

  const nameMax = 232;
  let nameSize = 25, nameLines = wrap(attendee, F.bold, nameSize, nameMax);
  while (nameLines.length > 2 && nameSize > 15) {
    nameSize -= 2;
    nameLines = wrap(attendee, F.bold, nameSize, nameMax);
  }
  nameLines = nameLines.slice(0, 2);
  const nameLead = nameSize * 1.16;
  const nameTop = 108 + (2 - nameLines.length) * (nameLead / 2);

  doc.font(F.bold).fontSize(nameSize).fillColor(INK);
  nameLines.forEach((ln, i) =>
    doc.text(ln, PAD_L, nameTop + i * nameLead, {
      lineBreak: false, characterSpacing: -0.6, ellipsis: true, width: nameMax,
    })
  );

  /* pass-type chip */
  label("Pass type", VRULE_2 + 1, 124);
  const chipX = VRULE_2 + 1, chipY = 135, chipH = 25;
  const chipW = Math.max(
    90,
    doc.font(F.bold).fontSize(11).widthOfString(passType) + 34
  );
  doc.rect(chipX, chipY, chipW, chipH).fill(ORANGE);
  doc.font(F.bold).fontSize(11).fillColor(PURPLE)
     .text(passType, chipX, chipY + 7.5, {
       width: chipW, align: "center", characterSpacing: 0.6, lineBreak: false,
     });

  /* ================= FACTS BAND ================= */
  label("Venue", PAD_L, 194);
  lines(
    wrap("The Westin Harbour Castle, Toronto", F.bold, 10, VRULE_1 - PAD_L - 14),
    PAD_L, 205, F.bold, 10, INK, 12.6
  );

  label("Dates", VRULE_1 + 16, 194);
  lines(["26 & 27", "October 2026"], VRULE_1 + 16, 205, F.bold, 10, INK, 12.6);

  if (purchased) {
    label("Purchased", VRULE_2 + 16, 194);
    lines(purchased, VRULE_2 + 16, 205, F.bold, 10, INK, 12.6);
  }

  /* ================= STUB ================= */
  label("Ticket ID", STUB_L, 18);
  doc.font(F.bold).fontSize(11.5).fillColor(INK)
     .text(ticketId, STUB_L, 29, {
       width: PAGE.w - STUB_L - 18, characterSpacing: 0.4,
       lineBreak: false, ellipsis: true,
     });

  const qrBox = 100, qrX = 456, qrY = 78, inset = 6.5;
  doc.lineWidth(1.2).strokeColor(PURPLE)
     .rect(qrX, qrY, qrBox, qrBox).fillAndStroke("#ffffff", PURPLE);
  doc.image(qrData, qrX + inset, qrY + inset, {
    width: qrBox - inset * 2, height: qrBox - inset * 2,
  });

  lines(
    [
      "Present this QR code at event",
      "check-in. Have this pass ready on",
      "your phone or printed.",
    ],
    STUB_L, 212, F.regular, 7.4, GREY, 10.4
  );

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
  });
}

export default generateTicketPDF;
