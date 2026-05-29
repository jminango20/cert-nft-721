import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import mintRouter from "./routes/mint";
import revokeRouter from "./routes/revoke";
import verifyRouter from "./routes/verify";
import metadataRouter from "./routes/metadata";
import claimRouter from "./routes/claim";

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
}));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/mint", mintRouter);
app.use("/api/revoke", revokeRouter);
app.use("/api/verify", verifyRouter);
app.use("/api/metadata", metadataRouter);
app.use("/api/claim", claimRouter);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const port = parseInt(process.env.PORT ?? "3001", 10);
app.listen(port, () => {
  console.log(`EduCert backend listening on port ${port}`);
});
