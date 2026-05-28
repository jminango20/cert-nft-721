import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import mintRouter from "./routes/mint";
import revokeRouter from "./routes/revoke";
import verifyRouter from "./routes/verify";
import metadataRouter from "./routes/metadata";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/mint", mintRouter);
app.use("/api/revoke", revokeRouter);
app.use("/api/verify", verifyRouter);
app.use("/api/metadata", metadataRouter);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const port = parseInt(process.env.PORT ?? "3001", 10);
app.listen(port, () => {
  console.log(`EduCert backend listening on port ${port}`);
});
