import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import axios from "axios";

import User from "../models/User.js";
import { sendResetPasswordEmail } from "../services/emailService.js";

const router = express.Router();

/* ================= REGISTER ================= */

router.post("/register", async (req, res) => {
  try {

    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      provider: "local"
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (err) {

    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: "Registration failed" });

  }
});


/* ================= LOGIN ================= */

router.post("/login", async (req, res) => {

  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (err) {

    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Login failed" });

  }
});


/* ================= GET CURRENT USER ================= */

router.get("/me", async (req, res) => {

  try {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    res.json(user);

  } catch (err) {

    res.status(401).json({ error: "Invalid token" });

  }
});


/* ================= GOOGLE LOGIN ================= */

router.post("/google", async (req, res) => {

  try {

    const { credential } = req.body;

    const googleRes = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );

    const { email, name } = googleRes.data;

    let user = await User.findOne({ email });

    if (!user) {

      user = await User.create({
        name,
        email,
        provider: "google"
      });

    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (err) {

    console.error("GOOGLE AUTH ERROR:", err);
    res.status(500).json({ error: "Google login failed" });

  }

});


/* ================= LINKEDIN AUTH ================= */

router.get("/linkedin", (req, res) => {

  const state = crypto.randomBytes(16).toString("hex");

  const linkedinAuthURL =
    "https://www.linkedin.com/oauth/v2/authorization" +
    "?response_type=code" +
    `&client_id=${process.env.LINKEDIN_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.LINKEDIN_REDIRECT_URI)}` +
    "&scope=r_liteprofile%20r_emailaddress" +
    `&state=${state}`;
console.log("LinkedIn auth URL:", linkedinAuthURL);
  res.redirect(linkedinAuthURL);

});


router.get("/linkedin/callback", async (req, res) => {
    console.log("LinkedIn callback query:", req.query);


  try {

    const { code } = req.query;

    if (!code) {
      console.error("LinkedIn OAuth failed: missing code");
      return res.redirect(`${process.env.FRONTEND_URL}/auth-error`);
    }

    /* ================= EXCHANGE CODE FOR ACCESS TOKEN ================= */

    const tokenRes = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    const accessToken = tokenRes.data.access_token;

    /* ================= GET LINKEDIN PROFILE ================= */

    const profileRes = await axios.get(
      "https://api.linkedin.com/v2/me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const emailRes = await axios.get(
      "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const email = emailRes.data.elements[0]["handle~"].emailAddress;

    const name =
      profileRes.data.localizedFirstName +
      " " +
      profileRes.data.localizedLastName;

    /* ================= FIND OR CREATE USER ================= */

    let user = await User.findOne({ email });

    if (!user) {

      user = await User.create({
        name,
        email,
        provider: "linkedin"
      });

    }

    /* ================= CREATE JWT ================= */

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    /* ================= REDIRECT TO FRONTEND ================= */

    res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${token}`);

  } catch (err) {

    console.error("LinkedIn OAuth Error:", err.response?.data || err.message);

    res.redirect(`${process.env.FRONTEND_URL}/auth-error`);

  }

});

/* ================= FORGOT PASSWORD ================= */

router.post("/forgot-password", async (req, res) => {

  try {

    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        message: "If that email exists, a reset link has been sent."
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;

    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    await sendResetPasswordEmail(user.email, resetLink);

    res.json({ message: "Reset email sent" });

  } catch (err) {

    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ error: "Server error" });

  }

});


/* ================= RESET PASSWORD ================= */

router.post("/reset-password/:token", async (req, res) => {

  try {

    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });

  } catch (err) {

    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ error: "Server error" });

  }

});

export default router;
