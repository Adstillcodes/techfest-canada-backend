import express from "express";
import Stripe from "stripe";
import User from "../models/User.js";
import TicketInventory from "../models/TicketInventory.js";
import crypto from "crypto";

import { generateTicketPDF } from "../services/pdfTicket.js";
import { sendTicketEmail } from "../services/emailService.js";
import { sendResetPasswordEmail } from "../services/emailService.js";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe webhook endpoint - requires raw body for signature verification
router.post("/", async (req, res) => {

  // express.raw() gives us a Buffer in req.body
  let rawBody = req.body;

  // Ensure we have a Buffer
  if (!Buffer.isBuffer(rawBody)) {
    console.error("❌ Body is not a Buffer, type:", typeof rawBody, rawBody);
    return res.status(400).send("Webhook Error: Invalid body type");
  }

  if (rawBody.length === 0) {
    console.error("❌ Empty raw body received");
    return res.status(400).send("Webhook Error: Empty body received");
  }

  // Create a fresh Buffer and convert to string to ensure clean UTF-8
  const bodyString = Buffer.from(rawBody).toString('utf-8');

  console.log("📥 Raw body length:", rawBody.length);
  console.log("📄 Body preview:", bodyString.substring(0, 100));

  const sig = req.headers["stripe-signature"];
  console.log("🔐 Signature header present:", !!sig);
  console.log("🔐 Signature value:", sig);

  if (!sig) {
    console.error("❌ No stripe-signature header found");
    return res.status(400).send("Webhook Error: No signature header");
  }

  let event;

  try {
    // Use STRING version as per Stripe's official example
    event = stripe.webhooks.constructEvent(
      bodyString,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("✅ Webhook signature verified");
  } catch (err) {
    console.error("❌ Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ====================================================
  // PAYMENT SUCCESS
  // ====================================================
  if (event.type === "checkout.session.completed") {

    try {

      const session = event.data.object;

      const tier = session.metadata.tier;
      const userId = session.metadata.userId;
      const purchaseType = session.metadata.type || "ticket";

      const email = session.customer_details?.email;
      const name = session.customer_details?.name || "Guest";

      const isBooth = purchaseType === "booth";

      if (!tier) {
        console.error("❌ Missing tier metadata");
        return res.json({ received: true });
      }

      // ================= INVENTORY UPDATE =================

      const inventory = await TicketInventory.findOne({ tier });

      if (!inventory) {

        console.error("❌ Inventory not found for tier:", tier);

      } else {

        if (inventory.sold >= inventory.total) {

          console.error("❌ Attempted oversell for tier:", tier);

        } else {

          inventory.sold += 1;
          await inventory.save();

          console.log("📦 Inventory updated:", tier);

        }

      }

      // ================= CREATE TICKET (only for tickets, not booths) =================

      if (!isBooth) {
        const ticketId = crypto.randomBytes(6).toString("hex");

        // If user purchased while logged in → attach ticket to account
        if (userId && userId !== "guest") {

          const user = await User.findById(userId);

          if (user) {

            user.tickets.push({
              ticketId,
              type: tier,
              purchaseDate: new Date()
            });

            await user.save();

            console.log("🎟 Ticket attached to user:", userId);

          }

        }

        // ================= SEND TICKET EMAIL =================

        if (email) {

          await sendTicketEmail({
            email,
            name,
            ticketId,
            tier
          });

          console.log("📧 Ticket email sent to:", email);

        } else {

          console.error("❌ Email missing from Stripe session");

        }

        console.log("✅ Ticket created:", ticketId);
      } else {
        // ================= SEND BOOTH PURCHASE EMAIL =================
        
        if (email) {

          await sendTicketEmail({
            email,
            name,
            ticketId: "BOOTH-" + tier.toUpperCase(),
            tier: tier
          });

          console.log("📧 Booth confirmation email sent to:", email);

        } else {

          console.error("❌ Email missing from Stripe session");

        }

        console.log("✅ Booth purchase confirmed:", tier);
      }

    } catch (err) {

      console.error("❌ Webhook processing failed:", err);

    }

  }

  res.json({ received: true });

});

export default router;
