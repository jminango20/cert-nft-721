import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getReadContract } from "../services/blockchain";
import { getAllTx } from "../services/TxIndex";
import { fetchMetadataWithCache } from "../services/MetadataCache";
import { certificateRepository } from "../services/CertificateRepository";

const router = Router();

// H6: Rate limit — 60 req/min per IP for read endpoints
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GET /api/certificates?owner=0x...&page=1&limit=20
 * Returns paginated certificates owned by the given wallet address.
 * H3: Chunked RPC calls (20 at a time) + pagination support.
 * H9: recipientName is not included in the response (PII on unauthenticated endpoint).
 */
router.get("/", readLimiter, async (req, res) => {
  try {
    const owner = req.query.owner as string | undefined;
    const { ethers } = await import("ethers");
    if (!owner || !ethers.isAddress(owner)) {
      res.status(400).json({ error: "Invalid or missing owner address" });
      return;
    }

    const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? "20", 10) || 20));

    const normalizedOwner = owner.toLowerCase();
    const txIndex = await getAllTx();
    const allTokenIds = Object.keys(txIndex);

    if (allTokenIds.length === 0) {
      res.json({ data: [], page, limit, total: 0 });
      return;
    }

    // H2: Use the shared singleton contract from blockchain.ts
    const contract = getReadContract();

    // H3: Process ownership checks in chunks of 20 to avoid flooding the RPC
    const CHUNK_SIZE = 20;
    const ownedTokenIds: string[] = [];

    for (let i = 0; i < allTokenIds.length; i += CHUNK_SIZE) {
      const chunk = allTokenIds.slice(i, i + CHUNK_SIZE);
      const results = await Promise.all(
        chunk.map(async (tokenId) => {
          try {
            const tokenOwner: string = await contract.ownerOf(BigInt(tokenId));
            return { tokenId, owned: tokenOwner.toLowerCase() === normalizedOwner };
          } catch {
            return { tokenId, owned: false };
          }
        })
      );
      for (const r of results) {
        if (r.owned) ownedTokenIds.push(r.tokenId);
      }
    }

    const total = ownedTokenIds.length;

    if (total === 0) {
      res.json({ data: [], page, limit, total });
      return;
    }

    // Apply pagination
    const pageTokenIds = ownedTokenIds.slice((page - 1) * limit, page * limit);

    // H3: Fetch full info for the current page in chunks of 20
    const certificates: Array<{
      tokenId: string;
      metadata: Record<string, unknown> | null;
      isRevoked: boolean;
      txHash: string | null;
    }> = [];

    for (let i = 0; i < pageTokenIds.length; i += CHUNK_SIZE) {
      const chunk = pageTokenIds.slice(i, i + CHUNK_SIZE);
      const results = await Promise.all(
        chunk.map(async (tokenId) => {
          const txHash = txIndex[tokenId] ?? null;

          const [isRevoked, rawTokenURI] = await Promise.all([
            contract.isRevoked(BigInt(tokenId)).catch(() => false) as Promise<boolean>,
            contract.tokenURI(BigInt(tokenId)).catch(() => null) as Promise<string | null>,
          ]);

          let metadata: Record<string, unknown> | null = null;
          if (rawTokenURI && !isRevoked) {
            try {
              metadata = await fetchMetadataWithCache(rawTokenURI);
            } catch {
              // best-effort
            }
          }

          // H9: recipientName omitted — PII must not be exposed on this unauthenticated endpoint
          return {
            tokenId,
            metadata,
            isRevoked,
            txHash,
          };
        })
      );
      certificates.push(...results);
    }

    res.json({ data: certificates, page, limit, total });
  } catch (err: unknown) {
    const e = err as { message?: string };
    res.status(500).json({ error: e.message ?? "Failed to fetch certificates" });
  }
});

export default router;
