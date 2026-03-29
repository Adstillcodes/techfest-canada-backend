import express from "express";
import Brochure from "../models/Brochure.js";

const router = express.Router();

router.post("/submit", async (req, res) => {
  try {
    const data = req.body;

    const newEntry = new Brochure(data);
    await newEntry.save();

    res.status(201).json({ success: true, message: "Saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;