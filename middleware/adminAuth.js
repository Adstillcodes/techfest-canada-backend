import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("ADMIN AUTH ERROR:", err);
    res.status(401).json({ error: "Unauthorized" });
  }
}