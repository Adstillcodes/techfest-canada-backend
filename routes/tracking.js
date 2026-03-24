import express from "express";
import EmailTracking from "../models/EmailTracking.js";
import Campaign from "../models/Campaign.js";

const router = express.Router();

router.get("/open/:campaignId/:email", async (req, res) => {
  try {
    const { campaignId, email } = req.params;

    let tracking = await EmailTracking.findOne({
      campaignId,
      email: decodeURIComponent(email).toLowerCase(),
    });

    if (!tracking) {
      tracking = new EmailTracking({
        campaignId,
        email: decodeURIComponent(email).toLowerCase(),
        status: "delivered",
      });
    }

    tracking.status = "opened";
    tracking.opens.push({
      timestamp: new Date(),
      userAgent: req.headers["user-agent"] || "",
      ip: req.ip || req.connection.remoteAddress || "",
    });

    if (!tracking.firstOpenAt) {
      tracking.firstOpenAt = new Date();
    }
    tracking.lastOpenAt = new Date();

    await tracking.save();

    await Campaign.findByIdAndUpdate(campaignId, {
      $inc: { "stats.uniqueOpens": 1, "stats.totalOpens": 1 },
    });

    const transparentGif = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );

    res.set({
      "Content-Type": "image/gif",
      "Content-Length": transparentGif.length,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });

    res.send(transparentGif);
  } catch (err) {
    console.error("Open tracking error:", err);
    const transparentGif = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );
    res.set("Content-Type", "image/gif");
    res.send(transparentGif);
  }
});

router.get("/click", async (req, res) => {
  try {
    const { url, campaignId, email } = req.query;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const decodedUrl = decodeURIComponent(url);

    if (email && campaignId) {
      let tracking = await EmailTracking.findOne({
        campaignId,
        email: email.toLowerCase(),
      });

      if (tracking) {
        tracking.status = "clicked";
        tracking.clicks.push({
          timestamp: new Date(),
          url: decodedUrl,
          userAgent: req.headers["user-agent"] || "",
          ip: req.ip || req.connection.remoteAddress || "",
        });

        if (!tracking.firstClickAt) {
          tracking.firstClickAt = new Date();
        }
        tracking.lastClickAt = new Date();

        await tracking.save();

        await Campaign.findByIdAndUpdate(campaignId, {
          $inc: { "stats.uniqueClicks": 1, "stats.totalClicks": 1 },
        });
      }
    }

    res.redirect(302, decodedUrl);
  } catch (err) {
    console.error("Click tracking error:", err);
    const fallbackUrl = decodeURIComponent(req.query.url || "");
    if (fallbackUrl) {
      res.redirect(302, fallbackUrl);
    } else {
      res.status(400).json({ error: "Invalid URL" });
    }
  }
});

export default router;
