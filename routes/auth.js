import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendWelcomeEmail } from "../services/emailService.js";
import { OAuth2Client } from "google-auth-library";
import axios from "axios";

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed,
      provider: "email",
    });

    await sendWelcomeEmail(email, name);

 const token = jwt.sign(
  {
    id: user._id,
    email: user.email,
    role: user.role || "user",
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

    res.json({ token, user });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || !user.password) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

const token = jwt.sign(
  {
    id: user._id,
    email: user.email,
    role: user.role || "user",
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

    res.json({ token, user });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= GOOGLE AUTH =================
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Google credential missing" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.status(400).json({ error: "Invalid Google token" });
    }

    const { email, name } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        provider: "google",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role || "user",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user });

  } catch (err) {
    console.error("GOOGLE AUTH ERROR:", err.message, err.stack);
    res.status(500).json({ error: "Google authentication failed" });
  }
});

// ================= LINKEDIN AUTH =================
router.get("/linkedin", (req, res) => {

  const redirectUrl =
    "https://www.linkedin.com/oauth/v2/authorization" +
    "?response_type=code" +
    `&client_id=${process.env.LINKEDIN_CLIENT_ID}` +
    `&redirect_uri=${process.env.BACKEND_URL}/api/auth/linkedin/callback` +
    "&scope=openid%20profile%20email";

  res.redirect(redirectUrl);
});

// ================= LINKEDIN CALLBACK =================
router.get("/linkedin/callback", async (req, res) => {
  try {

    const { code } = req.query;

    // exchange code for access token
    const tokenRes = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      null,
      {
        params: {
          grant_type: "authorization_code",
          code,
          redirect_uri: `${process.env.BACKEND_URL}/api/auth/linkedin/callback`,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    // get user profile
    const profileRes = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const { email, name } = profileRes.data;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        provider: "linkedin",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role || "user",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // redirect back to frontend
    res.redirect(
      `${process.env.FRONTEND_URL}/auth-success?token=${token}`
    );

  } catch (err) {
    console.error("LINKEDIN AUTH ERROR:", err);
    res.redirect(`${process.env.FRONTEND_URL}`);
  }
});
// ================= GET CURRENT USER =================
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("ME ERROR:", err);
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
