import { Router, Request, Response } from "express";
import { z } from "zod";
import { getClaim, associateWallet } from "../services/claims";
import { mintCertificate } from "../services/blockchain";
import { certificateRepository } from "../services/CertificateRepository";

const router = Router();

/**
 * GET /api/claim/:token
 * Returns certificate preview data for the claim link.
 * No wallet address required — public endpoint (token is the secret).
 */
router.get("/:token", async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;
  const record = getClaim(token);

  if (!record) {
    res.status(404).json({ error: "Claim token not found or expired" });
    return;
  }

  // Return certificate data — never expose recipientEmail or studentIdHash
  res.json({
    courseTitle: record.courseTitle,
    courseId: record.courseId,
    issueDate: record.issueDate,
    ects: record.ects,
    eqfLevel: record.eqfLevel,
    assessmentType: record.assessmentType,
    participationMode: record.participationMode,
    learningOutcomes: record.learningOutcomes,
    evidences: record.evidences,
    ipfsCid: record.ipfsCid,
    alreadyClaimed: record.claimed,
    tokenId: record.tokenId,
  });
});

const ClaimWalletSchema = z.object({
  walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Invalid wallet address"),
});

/**
 * POST /api/claim/:token
 * Associates a wallet to the claim and mints the NFT.
 * Body: { walletAddress: string }
 */
router.post("/:token", async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;

  const parsed = ClaimWalletSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const { walletAddress } = parsed.data;

  const record = getClaim(token);
  if (!record) {
    res.status(404).json({ error: "Claim token not found or expired" });
    return;
  }

  if (record.claimed || record.walletAddress) {
    res.status(409).json({ error: "Certificate already claimed", tokenId: record.tokenId });
    return;
  }

  if (!record.ipfsCid) {
    res.status(500).json({ error: "IPFS metadata not found for this claim" });
    return;
  }

  try {
    const ipfsUri = `ipfs://${record.ipfsCid}`;
    const { tokenId, txHash } = await mintCertificate(walletAddress, ipfsUri);

    associateWallet(token, walletAddress, tokenId, txHash);

    // Persist claim to SQLite — find by claimToken and update, or create new row
    try {
      const existing = await certificateRepository.findByClaimToken(token);
      if (existing) {
        await certificateRepository.markClaimed(
          token,
          walletAddress,
          Number(tokenId),
          txHash
        );
      } else {
        await certificateRepository.save({
          tokenId: Number(tokenId),
          txHash,
          recipientName: record.recipientName,
          recipientEmail: record.recipientEmail ?? null,
          courseTitle: record.courseTitle,
          claimToken: token,
          claimExpiresAt: new Date(record.expiresAt),
          claimedAt: new Date(),
          claimedBy: walletAddress,
          ipfsCid: record.ipfsCid ?? "",
          ownerAddress: walletAddress,
        });
      }
    } catch (dbErr) {
      console.warn("[claim] DB update failed (non-fatal):", dbErr);
    }

    res.status(201).json({ tokenId, txHash, ipfsCid: record.ipfsCid });
  } catch (err: unknown) {
    console.error("[claim mint error]", err);
    const message = err instanceof Error ? err.message : "Mint failed";
    res.status(500).json({ error: message });
  }
});

export default router;
