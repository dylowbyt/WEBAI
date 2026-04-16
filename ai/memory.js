export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ConversationMemory {
  messages: Message[];
  userId?: string;
  sessionId: string;
}

const memoryStore = new Map<string, ConversationMemory>();

const MAX_HISTORY = 20;

export function getMemory(sessionId: string): ConversationMemory {
  if (!memoryStore.has(sessionId)) {
    memoryStore.set(sessionId, {
      sessionId,
      messages: [],
    });
  }
  return memoryStore.get(sessionId)!;
}

export function addMessage(sessionId: string, message: Message): void {
  const memory = getMemory(sessionId);
  memory.messages.push(message);
  if (memory.messages.length > MAX_HISTORY) {
    memory.messages = memory.messages.slice(-MAX_HISTORY);
  }
}

export function clearMemory(sessionId: string): void {
  memoryStore.delete(sessionId);
}

export function getHistory(sessionId: string): Message[] {
  return getMemory(sessionId).messages;
}
