import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes/index.js";
import airaRouter from "./routes/aira.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Resolve public/ relative to this file — fixes ENOENT on Railway/Docker/Replit
// where the working directory may differ from the source directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicPath = path.resolve(__dirname, "../public");

app.use(express.static(publicPath));

// API routes
app.use("/api", router);
app.use("/api/ai", airaRouter);

// HTML page routes
app.get("/chat",  (_req, res) => res.sendFile(path.join(publicPath, "chat.html")));
app.get("/admin", (_req, res) => res.sendFile(path.join(publicPath, "admin.html")));
app.get("/",      (_req, res) => res.sendFile(path.join(publicPath, "index.html")));

export default app;
