// server.js — ENTRY POINT (Express)
// RULE: Tidak ada AI logic, tidak ada prompt panjang di sini

import express from "express";
import cors from "cors";
import path from "path";
import aiRoute from "./api/aiRoute.js";

const app = express();
const PORT = process.env.PORT || 8080;

// Resolve public folder relative ke working directory (aman untuk Railway/Docker)
const publicPath = path.resolve("public");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(publicPath));
app.use("/api/ai", aiRoute);

app.get("/chat",       (_req, res) => res.sendFile(path.join(publicPath, "chat.html")));
app.get("/admin",      (_req, res) => res.sendFile(path.join(publicPath, "admin.html")));
app.get("/api/healthz",(_req, res) => res.json({ status: "ok", uptime: process.uptime() }));
app.get("/",           (_req, res) => res.sendFile(path.join(publicPath, "index.html")));

app.listen(PORT, () => {
  console.log(`🚀 AIRA Server berjalan di http://localhost:${PORT}`);
  console.log(`📁 Public folder: ${publicPath}`);
});
