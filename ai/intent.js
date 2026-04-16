// ai/intent.js — Deteksi maksud user (chat/image/video/game/multi-step)

const IMAGE_KEYWORDS = [
  "gambar","buat gambar","generate image","image","foto","visual",
  "ilustrasi","lukis","draw","picture","photo","artwork","render",
  "buatkan gambar","tampilkan gambar"
];
const VIDEO_KEYWORDS = [
  "video","animasi","animation","buat video","generate video","film","movie","clip"
];
const GAME_KEYWORDS = [
  "game","boss","monster","lore","karakter","character","quest",
  "dungeon","skill","ability","weapon","armor","map","item","rpg","npc","enemy","hero","stats"
];
const MULTI_STEP_KEYWORDS = [
  "dan","kemudian","lalu","setelah itu","juga","plus","tambah","sekaligus","beserta"
];

function containsKeywords(text, keywords) {
  const lower = text.toLowerCase();
  const matched = keywords.filter(kw => lower.includes(kw));
  return { found: matched.length > 0, matched };
}

export function detectIntent(input) {
  const imageCheck = containsKeywords(input, IMAGE_KEYWORDS);
  const videoCheck = containsKeywords(input, VIDEO_KEYWORDS);
  const gameCheck  = containsKeywords(input, GAME_KEYWORDS);
  const multiCheck = containsKeywords(input, MULTI_STEP_KEYWORDS);

  if (multiCheck.found && (imageCheck.found || videoCheck.found) && gameCheck.found) {
    return { type: "multi-step", confidence: 0.9, rawInput: input, keywords: multiCheck.matched };
  }
  if (imageCheck.found) return { type: "image", confidence: 0.95, rawInput: input, keywords: imageCheck.matched };
  if (videoCheck.found) return { type: "video", confidence: 0.9,  rawInput: input, keywords: videoCheck.matched };
  if (gameCheck.found)  return { type: "game",  confidence: 0.85, rawInput: input, keywords: gameCheck.matched };
  return { type: "chat", confidence: 0.8, rawInput: input, keywords: [] };
}
