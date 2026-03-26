import express from "express";
import jwt from "jsonwebtoken";
import CampaignTemplate from "../models/CampaignTemplate.js";
import Campaign from "../models/Campaign.js";
import Audience from "../models/Audience.js";
import { sendCampaignEmail } from "../services/emailService.js";
import { seedCampaignTemplates, createDefaultAudiences, markCampaignSent } from "../services/campaignAutomation.js";

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "https://www.thetechfestival.com";
const API_URL = process.env.API_URL || "https://techfest-canada-backend.onrender.com";

const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

router.post("/seed", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [templateResults, audiences] = await Promise.all([
      seedCampaignTemplates(),
      createDefaultAudiences(),
    ]);
    res.json({ success: true, ...templateResults, audiencesCreated: audiences.length });
  } catch (err) {
    console.error("Seed error:", err);
    res.status(500).json({ error: "Seed failed" });
  }
});

router.get("/templates", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { phase, audience, status } = req.query;
    const filter = {};
    
    if (phase) filter.phase = phase;
    if (audience) filter.audience = audience;
    if (status) filter.status = status;

    const templates = await CampaignTemplate.find(filter)
      .sort({ sendDate: 1, audience: 1 });

    const stats = {
      total: templates.length,
      pending: templates.filter(t => t.status === "pending").length,
      sent: templates.filter(t => t.status === "sent").length,
      draft: templates.filter(t => t.status === "draft").length,
    };

    res.json({ templates, stats });
  } catch (err) {
    console.error("Fetch templates error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/templates/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const template = await CampaignTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/templates/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { subject, bodySummary, ctaText, ctaLink, status, sendDate, htmlBody, textBody } = req.body;
    
    const template = await CampaignTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    if (subject) template.subject = subject;
    if (bodySummary) template.bodySummary = bodySummary;
    if (ctaText) template.ctaText = ctaText;
    if (ctaLink) template.ctaLink = ctaLink;
    if (status) template.status = status;
    if (sendDate) template.sendDate = new Date(sendDate);
    if (htmlBody !== undefined) template.htmlBody = htmlBody;
    if (textBody !== undefined) template.textBody = textBody;

    await template.save();
    res.json(template);
  } catch (err) {
    console.error("Update template error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/templates/:id/send", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { subject, htmlBody, textBody } = req.body;
    const template = await CampaignTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    const audienceMap = {
      "Sponsors": "Sponsor Leads",
      "Exhibitors": "Exhibitor Leads",
      "Delegates": "Delegate Prospects",
      "Visitors": "Visitor Prospects",
    };

    const audienceName = audienceMap[template.audience];
    const audience = await Audience.findOne({ name: audienceName });

    if (!audience || audience.contacts.length === 0) {
      return res.status(400).json({ error: `No contacts in ${audienceName} audience` });
    }

    const finalSubject = subject || template.subject;
    let html = htmlBody || template.htmlBody;
    
    if (!html) {
      html = generateEmailHtml(template);
    }

    const emailPromises = audience.contacts.map((contact) => {
      const personalizedHtml = html
        .replace(/\{\{name\}\}/g, contact.name || contact.email.split("@")[0])
        .replace(/\{\{email\}\}/g, contact.email);

      const trackingPixel = `<img src="${API_URL}/api/track/open/tpl-${template._id}/${encodeURIComponent(contact.email)}" width="1" height="1" style="display:none" alt="" />`;

      return sendCampaignEmail({
        to: contact.email,
        subject: finalSubject,
        html: personalizedHtml + trackingPixel,
        campaignId: `tpl-${template._id}`,
        recipientEmail: contact.email,
        text: textBody || template.textBody,
      });
    });

    await Promise.allSettled(emailPromises);

    if (subject) template.subject = subject;
    if (htmlBody) template.htmlBody = htmlBody;
    if (textBody) template.textBody = textBody;
    template.status = "sent";
    template.sentAt = new Date();
    await template.save();

    res.json({ success: true, sent: audience.contacts.length, template });
  } catch (err) {
    console.error("Send template error:", err);
    res.status(500).json({ error: "Failed to send" });
  }
});

router.get("/calendar", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const templates = await CampaignTemplate.find().sort({ sendDate: 1 });

    const calendar = {};
    const phases = ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5"];
    const audiences = ["Sponsors", "Exhibitors", "Delegates", "Visitors"];

    for (const phase of phases) {
      calendar[phase] = {};
      for (const audience of audiences) {
        calendar[phase][audience] = [];
      }
    }

    for (const t of templates) {
      if (calendar[t.phase] && calendar[t.phase][t.audience]) {
        calendar[t.phase][t.audience].push({
          id: t._id,
          templateId: t.templateId,
          sendDate: t.sendDate,
          subject: t.subject,
          purpose: t.purpose,
          status: t.status,
          sentAt: t.sentAt,
          htmlBody: t.htmlBody || null,
          textBody: t.textBody || null,
        });
      }
    }

    res.json({ calendar, phases, audiences });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/upcoming", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + parseInt(days));

    const templates = await CampaignTemplate.find({
      sendDate: { $gte: now, $lte: future },
      status: "pending",
    }).sort({ sendDate: 1, audience: 1 });

    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

function generateEmailHtml(template) {
  const ctaFullLink = template.ctaLink.startsWith("http") 
    ? template.ctaLink 
    : `https://${template.ctaLink}`;

  return `
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
        <h1 style="color:white;margin:0;font-size:24px;">The Tech Festival Canada 2026</h1>
        <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:14px;">October 26-27, 2026 • Toronto, ON</p>
      </div>
      
      <div style="padding:40px 30px;">
        <p style="color:#333;font-size:16px;line-height:1.6;">
          ${template.bodySummary}
        </p>
        
        <div style="text-align:center;margin:30px 0;">
          <a href="${ctaFullLink}" style="display:inline-block;background:linear-gradient(135deg,#7a3fd1,#f5a623);color:white;padding:16px 32px;border-radius:50px;text-decoration:none;font-weight:bold;font-size:16px;">
            ${template.ctaText} →
          </a>
        </div>
        
        <div style="background:#f9f5ff;border-radius:8px;padding:20px;margin-top:30px;">
          <p style="margin:0;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Campaign Info</p>
          <p style="margin:5px 0 0;color:#333;font-size:14px;">
            <strong>Phase:</strong> ${template.phase} | 
            <strong>Audience:</strong> ${template.audience} | 
            <strong>Purpose:</strong> ${template.purpose}
          </p>
        </div>
      </div>
      
      <div style="background:#1a1035;padding:30px;text-align:center;">
        <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">
          The Tech Festival Canada • Toronto, Ontario
        </p>
        <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:10px 0 0;">
          <a href="#" style="color:rgba(255,255,255,0.5);">Unsubscribe</a> | 
          <a href="#" style="color:rgba(255,255,255,0.5);">View in browser</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export default router;
