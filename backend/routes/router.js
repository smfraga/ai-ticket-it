import express from "express";
import authRoutes from "./AuthRoutes.js";

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRoutes);

export default router;
