import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import env from "./config/env.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";

const app = express();

// CLIENT_URL may be a single origin or a comma-separated list (local + deployed
// dashboard). "*" allows any origin. The Meta webhook is server-to-server and
// is unaffected by CORS either way.
const allowedOrigins = env.clientUrl
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  }),
);
app.use(
  express.json({
    // Keep the raw bytes so the Meta webhook can verify the X-Hub-Signature-256 HMAC.
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.get("/api/health", (_req, res) => {
  res.json({
    message: "Backend API is running",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/webhooks", webhookRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "Internal server error",
  });
});

export default app;
