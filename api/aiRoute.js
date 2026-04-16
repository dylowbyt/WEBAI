import { Router, type Request, type Response } from "express";
import { processInput } from "../ai/brain";
import { clearMemory } from "../ai/memory";
import { buildSuccessResponse, buildErrorResponse, sanitizeInput } from "../utils/helpers";

const router = Router();

router.post("/chat", async (req: Request, res: Response) => {
  const { message, sessionId } = req.body as { message?: string; sessionId?: string };

  if (!message || typeof message !== "string") {
    res.status(400).json(buildErrorResponse("Field 'message' wajib diisi", 400));
    return;
  }

  const cleanMessage = sanitizeInput(message);
  const session = sessionId ?? `session_${Date.now()}`;

  const result = await processInput({ message: cleanMessage, sessionId: session });

  res.json(buildSuccessResponse(result, { sessionId: session }));
});

router.delete("/memory/:sessionId", (req: Request, res: Response) => {
  const sessionId = req.params["sessionId"] as string;
  clearMemory(sessionId);
  res.json(buildSuccessResponse({ cleared: true, sessionId }));
});

export default router;
