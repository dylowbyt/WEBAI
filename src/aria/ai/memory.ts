interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SessionMemory {
  sessionId: string;
  messages: ChatMessage[];
}

const memoryStore = new Map<string, SessionMemory>();
const MAX_HISTORY = 20;

export function getMemory(sessionId: string): SessionMemory {
  if (!memoryStore.has(sessionId)) {
    memoryStore.set(sessionId, { sessionId, messages: [] });
  }
  return memoryStore.get(sessionId)!;
}

export function addMessage(sessionId: string, message: ChatMessage): void {
  const memory = getMemory(sessionId);
  memory.messages.push(message);
  if (memory.messages.length > MAX_HISTORY) {
    memory.messages = memory.messages.slice(-MAX_HISTORY);
  }
}

export function clearMemory(sessionId: string): void {
  memoryStore.delete(sessionId);
}

export function getHistory(sessionId: string): ChatMessage[] {
  return getMemory(sessionId).messages;
}
