import { detectIntent, type IntentType } from "./intent.js";
import { buildPlan } from "./planner.js";
import { addMessage, getHistory } from "./memory.js";
import { runChatTool } from "../tools/chatTool.js";
import { runImageTool } from "../tools/imageTool.js";
import { runVideoTool } from "../tools/videoTool.js";
import { runGameTool } from "../tools/gameTool.js";
import { logger } from "../../lib/logger.js";

type ChatMessage = { role: "user" | "assistant"; content: string };

async function executeTool(tool: IntentType, input: string, history: ChatMessage[]) {
  switch (tool) {
    case "image": return runImageTool(input);
    case "video": return runVideoTool(input);
    case "game":  return runGameTool(input, history);
    default:      return runChatTool(input, history);
  }
}

export async function processInput({ message, sessionId }: { message: string; sessionId: string }) {
  const intent  = detectIntent(message);
  const plan    = buildPlan(intent.type, message);
  const history = getHistory(sessionId);

  addMessage(sessionId, { role: "user", content: message });

  logger.info({ intent: intent.type, isMultiStep: plan.isMultiStep }, "[brain] processing input");

  if (plan.isMultiStep) {
    const stepResults: { tool: string; result: string }[] = [];
    let context = message;

    for (const step of plan.steps) {
      logger.info({ order: step.order, tool: step.tool }, "[brain] executing step");
      const result = await executeTool(step.tool, context, history);
      stepResults.push({ tool: step.tool, result: result.content });
      context += `\n\nHasil langkah ${step.order}: ${result.content}`;
    }

    const finalContent = stepResults
      .map((s, i) => `**Langkah ${i + 1} (${s.tool}):**\n${s.result}`)
      .join("\n\n---\n\n");

    addMessage(sessionId, { role: "assistant", content: finalContent });
    return { type: "multi-step", content: finalContent, steps: stepResults };
  }

  const output = await executeTool(intent.type, message, history);
  addMessage(sessionId, { role: "assistant", content: output.content });
  return output;
}
