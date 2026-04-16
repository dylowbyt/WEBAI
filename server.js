// server.js — ENTRY POINT (Express)
// RULE: Tidak ada AI logic, tidak ada prompt panjang di sini

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import aiRoute from "./api/aiRoute.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));
app.use("/api/ai", aiRoute);

app.get("/chat",  (_req, res) => res.sendFile(path.join(__dirname, "public/chat.html")));
app.get("/admin", (_req, res) => res.sendFile(path.join(__dirname, "public/admin.html")));
app.get("/",      (_req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/api/healthz", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.listen(PORT, () => {
  console.log(`🚀 AIRA Server berjalan di http://localhost:${PORT}`);
});
