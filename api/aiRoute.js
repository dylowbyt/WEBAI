// api/aiRoute.js — ROUTES ONLY (tidak ada logic AI di sini)

import { Router } from "express";
import { processInput } from "../ai/brain.js";
import { clearMemory } from "../ai/memory.js";

const router = Router();

router.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: true, message: "Field 'message' wajib diisi" });
  }

  const cleanMessage = message.trim().slice(0, 4000);
  const session = sessionId || `session_${Date.now()}`;

  try {
    const result = await processInput({ message: cleanMessage, sessionId: session });
    res.json({ error: false, data: result, meta: { sessionId: session } });
  } catch (err) {
    console.error("[aiRoute] Error:", err.message);
    res.status(500).json({ error: true, message: "Terjadi kesalahan internal." });
  }
});

router.delete("/memory/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  clearMemory(sessionId);
  res.json({ error: false, data: { cleared: true, sessionId } });
});

export default router;
