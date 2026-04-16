import type { IntentType } from "./intent";

export interface PlanStep {
  order: number;
  tool: IntentType;
  description: string;
  input: string;
  dependsOn?: number[];
}

export interface Plan {
  steps: PlanStep[];
  isMultiStep: boolean;
  original: string;
}

export function buildPlan(intent: IntentType, input: string): Plan {
  if (intent !== "multi-step") {
    return {
      steps: [{ order: 1, tool: intent, description: `Execute ${intent}`, input }],
      isMultiStep: false,
      original: input,
    };
  }

  const steps: PlanStep[] = [];

  const wantsImage =
    /gambar|image|visual|ilustr/i.test(input);
  const wantsGame =
    /boss|monster|lore|karakter|character|dungeon|npc/i.test(input);
  const wantsLore =
    /lore|cerita|story|backstory|sejarah/i.test(input);

  let order = 1;

  if (wantsGame) {
    steps.push({
      order: order++,
      tool: "game",
      description: "Buat konsep game",
      input,
    });
  }

  if (wantsImage) {
    steps.push({
      order: order++,
      tool: "image",
      description: "Generate gambar berdasarkan konsep",
      input,
      dependsOn: wantsGame ? [1] : undefined,
    });
  }

  if (wantsLore && !wantsGame) {
    steps.push({
      order: order++,
      tool: "chat",
      description: "Buat lore dan cerita",
      input,
    });
  }

  if (steps.length === 0) {
    steps.push({ order: 1, tool: "chat", description: "Chat response", input });
  }

  return {
    steps,
    isMultiStep: steps.length > 1,
    original: input,
  };
}
