import { Router } from "express";
import { ethers } from "ethers";
import { readAll } from "../services/TxIndex";

const ABI = [
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "function isRevoked(uint256 tokenId) public view returns (bool)",
  "function tokenURI(uint256 tokenId) public view returns (string memory)",
];

function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL not set");
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getContract(): ethers.Contract {
  const address = process.env.CONTRACT_ADDRESS;
  if (!address) throw new Error("CONTRACT_ADDRESS not set");
  return new ethers.Contract(address, ABI, getProvider());
}

function ipfsToHttp(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
  }
  return uri;
}

const router = Router();

/**
 * GET /api/certificates?owner=0x...
 * Returns all certificates owned by the given wallet address.
 */
router.get("/", async (req, res) => {
  try {
    const owner = req.query.owner as string | undefined;
    if (!owner || !ethers.isAddress(owner)) {
      res.status(400).json({ error: "Invalid or missing owner address" });
      return;
    }

    const normalizedOwner = owner.toLowerCase();
    const txIndex = readAll();
    const tokenIds = Object.keys(txIndex);

    if (tokenIds.length === 0) {
      res.json([]);
      return;
    }

    const contract = getContract();

    // Check ownership for all token IDs in parallel
    const ownerChecks = await Promise.all(
      tokenIds.map(async (tokenId) => {
        try {
          const tokenOwner: string = await contract.ownerOf(BigInt(tokenId));
          return { tokenId, owned: tokenOwner.toLowerCase() === normalizedOwner };
        } catch {
          return { tokenId, owned: false };
        }
      })
    );

    const ownedTokenIds = ownerChecks
      .filter((c) => c.owned)
      .map((c) => c.tokenId);

    if (ownedTokenIds.length === 0) {
      res.json([]);
      return;
    }

    // Fetch full info for each owned token in parallel
    const certificates = await Promise.all(
      ownedTokenIds.map(async (tokenId) => {
        const txHash = txIndex[tokenId] ?? null;

        const [isRevoked, rawTokenURI] = await Promise.all([
          contract.isRevoked(BigInt(tokenId)).catch(() => false) as Promise<boolean>,
          contract.tokenURI(BigInt(tokenId)).catch(() => null) as Promise<string | null>,
        ]);

        let metadata: Record<string, unknown> | null = null;
        if (rawTokenURI && !isRevoked) {
          try {
            const url = ipfsToHttp(rawTokenURI);
            const metaRes = await fetch(url, {
              signal: AbortSignal.timeout(5000),
            });
            if (metaRes.ok) {
              metadata = (await metaRes.json()) as Record<string, unknown>;
            }
          } catch {
            // best-effort
          }
        }

        return {
          tokenId,
          metadata,
          isRevoked,
          txHash,
        };
      })
    );

    res.json(certificates);
  } catch (err: unknown) {
    const e = err as { message?: string };
    res.status(500).json({ error: e.message ?? "Failed to fetch certificates" });
  }
});

export default router;
