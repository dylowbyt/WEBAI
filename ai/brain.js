// ai/brain.js — OTAK UTAMA (pusat keputusan)
// RULE: brain hanya MEMUTUSKAN tool mana yang dipakai, tidak eksekusi sendiri

import { detectIntent } from "./intent.js";
import { buildPlan }    from "./planner.js";
import { addMessage, getHistory } from "./memory.js";
import { runChatTool }  from "../tools/chatTool.js";
import { runImageTool } from "../tools/imageTool.js";
import { runVideoTool } from "../tools/videoTool.js";
import { runGameTool }  from "../tools/gameTool.js";

async function executeTool(tool, input, history) {
  switch (tool) {
    case "image": return runImageTool(input);
    case "video": return runVideoTool(input);
    case "game":  return runGameTool(input, history);
    default:      return runChatTool(input, history);
  }
}

export async function processInput({ message, sessionId }) {
  const intent  = detectIntent(message);
  const plan    = buildPlan(intent.type, message);
  const history = getHistory(sessionId);

  addMessage(sessionId, { role: "user", content: message });

  console.log(`[brain] intent=${intent.type} | multi=${plan.isMultiStep}`);

  if (plan.isMultiStep) {
    const stepResults = [];
    let context = message;

    for (const step of plan.steps) {
      console.log(`[brain] step ${step.order}: ${step.tool}`);
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
