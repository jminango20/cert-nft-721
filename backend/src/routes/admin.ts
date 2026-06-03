import { Router, Request, Response } from "express";
import { requireApiKey } from "../middleware/auth";
import { certificateRepository } from "../services/CertificateRepository";

const router = Router();

type CertificateEstado = "revogado" | "pendente" | "valido";

/**
 * GET /api/admin/certificates
 * Returns all certificates from SQLite ordered by issuedAt desc.
 * Protected by x-api-key header.
 */
router.get("/certificates", requireApiKey, async (_req: Request, res: Response): Promise<void> => {
  try {
    const certs = await certificateRepository.findAll();

    const result = certs.map((cert) => {
      let estado: CertificateEstado;
      if (cert.revokedAt !== null) {
        estado = "revogado";
      } else if (cert.claimedAt === null) {
        estado = "pendente";
      } else {
        estado = "valido";
      }

      return {
        id: cert.id,
        tokenId: cert.tokenId,
        txHash: cert.txHash,
        recipientName: cert.recipientName,
        courseTitle: cert.courseTitle,
        issuedAt: cert.issuedAt,
        revokedAt: cert.revokedAt,
        claimedAt: cert.claimedAt,
        claimedBy: cert.claimedBy,
        ownerAddress: cert.ownerAddress,
        ipfsCid: cert.ipfsCid,
        estado,
      };
    });

    res.json(result);
  } catch (err: unknown) {
    const e = err as { message?: string };
    res.status(500).json({ error: e.message ?? "Failed to fetch certificates" });
  }
});

export default router;
