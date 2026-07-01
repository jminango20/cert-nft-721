import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getCertificateInfo } from "../services/blockchain";
import { fetchMetadataWithCache } from "../services/MetadataCache";

const router = Router();

// H6: Rate limit — 60 req/min per IP
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/:tokenId", readLimiter, async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId, 10);
    if (isNaN(tokenId) || tokenId <= 0) {
      res.status(400).json({ error: "Invalid tokenId" });
      return;
    }

    const info = await getCertificateInfo(tokenId);

    if (info.tokenURI) {
      try {
        info.metadata = await fetchMetadataWithCache(info.tokenURI);
      } catch {
        // metadata fetch is best-effort
      }
    }

    res.json(info);
  } catch (err: unknown) {
    console.error("[verify error]", err);
    const e = err as { status?: number };
    const status = e.status ?? 500;
    const message = status === 500 ? "Blockchain operation failed" : "Verify failed";
    res.status(status).json({ error: message });
  }
});

export default router;
