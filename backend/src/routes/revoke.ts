import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireApiKey } from "../middleware/auth";
import { revokeCertificate } from "../services/blockchain";
import { certificateRepository } from "../services/CertificateRepository";

const router = Router();

const RevokeSchema = z.object({
  tokenId: z
    .union([
      z.number().int().positive(),
      z.string().regex(/^\d+$/).transform(Number),
    ])
    .refine((n) => Number.isInteger(n) && n > 0, {
      message: "tokenId must be a positive integer",
    }),
});

router.post("/", requireApiKey, validate(RevokeSchema), async (req, res) => {
  try {
    const { tokenId } = req.body;
    const { txHash } = await revokeCertificate(tokenId);

    // Persist revocation to SQLite — non-fatal
    try {
      await certificateRepository.markRevoked(tokenId);
    } catch (dbErr) {
      console.warn("[revoke] DB markRevoked failed (non-fatal):", dbErr);
    }

    res.json({ txHash, tokenId });
  } catch (err: unknown) {
    console.error("[revoke error]", err);
    const e = err as { status?: number };
    const status = e.status ?? 500;
    const message = status === 500 ? "Blockchain operation failed" : "Revoke failed";
    res.status(status).json({ error: message });
  }
});

export default router;
