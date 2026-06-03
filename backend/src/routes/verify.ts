import { Router } from "express";
import { getCertificateInfo } from "../services/blockchain";
import { fetchMetadataWithCache } from "../services/MetadataCache";

const router = Router();

router.get("/:tokenId", async (req, res) => {
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
    const e = err as { status?: number; message?: string };
    const status = e.status ?? 500;
    const message = e.message ?? "Verify failed";
    res.status(status).json({ error: message });
  }
});

export default router;
