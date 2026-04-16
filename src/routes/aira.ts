import { Router, type IRouter } from "express";
import { processInput } from "../aira/ai/brain.js";
import { clearMemory } from "../aira/ai/memory.js";

const router: IRouter = Router();

router.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body as { message?: string; sessionId?: string };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: true, message: "Field 'message' wajib diisi" });
    return;
  }

  const cleanMessage = message.trim().slice(0, 4000);
  const session = sessionId ?? `session_${Date.now()}`;

  try {
    const result = await processInput({ message: cleanMessage, sessionId: session });
    res.json({ error: false, data: result, meta: { sessionId: session } });
  } catch (err) {
    req.log.error({ err }, "[aira] Error processing input");
    res.status(500).json({ error: true, message: "Terjadi kesalahan internal." });
  }
});

router.delete("/memory/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  clearMemory(sessionId!);
  res.json({ error: false, data: { cleared: true, sessionId } });
});

export default router;
