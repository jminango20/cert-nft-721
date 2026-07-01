import "dotenv/config";
import crypto from "crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import mintRouter from "./routes/mint";
import revokeRouter from "./routes/revoke";
import verifyRouter from "./routes/verify";
import metadataRouter from "./routes/metadata";
import claimRouter from "./routes/claim";
import certificatesRouter from "./routes/certificates";
import adminRouter from "./routes/admin";

// C4: Validate all required environment variables before starting
function validateEnv(): void {
  const required = ["PRIVATE_KEY", "RPC_URL", "CONTRACT_ADDRESS", "PINATA_JWT", "API_KEY"];
  const missing = required.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`[startup] Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  // L2: Validate PRIVATE_KEY format — must be a 64-character hex string (with or without 0x prefix)
  const rawKey = process.env.PRIVATE_KEY ?? "";
  const normalizedKey = rawKey.startsWith("0x") ? rawKey.slice(2) : rawKey;
  if (!/^[0-9a-fA-F]{64}$/.test(normalizedKey)) {
    console.error("[startup] PRIVATE_KEY must be a 64-character hex string");
    process.exit(1);
  }

  // L5: Warn if RESEND_API_KEY is set but RESEND_FROM_EMAIL is not
  if (process.env.RESEND_API_KEY && !process.env.RESEND_FROM_EMAIL) {
    console.warn(
      "[env] RESEND_API_KEY is set but RESEND_FROM_EMAIL is not — emails may fail if default domain is unverified"
    );
  }

  const warned = ["DATABASE_URL", "FRONTEND_URL"];
  for (const v of warned) {
    if (!process.env[v]) {
      console.warn(`[startup] Warning: ${v} is not set — some features may be degraded`);
    }
  }
}

validateEnv();

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn("[startup] FRONTEND_URL not set — CORS will reject all cross-origin requests in production");
}

// L8: Explicit CSP — no inline scripts, no objects; COEP disabled to allow IPFS/Pinata image loading
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (curl, server-to-server) that send no Origin header
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
  })
);
app.use(express.json());

// L6: Attach a per-request correlation ID for log tracing
app.use((_req, res, next) => {
  res.locals.requestId = crypto.randomUUID();
  console.log(`[request] ${_req.method} ${_req.path} id=${res.locals.requestId as string}`);
  next();
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/mint", mintRouter);
app.use("/api/revoke", revokeRouter);
app.use("/api/verify", verifyRouter);
app.use("/api/metadata", metadataRouter);
app.use("/api/claim", claimRouter);
app.use("/api/certificates", certificatesRouter);
app.use("/api/admin", adminRouter);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// C3: Global error handler — catches multer rejections and any sync throws
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[error]", err.message);
  const status = (err as Error & { status?: number }).status ?? 500;
  res.status(status).json({ error: err.message ?? "Internal server error" });
});

const port = parseInt(process.env.PORT ?? "3001", 10);

// H8: Store server reference for graceful shutdown
const server = app.listen(port, () => {
  console.log(`EduCert backend listening on port ${port}`);
});

// H8: Graceful shutdown on SIGTERM/SIGINT
function shutdown(): void {
  server.close(() => {
    console.log("[shutdown] HTTP server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
