import express from "express";
import { requireAdmin } from "../middleware/adminAuth.js";
import { getCampaigns, getCampaign, getCampaignStats, getGroups, getFields } from "../services/mailerLiteService.js";

const router = express.Router();

router.get("/campaigns", requireAdmin, async (req, res) => {
  try {
    const result = await getCampaigns();
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    console.error("[MailerLite] Get campaigns error:", err);
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

router.get("/campaigns/:id", requireAdmin, async (req, res) => {
  try {
    const result = await getCampaign(req.params.id);
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    console.error("[MailerLite] Get campaign error:", err);
    res.status(500).json({ error: "Failed to fetch campaign" });
  }
});

router.get("/campaigns/:id/stats", requireAdmin, async (req, res) => {
  try {
    const result = await getCampaignStats(req.params.id);
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    console.error("[MailerLite] Get campaign stats error:", err);
    res.status(500).json({ error: "Failed to fetch campaign stats" });
  }
});

router.get("/groups", requireAdmin, async (req, res) => {
  try {
    const result = await getGroups();
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    console.error("[MailerLite] Get groups error:", err);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

router.get("/fields", requireAdmin, async (req, res) => {
  try {
    const result = await getFields();
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    console.error("[MailerLite] Get fields error:", err);
    res.status(500).json({ error: "Failed to fetch fields" });
  }
});

router.get("/embed-url", requireAdmin, async (req, res) => {
  const mailerliteUrl = process.env.MAILERLITE_EMBED_URL || "https://campaigns.mailerlite.com";
  res.json({ url: mailerliteUrl });
});

export default router;