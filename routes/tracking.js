import express from "express";
import EmailTracking from "../models/EmailTracking.js";
import Campaign from "../models/Campaign.js";

const router = express.Router();

router.get("/open/:campaignId/:email", async (req, res) => {
  try {
    const { campaignId, email } = req.params;
    const emailLower = decodeURIComponent(email).toLowerCase();

    console.log(`[OPEN TRACKING] Open detected - campaignId: ${campaignId}, email: ${emailLower}`);

    let tracking = await EmailTracking.findOne({
      campaignId,
      email: emailLower,
    });

    if (!tracking) {
      tracking = new EmailTracking({
        campaignId,
        email: emailLower,
        status: "delivered",
      });
    }

    const isFirstOpen = tracking.opens.length === 0;
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

    if (campaignId.startsWith("tpl-")) {
      const templateCampaign = await Campaign.findOne({ name: campaignId });
      if (templateCampaign) {
        if (isFirstOpen) {
          templateCampaign.stats.uniqueOpens = (templateCampaign.stats.uniqueOpens || 0) + 1;
        }
        templateCampaign.stats.totalOpens = (templateCampaign.stats.totalOpens || 0) + 1;
        await templateCampaign.save();
        console.log(`[OPEN TRACKING] Updated automation Campaign "${campaignId}" uniqueOpens: ${templateCampaign.stats.uniqueOpens}, totalOpens: ${templateCampaign.stats.totalOpens}`);
      }
    } else {
      if (isFirstOpen) {
        await Campaign.findByIdAndUpdate(campaignId, {
          $inc: { "stats.uniqueOpens": 1, "stats.totalOpens": 1 },
        });
      } else {
        await Campaign.findByIdAndUpdate(campaignId, {
          $inc: { "stats.totalOpens": 1 },
        });
      }
      console.log(`[OPEN TRACKING] Updated Campaign ${campaignId} opens`);
    }

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
    console.log(`[CLICK TRACKING] Click detected - campaignId: ${campaignId}, email: ${email}, url: ${decodedUrl}`);

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

        console.log(`[CLICK TRacking] Updated EmailTracking record for ${email}`);

        if (campaignId.startsWith("tpl-")) {
          const templateCampaign = await Campaign.findOne({ name: campaignId });
          if (templateCampaign) {
            templateCampaign.stats.uniqueClicks = (templateCampaign.stats.uniqueClicks || 0) + 1;
            templateCampaign.stats.totalClicks = (templateCampaign.stats.totalClicks || 0) + 1;
            await templateCampaign.save();
            console.log(`[CLICK TRACKING] Updated automation Campaign "${campaignId}" clicks: ${templateCampaign.stats.uniqueClicks}`);
          }
        } else {
          await Campaign.findByIdAndUpdate(campaignId, {
            $inc: { "stats.uniqueClicks": 1, "stats.totalClicks": 1 },
          });
          console.log(`[CLICK TRACKING] Updated Campaign ${campaignId} clicks`);
        }
      } else {
        console.log(`[CLICK TRACKING] No EmailTracking record found for campaignId: ${campaignId}, email: ${email}`);
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
