const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
const Database = require("better-sqlite3");
const OpenAI = require("openai"); // ✅ GANTI
const { randomUUID } = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Database Setup ────────────────────────────────────────────────────────
const db = new Database("./xyabot.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    google_id TEXT UNIQUE,
    name TEXT,
    email TEXT,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT DEFAULT 'New Chat',
    language TEXT DEFAULT 'id',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    role TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
  );
`);

// ─── Passport / Google OAuth ───────────────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      const existing = db
        .prepare("SELECT * FROM users WHERE google_id = ?")
        .get(profile.id);
      if (existing) return done(null, existing);
      const id = randomUUID();
      db.prepare(
        "INSERT INTO users (id, google_id, name, email, avatar) VALUES (?, ?, ?, ?, ?)"
      ).run(
        id,
        profile.id,
        profile.displayName,
        profile.emails?.[0]?.value || "",
        profile.photos?.[0]?.value || ""
      );
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
      return done(null, user);
    }
  )
);
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  done(null, user || null);
});

// ─── Middleware ────────────────────────────────────────────────────────────
app.set("trust proxy", 1);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "xyabot-super-secret-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, "public")));

const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: "Unauthorized" });
};

// ─── OpenAI Setup ─────────────────────────────────────────────────────────
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ─── Auth Routes ───────────────────────────────────────────────────────────
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/?error=auth_failed" }),
  (req, res) => res.redirect("/chat.html")
);
app.post("/api/logout", (req, res) => {
  req.logout(() => res.json({ success: true }));
});
app.get("/api/user", requireAuth, (req, res) => {
  const { id, name, email, avatar } = req.user;
  res.json({ id, name, email, avatar });
});

// ─── Conversation Routes ───────────────────────────────────────────────────
app.get("/api/conversations", requireAuth, (req, res) => {
  const convs = db
    .prepare(
      "SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC"
    )
    .all(req.user.id);
  res.json(convs);
});

app.post("/api/conversations", requireAuth, (req, res) => {
  const id = randomUUID();
  const { language = "id" } = req.body;
  const title = language === "id" ? "Chat Baru" : "New Chat";
  db.prepare(
    "INSERT INTO conversations (id, user_id, title, language) VALUES (?, ?, ?, ?)"
  ).run(id, req.user.id, title, language);
  res.json({ id, title, language, messages: [] });
});

app.get("/api/conversations/:id", requireAuth, (req, res) => {
  const conv = db
    .prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);
  if (!conv) return res.status(404).json({ error: "Not found" });
  const messages = db
    .prepare(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
    )
    .all(req.params.id);
  res.json({ ...conv, messages });
});

app.delete("/api/conversations/:id", requireAuth, (req, res) => {
  const conv = db
    .prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);
  if (!conv) return res.status(404).json({ error: "Not found" });
  db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(req.params.id);
  db.prepare("DELETE FROM conversations WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ─── Chat (Streaming) ──────────────────────────────────────────────────────
app.post("/api/chat", requireAuth, async (req, res) => {
  const { conversationId, message, language = "id" } = req.body;
  if (!message || !conversationId)
    return res.status(400).json({ error: "Missing fields" });

  const conv = db
    .prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?")
    .get(conversationId, req.user.id);
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  db.prepare(
    "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)"
  ).run(randomUUID(), conversationId, "user", message);

  if (conv.title === "Chat Baru" || conv.title === "New Chat") {
    const title = message.length > 45 ? message.substring(0, 45) + "…" : message;
    db.prepare("UPDATE conversations SET title = ? WHERE id = ?").run(
      title, conversationId
    );
  }

  const history = db
    .prepare(
      "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
    )
    .all(conversationId);

  const systemPrompt =
    language === "id"
      ? "Kamu adalah XYABOT AI, asisten AI yang cerdas, ramah, dan membantu."
      : "You are XYABOT AI, a smart, friendly, and helpful AI assistant.";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...history
      ]
    });

    for await (const chunk of stream) {
      const text = chunk.choices?.[0]?.delta?.content || "";
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    db.prepare(
      "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)"
    ).run(randomUUID(), conversationId, "assistant", fullResponse);

    db.prepare(
      "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(conversationId);

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () =>
  console.log(`✅ XYABOT AI running on http://localhost:${PORT}`)
);
