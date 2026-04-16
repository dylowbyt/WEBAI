export type IntentType = "chat" | "image" | "video" | "game" | "multi-step";

export interface DetectedIntent {
  type: IntentType;
  confidence: number;
  rawInput: string;
  keywords: string[];
}

const IMAGE_KEYWORDS = [
  "gambar", "buat gambar", "generate image", "image", "foto", "visual",
  "illustrasi", "lukis", "draw", "picture", "photo", "artwork", "render",
  "buatkan gambar", "tampilkan gambar"
];

const VIDEO_KEYWORDS = [
  "video", "animasi", "animation", "buat video", "generate video",
  "film", "movie", "clip", "rekam"
];

const GAME_KEYWORDS = [
  "game", "boss", "monster", "lore", "karakter", "character", "quest",
  "dungeon", "skill", "ability", "weapon", "armor", "map", "item",
  "rpg", "npc", "enemy", "hero", "stats"
];

const MULTI_STEP_KEYWORDS = [
  "dan", "kemudian", "lalu", "setelah itu", "juga", "plus", "tambah",
  "sekaligus", "plus", "beserta"
];

function containsKeywords(text: string, keywords: string[]): { found: boolean; matched: string[] } {
  const lower = text.toLowerCase();
  const matched = keywords.filter((kw) => lower.includes(kw));
  return { found: matched.length > 0, matched };
}

export function detectIntent(input: string): DetectedIntent {
  const imageCheck = containsKeywords(input, IMAGE_KEYWORDS);
  const videoCheck = containsKeywords(input, VIDEO_KEYWORDS);
  const gameCheck = containsKeywords(input, GAME_KEYWORDS);
  const multiCheck = containsKeywords(input, MULTI_STEP_KEYWORDS);

  const hasImage = imageCheck.found;
  const hasVideo = videoCheck.found;
  const hasGame = gameCheck.found;

  if (multiCheck.found && (hasImage || hasVideo) && hasGame) {
    return {
      type: "multi-step",
      confidence: 0.9,
      rawInput: input,
      keywords: [...multiCheck.matched, ...imageCheck.matched, ...gameCheck.matched],
    };
  }

  if (hasImage) {
    return {
      type: "image",
      confidence: 0.95,
      rawInput: input,
      keywords: imageCheck.matched,
    };
  }

  if (hasVideo) {
    return {
      type: "video",
      confidence: 0.9,
      rawInput: input,
      keywords: videoCheck.matched,
    };
  }

  if (hasGame) {
    return {
      type: "game",
      confidence: 0.85,
      rawInput: input,
      keywords: gameCheck.matched,
    };
  }

  return {
    type: "chat",
    confidence: 0.8,
    rawInput: input,
    keywords: [],
  };
}
