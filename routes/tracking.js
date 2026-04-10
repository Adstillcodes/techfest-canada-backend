import express from "express";
import EmailTracking from "../models/EmailTracking.js";
import Campaign from "../models/Campaign.js";
import CampaignTemplate from "../models/CampaignTemplate.js";

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

        console.log(`[CLICK TRACKING] Updated EmailTracking record for ${email}`);

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

// ================= VIEW IN BROWSER =================
router.get("/view/:campaignId/:email", async (req, res) => {
  try {
    const { campaignId, email } = req.params;
    const emailLower = decodeURIComponent(email).toLowerCase();
    const baseUrl = process.env.FRONTEND_URL || "https://www.thetechfestival.com";

    console.log(`[VIEW IN BROWSER] campaignId: ${campaignId}, email: ${emailLower}`);

    let htmlContent = null;
    let subject = "Email";

    if (campaignId.startsWith("tpl-")) {
      const template = await CampaignTemplate.findOne({ id: campaignId.replace("tpl-", "") });
      if (template) {
        subject = template.subject || "Email";
        htmlContent = template.htmlBody;
      }
    }

    if (!htmlContent) {
      const campaign = await Campaign.findById(campaignId);
      if (campaign) {
        subject = campaign.subject || "Email";
        htmlContent = campaign.template;
      }
    }

    if (!htmlContent) {
      const campaignByName = await Campaign.findOne({ name: campaignId });
      if (campaignByName) {
        subject = campaignByName.subject || "Email";
        htmlContent = campaignByName.template;
      }
    }

    if (!htmlContent) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Email Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            h1 { color: #7a3fd1; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <h1>Email Not Found</h1>
          <p>This email could not be found or has expired.</p>
          <p><a href="${baseUrl}">Return to TechFest Canada</a></p>
        </body>
        </html>
      `);
    }

    // Apply personalization
    let personalizedHtml = htmlContent;
    const contactName = emailLower.split("@")[0];
    personalizedHtml = personalizedHtml.replace(/\/firstname/gi, contactName);
    personalizedHtml = personalizedHtml.replace(/\/lastname/gi, "");
    personalizedHtml = personalizedHtml.replace(/\/company/gi, "");
    personalizedHtml = personalizedHtml.replace(/\/email/gi, emailLower);

    // Add tracking pixel only — no footer injected
    const trackingPixel = `<img src="${baseUrl}/api/track/open/${campaignId}/${encodeURIComponent(emailLower)}" width="1" height="1" style="display:none" />`;
    personalizedHtml = personalizedHtml.replace(/<\/body>/i, trackingPixel + "</body>");

    if (!personalizedHtml.includes("<html")) {
      personalizedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f0ff;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
      ${personalizedHtml}
    </div>
  </div>
</body>
</html>`;
    }

    res.set("Content-Type", "text/html");
    res.send(personalizedHtml);

  } catch (err) {
    console.error("View in browser error:", err);
    res.status(500).send("Error loading email");
  }
});

// ================= UNSUBSCRIBE CONFIRMATION PAGE =================
router.get("/unsubscribe/:campaignId/:email", async (req, res) => {
  try {
    const { campaignId, email } = req.params;
    const emailLower = decodeURIComponent(email).toLowerCase();
    const baseUrl = process.env.FRONTEND_URL || "https://www.thetechfestival.com";

    let campaignName = "our emails";
    try {
      const campaign = await Campaign.findById(campaignId);
      if (campaign) campaignName = campaign.name;
    } catch (e) {
      // Ignore - use default
    }

    const confirmUrl = `${baseUrl}/api/unsubscribe/confirm/${campaignId}/${encodeURIComponent(emailLower)}`;

    res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe - TechFest Canada</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: linear-gradient(135deg, #7a3fd1 0%, #f5a623 100%); min-height: 100vh; font-family: Arial, sans-serif; }
    .container { max-width: 500px; margin: 50px auto; padding: 20px; }
    .card { background: white; border-radius: 16px; padding: 40px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
    h1 { color: #7a3fd1; margin: 0 0 20px; font-size: 24px; }
    p { color: #666; line-height: 1.6; margin: 0 0 20px; }
    .btn { display: inline-block; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 5px; transition: transform 0.2s; }
    .btn-primary { background: linear-gradient(135deg, #7a3fd1, #f5a623); color: white; }
    .btn-primary:hover { transform: scale(1.02); }
    .btn-secondary { background: #f3f4f6; color: #666; }
    .btn-secondary:hover { background: #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Unsubscribe from Emails</h1>
      <p>You are about to unsubscribe from <strong>${campaignName}</strong>.</p>
      <p>You will no longer receive emails from The Tech Festival Canada using this email address.</p>
      <div>
        <a href="${confirmUrl}" class="btn btn-primary">Yes, Unsubscribe</a>
        <a href="${baseUrl}" class="btn btn-secondary">Cancel</a>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim());
  } catch (err) {
    console.error("Unsubscribe page error:", err);
    res.status(500).send("Error loading unsubscribe page");
  }
});

export default router;
