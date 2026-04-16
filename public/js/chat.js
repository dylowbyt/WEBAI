const BASE_URL = "/api/ai";
let sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

function getTypeBadge(type) {
  const labels = {
    chat: "Chat",
    image: "Image AI",
    video: "Video Concept",
    game: "Game AI",
    "multi-step": "Multi-Step",
  };
  return labels[type] ?? type;
}

function appendMessage(role, content, type, imageUrl) {
  const msg = document.createElement("div");
  msg.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "👤" : "🤖";

  const bubble = document.createElement("div");
  bubble.className = "message-content";

  if (role === "ai" && type && type !== "chat") {
    const badge = document.createElement("div");
    badge.className = "message-type-badge";
    badge.textContent = getTypeBadge(type);
    bubble.appendChild(badge);
  }

  const text = document.createElement("div");
  text.innerHTML = formatText(content);
  bubble.appendChild(text);

  if (imageUrl) {
    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = "Generated image";
    img.loading = "lazy";
    bubble.appendChild(img);
  }

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  messagesEl.appendChild(msg);
  scrollToBottom();
}

function formatText(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

function showTyping() {
  const msg = document.createElement("div");
  msg.className = "message ai";
  msg.id = "typing";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "🤖";

  const bubble = document.createElement("div");
  bubble.className = "message-content";

  const typing = document.createElement("div");
  typing.className = "typing-indicator";
  typing.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
  bubble.appendChild(typing);

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  messagesEl.appendChild(msg);
  scrollToBottom();
}

function removeTyping() {
  const typing = document.getElementById("typing");
  if (typing) typing.remove();
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendMessage() {
  const message = inputEl.value.trim();
  if (!message) return;

  inputEl.value = "";
  inputEl.style.height = "48px";
  sendBtn.disabled = true;

  appendMessage("user", message);
  showTyping();

  try {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId }),
    });

    const json = await res.json();
    removeTyping();

    if (!res.ok || json.error) {
      appendMessage("ai", `Error: ${json.message ?? "Terjadi kesalahan. Coba lagi."}`, "chat");
      return;
    }

    const data = json.data;
    appendMessage("ai", data.content, data.type, data.imageUrl);

    if (json.meta?.sessionId) {
      sessionId = json.meta.sessionId;
    }
  } catch (err) {
    removeTyping();
    appendMessage("ai", "Koneksi gagal. Periksa koneksi kamu dan coba lagi.", "chat");
  } finally {
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

sendBtn.addEventListener("click", sendMessage);

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

inputEl.addEventListener("input", () => {
  inputEl.style.height = "48px";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + "px";
});

window.clearChat = function () {
  fetch(`${BASE_URL}/memory/${sessionId}`, { method: "DELETE" }).catch(() => {});
  messagesEl.innerHTML = "";
  sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  appendMessage("ai", "Percakapan direset. Halo! Ada yang bisa saya bantu? 👋", "chat");
};
