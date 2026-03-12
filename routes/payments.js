import express from "express";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import User from "../models/User.js";
import TicketInventory from "../models/TicketInventory.js";

const router = express.Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY missing in env");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// middleware to get user from token
async function getUserFromReq(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error("No token");

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id);
  if (!user) throw new Error("User not found");

  return user;
}

// ================= CREATE CHECKOUT =================
router.post("/create-checkout", async (req, res) => {
  try {
    const user = await getUserFromReq(req);
    const { tier } = req.body;
    const normalizedTier = tier.toLowerCase();

    // get ticket info from inventory
    const ticket = await TicketInventory.findOne({ tier: normalizedTier });

    if (!ticket) {
      return res.status(400).json({ error: "Invalid ticket tier" });
    }

    // convert price to cents for Stripe
    const price = ticket.price * 100;
    const stripe = getStripe();
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: `TechFest ${tier.toUpperCase()} Pass`,
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      
      // Updated this line to match the frontend logic
      success_url: `${process.env.FRONTEND_URL}/tickets?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/tickets`,

      metadata: {
        userId: user._id.toString(),
        tier,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("CHECKOUT ERROR:", err);
    res.status(500).json({ error: "Checkout failed" });
  }
});

export default router;
