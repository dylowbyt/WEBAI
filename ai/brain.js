import { detectIntent } from "./intent";
import { buildPlan } from "./planner";
import { addMessage, getHistory } from "./memory";
import { runChatTool } from "../tools/chatTool";
import { runImageTool } from "../tools/imageTool";
import { runVideoTool } from "../tools/videoTool";
import { runGameTool } from "../tools/gameTool";
import { logger } from "../lib/logger";

export interface BrainInput {
  message: string;
  sessionId: string;
}

export interface BrainOutput {
  type: string;
  content: string;
  imageUrl?: string;
  steps?: Array<{ tool: string; result: string }>;
}

export async function processInput(input: BrainInput): Promise<BrainOutput> {
  const { message, sessionId } = input;

  const intent = detectIntent(message);
  logger.info({ intent: intent.type, confidence: intent.confidence }, "Intent detected");

  addMessage(sessionId, { role: "user", content: message });

  const plan = buildPlan(intent.type, message);
  const history = getHistory(sessionId);

  if (plan.isMultiStep) {
    const stepResults: Array<{ tool: string; result: string }> = [];
    let combinedContext = message;

    for (const step of plan.steps) {
      logger.info({ step: step.order, tool: step.tool }, "Executing plan step");

      let result: BrainOutput;

      switch (step.tool) {
        case "image":
          result = await runImageTool(combinedContext);
          break;
        case "video":
          result = await runVideoTool(combinedContext);
          break;
        case "game":
          result = await runGameTool(combinedContext, history);
          break;
        default:
          result = await runChatTool(combinedContext, history);
      }

      stepResults.push({ tool: step.tool, result: result.content });
      combinedContext += `\n\nHasil langkah ${step.order} (${step.tool}): ${result.content}`;
    }

    const finalContent = stepResults.map((s, i) => `**Langkah ${i + 1} (${s.tool}):**\n${s.result}`).join("\n\n---\n\n");
    addMessage(sessionId, { role: "assistant", content: finalContent });

    return {
      type: "multi-step",
      content: finalContent,
      steps: stepResults,
    };
  }

  let output: BrainOutput;

  switch (intent.type) {
    case "image":
      output = await runImageTool(message);
      break;
    case "video":
      output = await runVideoTool(message);
      break;
    case "game":
      output = await runGameTool(message, history);
      break;
    default:
      output = await runChatTool(message, history);
  }

  addMessage(sessionId, { role: "assistant", content: output.content });

  return output;
}
