// ai/memory.js — Memory user / context sesi

const memoryStore = new Map();
const MAX_HISTORY = 20;

export function getMemory(sessionId) {
  if (!memoryStore.has(sessionId)) {
    memoryStore.set(sessionId, { sessionId, messages: [] });
  }
  return memoryStore.get(sessionId);
}

export function addMessage(sessionId, message) {
  const memory = getMemory(sessionId);
  memory.messages.push(message);
  if (memory.messages.length > MAX_HISTORY) {
    memory.messages = memory.messages.slice(-MAX_HISTORY);
  }
}

export function clearMemory(sessionId) {
  memoryStore.delete(sessionId);
}

export function getHistory(sessionId) {
  return getMemory(sessionId).messages;
}
