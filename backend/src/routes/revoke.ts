import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireApiKey } from "../middleware/auth";
import { revokeCertificate } from "../services/blockchain";

const router = Router();

const RevokeSchema = z.object({
  tokenId: z.number().int().positive(),
});

router.post("/", requireApiKey, validate(RevokeSchema), async (req, res) => {
  try {
    const { tokenId } = req.body;
    const { txHash } = await revokeCertificate(tokenId);
    res.json({ txHash, tokenId });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    const status = e.status ?? 500;
    const message = e.message ?? "Revoke failed";
    res.status(status).json({ error: message });
  }
});

export default router;
