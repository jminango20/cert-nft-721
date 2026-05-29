import { Router } from "express";
import { getCertificateInfo } from "../services/blockchain";

function ipfsToHttp(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
  }
  return uri;
}

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
      const gatewayUrl = ipfsToHttp(info.tokenURI);
      try {
        const metaRes = await fetch(gatewayUrl, { signal: AbortSignal.timeout(5000) });
        if (metaRes.ok) {
          info.metadata = await metaRes.json() as Record<string, unknown>;
        }
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
