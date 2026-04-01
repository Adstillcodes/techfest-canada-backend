import express from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";
import crypto from "crypto";

import Campaign from "../models/Campaign.js";
import Audience from "../models/Audience.js";
import EmailTracking from "../models/EmailTracking.js";
import { sendCampaignEmail, wrapLinksWithTracking } from "../services/emailService.js";

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "https://www.thetechfestival.com";

const authMiddleware = (req, res, next) => {
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

const upload = multer({ storage: multer.memoryStorage() });

function generateTrackingId() {
  return crypto.randomBytes(16).toString("hex");
}

router.get("/audiences", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const audiences = await Audience.find().sort({ createdAt: -1 });
    const result = audiences.map((a) => ({
      _id: a._id,
      name: a.name,
      description: a.description,
      contactCount: a.contactCount,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
    res.json(result);
  } catch (err) {
    console.error("Fetch audiences error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/audiences", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description, emails } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Audience name is required" });
    }

    const contacts = (emails || []).map((email) => ({
      email: email.toLowerCase().trim(),
      addedAt: new Date(),
    }));

    const audience = new Audience({
      name,
      description: description || "",
      contacts,
      createdBy: req.user.userId,
    });

    await audience.save();

    res.json({
      _id: audience._id,
      name: audience.name,
      description: audience.description,
      contactCount: audience.contactCount,
      createdAt: audience.createdAt,
      updatedAt: audience.updatedAt,
    });
  } catch (err) {
    console.error("Create audience error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/audiences/import", authMiddleware, adminMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { name } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    const contacts = [];
    const stream = Readable.from(req.file.buffer.toString());

    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on("data", (row) => {
          // Get all keys and trim them to handle "First Name " with trailing space
          const keys = Object.keys(row);
          const getValue = (patterns) => {
            for (const pattern of patterns) {
              for (const key of keys) {
                if (key.trim().toLowerCase() === pattern.toLowerCase()) {
                  return row[key];
                }
              }
            }
            return "";
          };

          const email = getValue(["email", "Email", "EMAIL", "EmailAddress", "Email Address"]);
          const nameField = getValue(["name", "Name", "NAME"]);
          const firstName = getValue(["firstname", "firstName", "First Name", "FirstName", "Person FirstName", "Person_FirstName"]);
          const lastName = getValue(["lastname", "lastName", "Last Name", "LastName", "Person LastName", "Person_LastName"]);
          const company = getValue(["company", "Company", "companyName", "Company Name", "Company_Name"]);
          const title = getValue(["title", "Title", "jobTitle", "Job Title", "Person Title", "Person_Title"]);
          const location = getValue(["location", "Location", "Person Location", "Person_Location"]);
          
          if (email && email.includes("@")) {
            contacts.push({
              email: email.toLowerCase().trim(),
              name: String(nameField).trim(),
              firstName: String(firstName).trim(),
              lastName: String(lastName).trim(),
              company: String(company).trim(),
              title: String(title).trim(),
              location: String(location).trim(),
              addedAt: new Date(),
            });
          }
        })
        .on("end", resolve)
        .on("error", reject);
    });

    const audience = new Audience({
      name: name || `Import ${new Date().toLocaleDateString()}`,
      contacts,
      createdBy: req.user.userId,
    });

    await audience.save();

    res.json({
      success: true,
      _id: audience._id,
      name: audience.name,
      contactCount: audience.contactCount,
    });
  } catch (err) {
    console.error("Import audience error:", err);
    res.status(500).json({ error: "Failed to import CSV" });
  }
});

router.get("/audiences/:id/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const audience = await Audience.findById(req.params.id);
    if (!audience) {
      return res.status(404).json({ error: "Audience not found" });
    }

    res.json({
      _id: audience._id,
      name: audience.name,
      contactCount: audience.contactCount,
      contacts: audience.contacts.slice(0, 100),
    });
  } catch (err) {
    console.error("Audience stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/audiences/:id/contacts", authMiddleware, adminMiddleware, async (req, res) => {
  console.log("Contacts route hit for ID:", req.params.id);
  try {
    const audience = await Audience.findById(req.params.id);
    console.log("Audience found:", audience ? "yes" : "no");
    if (!audience) {
      return res.status(404).json({ error: "Audience not found" });
    }

    res.json({
      _id: audience._id,
      name: audience.name,
      contactCount: audience.contactCount,
      contacts: audience.contacts,
    });
  } catch (err) {
    console.error("Audience contacts error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/audiences/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Audience.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete audience error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/audiences/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    const audience = await Audience.findById(req.params.id);
    
    if (!audience) {
      return res.status(404).json({ error: "Audience not found" });
    }

    if (name) audience.name = name;
    if (description !== undefined) audience.description = description;
    
    await audience.save();

    res.json({
      _id: audience._id,
      name: audience.name,
      description: audience.description,
      contactCount: audience.contactCount,
      updatedAt: audience.updatedAt,
    });
  } catch (err) {
    console.error("Update audience error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/audiences/:id/contacts", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { emails } = req.body;
    const audience = await Audience.findById(req.params.id);
    
    if (!audience) {
      return res.status(404).json({ error: "Audience not found" });
    }

    const existingEmails = new Set(audience.contacts.map((c) => c.email));
    const newContacts = (emails || [])
      .map((email) => email.toLowerCase().trim())
      .filter((email) => email && email.includes("@") && !existingEmails.has(email))
      .map((email) => ({
        email,
        addedAt: new Date(),
      }));

    audience.contacts.push(...newContacts);
    await audience.save();

    res.json({
      success: true,
      contactCount: audience.contactCount,
      addedCount: newContacts.length,
      skippedCount: (emails || []).length - newContacts.length,
    });
  } catch (err) {
    console.error("Add contacts error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/audiences/:id/import", authMiddleware, adminMiddleware, upload.single("file"), async (req, res) => {
  try {
    const audience = await Audience.findById(req.params.id);
    
    if (!audience) {
      return res.status(404).json({ error: "Audience not found" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    const existingEmails = new Set(audience.contacts.map((c) => c.email));
    const contacts = [];
    
    const stream = Readable.from(req.file.buffer.toString());

    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on("data", (row) => {
          const keys = Object.keys(row);
          const getValue = (patterns) => {
            for (const pattern of patterns) {
              for (const key of keys) {
                if (key.trim().toLowerCase() === pattern.toLowerCase()) {
                  return row[key];
                }
              }
            }
            return "";
          };

          const email = getValue(["email", "Email", "EMAIL", "EmailAddress", "Email Address"]);
          const nameField = getValue(["name", "Name", "NAME"]);
          const firstName = getValue(["firstname", "firstName", "First Name", "FirstName", "Person FirstName", "Person_FirstName"]);
          const lastName = getValue(["lastname", "lastName", "Last Name", "LastName", "Person LastName", "Person_LastName"]);
          const company = getValue(["company", "Company", "companyName", "Company Name", "Company_Name"]);
          const title = getValue(["title", "Title", "jobTitle", "Job Title", "Person Title", "Person_Title"]);
          const location = getValue(["location", "Location", "Person Location", "Person_Location"]);
          
          if (email && email.includes("@")) {
            const normalizedEmail = email.toLowerCase().trim();
            if (!existingEmails.has(normalizedEmail)) {
              contacts.push({
                email: normalizedEmail,
                name: String(nameField).trim(),
                firstName: String(firstName).trim(),
                lastName: String(lastName).trim(),
                company: String(company).trim(),
                title: String(title).trim(),
                location: String(location).trim(),
                addedAt: new Date(),
              });
              existingEmails.add(normalizedEmail);
            }
          }
        })
        .on("end", resolve)
        .on("error", reject);
    });

    audience.contacts.push(...contacts);
    await audience.save();

    res.json({
      success: true,
      contactCount: audience.contactCount,
      addedCount: contacts.length,
    });
  } catch (err) {
    console.error("Import to audience error:", err);
    res.status(500).json({ error: "Failed to import CSV" });
  }
});

router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .sort({ createdAt: -1 })
      .populate("audienceId", "name");

    const result = campaigns.map((c) => ({
      _id: c._id,
      name: c.name,
      subject: c.subject,
      status: c.status,
      audienceId: c.audienceId?._id,
      audienceName: c.audienceId?.name,
      stats: c.stats,
      scheduledAt: c.scheduledAt,
      sentAt: c.sentAt,
      createdAt: c.createdAt,
    }));

    res.json(result);
  } catch (err) {
    console.error("Fetch campaigns error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, subject, audienceId, template, scheduledAt } = req.body;

    if (!name || !subject || !audienceId || !template) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const campaign = new Campaign({
      name,
      subject,
      audienceId,
      template,
      status: "draft",
      scheduledAt: scheduledAt || null,
      createdBy: req.user.userId,
    });

    await campaign.save();

    res.json({
      _id: campaign._id,
      name: campaign.name,
      subject: campaign.subject,
      status: campaign.status,
      stats: campaign.stats,
      createdAt: campaign.createdAt,
    });
  } catch (err) {
    console.error("Create campaign error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, subject, template, scheduledAt } = req.body;

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (name) campaign.name = name;
    if (subject) campaign.subject = subject;
    if (template) campaign.template = template;
    if (scheduledAt) campaign.scheduledAt = scheduledAt;

    await campaign.save();

    res.json({
      _id: campaign._id,
      name: campaign.name,
      subject: campaign.subject,
      status: campaign.status,
      stats: campaign.stats,
    });
  } catch (err) {
    console.error("Update campaign error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    await EmailTracking.deleteMany({ campaignId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete campaign error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:id/launch", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate("audienceId");
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (campaign.status === "sent") {
      return res.status(400).json({ error: "Campaign already sent" });
    }

    const audience = campaign.audienceId;
    if (!audience || audience.contacts.length === 0) {
      return res.status(400).json({ error: "No contacts in audience" });
    }

    campaign.status = "sending";
    campaign.sentAt = new Date();
    await campaign.save();

    const trackingId = generateTrackingId();
    const trackingRecords = [];
    const baseUrl = process.env.API_URL || "https://techfest-canada-backend.onrender.com";

    for (const contact of audience.contacts) {
      const tracking = new EmailTracking({
        campaignId: campaign._id,
        email: contact.email,
        status: "pending",
      });
      trackingRecords.push(tracking.save());
    }

    await Promise.all(trackingRecords);

    const campaignIdStr = campaign._id.toString();
    
    const emailPromises = audience.contacts.map((contact) => {
      try {
        console.log(`Processing contact: ${contact.email}`);
        console.log(`Contact data:`, { firstName: contact.firstName, lastName: contact.lastName, company: contact.company });
        
        const recipientTrackingId = generateTrackingId();
        const personalizedHtml = campaign.template
          .replace(/\{\{name\}\}/g, contact.name || contact.email.split("@")[0])
          .replace(/\{\{email\}\}/g, contact.email)
          .replace(/\/firstname/gi, contact.firstName || contact.name || contact.email.split("@")[0])
          .replace(/\/lastname/gi, contact.lastName || "")
          .replace(/\/company/gi, contact.company || "")
          .replace(/\/title/gi, contact.title || "")
          .replace(/\/location/gi, contact.location || "");

        console.log(`Personalized HTML sample:`, personalizedHtml.substring(0, 200));

        const htmlWithLinksTracked = wrapLinksWithTracking(
          personalizedHtml,
          campaignIdStr,
          contact.email,
          baseUrl
        );

        const htmlWithTracking = htmlWithLinksTracked + `
          <img src="${baseUrl}/api/track/open/${campaignIdStr}/${contact.email}" width="1" height="1" style="display:none" alt="" />
        `;

        return sendCampaignEmail({
          to: contact.email,
          subject: campaign.subject,
          html: htmlWithTracking,
          campaignId: campaignIdStr,
          recipientEmail: contact.email,
          recipientTrackingId,
          baseUrl,
        });
      } catch (err) {
        console.error(`Error sending to ${contact.email}:`, err);
        return Promise.resolve({ success: false, error: err.message });
      }
    });

    await Promise.allSettled(emailPromises);

    campaign.stats.sent = audience.contacts.length;
    campaign.status = "sent";
    await campaign.save();

    console.log(`[CAMPAIGN LAUNCH] Campaign "${campaign.name}" (ID: ${campaign._id}) sent to ${audience.contacts.length} recipients`);
    console.log(`[CAMPAIGN LAUNCH] Stats: sent=${campaign.stats.sent}, uniqueOpens=${campaign.stats.uniqueOpens}, uniqueClicks=${campaign.stats.uniqueClicks}`);

    res.json({
      success: true,
      message: `Campaign sent to ${audience.contacts.length} recipients`,
      stats: campaign.stats,
    });
  } catch (err) {
    console.error("Launch campaign error:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ error: "Failed to launch campaign", details: err.message });
  }
});

router.post("/:id/test", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const baseUrl = process.env.API_URL || "https://techfest-canada-backend.onrender.com";

    // Apply personalization tokens for test email
    const personalizedHtml = campaign.template
      .replace(/\{\{name\}\}/g, email.split("@")[0])
      .replace(/\{\{email\}\}/g, email)
      .replace(/\/firstname/gi, "Test")
      .replace(/\/lastname/gi, "User")
      .replace(/\/company/gi, "Test Company")
      .replace(/\/title/gi, "CEO")
      .replace(/\/location/gi, "Toronto");

    const htmlWithLinksTracked = wrapLinksWithTracking(
      personalizedHtml,
      campaign._id.toString(),
      email,
      baseUrl
    );

    const htmlWithTracking = htmlWithLinksTracked + `
      <img src="${baseUrl}/api/track/open/${campaign._id}/${email}" width="1" height="1" style="display:none" alt="" />
    `;

    await sendCampaignEmail({
      to: email,
      subject: `[TEST] ${campaign.subject}`,
      html: htmlWithTracking,
      campaignId: campaign._id.toString(),
      recipientEmail: email,
    });

    const tracking = new EmailTracking({
      campaignId: campaign._id,
      email: email,
      status: "delivered",
    });
    await tracking.save();

    campaign.stats.sent = (campaign.stats.sent || 0) + 1;
    await campaign.save();

    console.log(`[TEST EMAIL] Sent test email to ${email} for campaign "${campaign.name}" (ID: ${campaign._id})`);
    console.log(`[TEST EMAIL] Campaign "${campaign.name}" sent count is now: ${campaign.stats.sent}`);

    res.json({ success: true, message: "Test email sent", sentCount: campaign.stats.sent });
  } catch (err) {
    console.error("Send test error:", err);
    res.status(500).json({ error: "Failed to send test email" });
  }
});

router.get("/:id/tracking", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const trackingData = await EmailTracking.find({ campaignId: req.params.id });

    const recipients = trackingData.map((t) => ({
      email: t.email,
      status: t.status,
      opened: t.opens.length > 0,
      clicked: t.clicks.length > 0,
      lastActivity: t.lastOpenAt || t.lastClickAt || null,
    }));

    const timeline = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trackingByDate = {};
    trackingData.forEach((t) => {
      t.opens.forEach((o) => {
        const date = new Date(o.timestamp).toISOString().split("T")[0];
        trackingByDate[date] = trackingByDate[date] || { opens: 0, clicks: 0 };
        trackingByDate[date].opens++;
      });
      t.clicks.forEach((c) => {
        const date = new Date(c.timestamp).toISOString().split("T")[0];
        trackingByDate[date] = trackingByDate[date] || { opens: 0, clicks: 0 };
        trackingByDate[date].clicks++;
      });
    });

    Object.entries(trackingByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, data]) => {
        timeline.push({ date, ...data });
      });

    res.json({
      stats: campaign.stats,
      recipients,
      timeline,
      totalSent: campaign.stats.sent,
    });
  } catch (err) {
    console.error("Tracking error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
