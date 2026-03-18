import express from "express";
import Agenda from "../models/Agenda.js";

const router = express.Router();

router.post("/submit", async (req, res) => {
  try {
    const { firstName, lastName, email, industry, jobTitle } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !industry || !jobTitle) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const newEntry = new Agenda({
      firstName,
      lastName,
      email,
      industry,
      jobTitle,
    });

    await newEntry.save();

    res.status(201).json({
      success: true,
      message: "Agenda submitted successfully",
    });

  } catch (err) {
    console.error("Agenda Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

export default router;