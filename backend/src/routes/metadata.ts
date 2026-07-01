import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getCertificateInfo } from "../services/blockchain";

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

    if (!info.tokenURI) {
      res.status(404).json({ error: "No metadata available" });
      return;
    }

    const cid = info.tokenURI.replace("ipfs://", "");
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    const metaRes = await fetch(gatewayUrl, { signal: AbortSignal.timeout(8000) });

    if (!metaRes.ok) {
      res.status(502).json({ error: "Failed to fetch metadata from IPFS" });
      return;
    }

    const metadata = await metaRes.json();
    res.setHeader("Content-Type", "application/json");
    res.json(metadata);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    const status = e.status ?? 500;
    const message = e.message ?? "Metadata fetch failed";
    res.status(status).json({ error: message });
  }
});

export default router;
