const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
const Database = require("better-sqlite3");
const Anthropic = require("@anthropic-ai/sdk");
const { randomUUID, createHash } = require("crypto");
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
    plan TEXT DEFAULT 'free',
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
  CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT,
    detail TEXT,
    ip_address TEXT,
    device TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS registration_guard (
    id TEXT PRIMARY KEY,
    ip_address TEXT,
    device_hash TEXT,
    google_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// ─── Helpers ───────────────────────────────────────────────────────────────
function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function deviceHash(req) {
  const ua = req.headers["user-agent"] || "";
  const lang = req.headers["accept-language"] || "";
  return createHash("sha256").update(ua + lang).digest("hex").slice(0, 16);
}

function logActivity(userId, action, detail, req) {
  try {
    db.prepare(
      "INSERT INTO activity_log (id, user_id, action, detail, ip_address, device) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      randomUUID(), userId, action, detail,
      getClientIP(req), req.headers["user-agent"]?.slice(0, 200) || "unknown"
    );
  } catch (e) {}
}

// ─── Anti-Spam Guard ───────────────────────────────────────────────────────
function checkRegistrationSpam(req, googleId) {
  const ip = getClientIP(req);
  const dHash = deviceHash(req);
  const windowMs = 24 * 60 * 60 * 1000; // 24 hours
  const cutoff = new Date(Date.now() - windowMs).toISOString();

  // Max 3 new accounts per IP per 24h
  const ipCount = db
    .prepare(
      "SELECT COUNT(*) as cnt FROM registration_guard WHERE ip_address = ? AND created_at > ?"
    )
    .get(ip, cutoff);
  if (ipCount.cnt >= 3) return { blocked: true, reason: "too_many_accounts_ip" };

  // Max 2 new accounts per device per 24h
  const devCount = db
    .prepare(
      "SELECT COUNT(*) as cnt FROM registration_guard WHERE device_hash = ? AND created_at > ?"
    )
    .get(dHash, cutoff);
  if (devCount.cnt >= 2) return { blocked: true, reason: "too_many_accounts_device" };

  // Record this registration attempt
  db.prepare(
    "INSERT INTO registration_guard (id, ip_address, device_hash, google_id) VALUES (?, ?, ?, ?)"
  ).run(randomUUID(), ip, dHash, googleId);

  return { blocked: false };
}

// ─── Passport / Google OAuth ───────────────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
      passReqToCallback: true,
    },
    (req, accessToken, refreshToken, profile, done) => {
      // Check if user already exists
      const existing = db
        .prepare("SELECT * FROM users WHERE google_id = ?")
        .get(profile.id);

      if (existing) {
        // Existing user — just log activity
        logActivity(existing.id, "login", "Google OAuth login", req);
        return done(null, existing);
      }

      // NEW user — check anti-spam
      const guard = checkRegistrationSpam(req, profile.id);
      if (guard.blocked) {
        return done(null, false, {
          message:
            guard.reason === "too_many_accounts_ip"
              ? "Terlalu banyak akun dibuat dari jaringan ini. Coba lagi besok."
              : "Terlalu banyak akun dibuat dari perangkat ini. Coba lagi besok.",
        });
      }

      // Create new user
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
      logActivity(id, "register", "Akun baru dibuat via Google", req);
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

// ─── Auth Routes ───────────────────────────────────────────────────────────
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/?error=spam_blocked",
    failureMessage: true,
  }),
  (req, res) => res.redirect("/chat.html")
);
app.post("/api/logout", (req, res) => {
  req.logout(() => res.json({ success: true }));
});
app.get("/api/user", requireAuth, (req, res) => {
  const { id, name, email, avatar, plan, created_at } = req.user;
  res.json({ id, name, email, avatar, plan: plan || "free", created_at });
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
  logActivity(req.user.id, "new_conversation", `Percakapan baru: ${title}`, req);
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
  logActivity(req.user.id, "delete_conversation", `Hapus: ${conv.title}`, req);
  res.json({ success: true });
});

// ─── Activity Log ──────────────────────────────────────────────────────────
app.get("/api/activity", requireAuth, (req, res) => {
  const logs = db
    .prepare(
      "SELECT action, detail, ip_address, device, created_at FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
    )
    .all(req.user.id);
  res.json(logs);
});

// ─── Feedback ──────────────────────────────────────────────────────────────
app.post("/api/feedback", requireAuth, (req, res) => {
  const { type = "general", message } = req.body;
  if (!message || message.trim().length < 5)
    return res.status(400).json({ error: "Pesan terlalu pendek" });
  db.prepare(
    "INSERT INTO feedback (id, user_id, type, message) VALUES (?, ?, ?, ?)"
  ).run(randomUUID(), req.user.id, type, message.trim());
  logActivity(req.user.id, "feedback", `Masukan: ${type}`, req);
  res.json({ success: true });
});

// ─── Chat (Streaming) ──────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
      ? "Kamu adalah XYA AI, asisten AI yang cerdas, ramah, dan membantu. Jawab semua pertanyaan dengan bahasa Indonesia yang natural, informatif, dan mudah dipahami. Gunakan formatting markdown bila perlu."
      : "You are XYA AI, a smart, friendly, and helpful AI assistant. Answer all questions in natural, informative, and easy-to-understand English. Use markdown formatting when appropriate.";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    let fullResponse = "";
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: history,
    });

    stream.on("text", (text) => {
      fullResponse += text;
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    });

    stream.on("finalMessage", () => {
      db.prepare(
        "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)"
      ).run(randomUUID(), conversationId, "assistant", fullResponse);
      db.prepare(
        "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(conversationId);
      logActivity(req.user.id, "chat", `Pesan dikirim di: ${conv.title || conversationId}`, req);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    });

    stream.on("error", (err) => {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ─── Spam blocked page ─────────────────────────────────────────────────────
app.get("/", (req, res, next) => {
  if (req.query.error === "spam_blocked") {
    return res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>XYA AI</title>
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8faff;}
    .box{background:white;border-radius:16px;padding:40px;max-width:400px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);}
    h2{color:#dc2626;margin-bottom:12px;}p{color:#64748b;line-height:1.6;}
    a{display:inline-block;margin-top:20px;padding:10px 24px;background:#4f46e5;color:white;border-radius:10px;text-decoration:none;font-weight:600;}</style>
    </head><body><div class="box"><h2>🚫 Akses Dibatasi</h2>
    <p>Terlalu banyak akun dibuat dari jaringan atau perangkat ini.<br>Silakan coba lagi besok.</p>
    <a href="/">← Kembali</a></div></body></html>`);
  }
  next();
});

app.listen(PORT, () =>
  console.log(`✅ XYA AI running on http://localhost:${PORT}`)
);
