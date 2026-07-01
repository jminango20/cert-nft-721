import { Router, Request, Response } from "express";
import { requireApiKey } from "../middleware/auth";
import { certificateRepository } from "../services/CertificateRepository";
import { getPendingClaims } from "../services/claims";

const router = Router();

type CertificateEstado = "revogado" | "pendente" | "valido";

/**
 * GET /api/admin/certificates
 * Returns all minted certificates from SQLite plus not-yet-claimed
 * claim-link/claim-by-email records (which have no SQLite row until claimed),
 * ordered by issuedAt desc. Protected by x-api-key header.
 */
router.get("/certificates", requireApiKey, async (_req: Request, res: Response): Promise<void> => {
  try {
    const certs = await certificateRepository.findAll();

    const minted = certs.map((cert) => {
      let estado: CertificateEstado;
      if (cert.revokedAt !== null) {
        estado = "revogado";
      } else if (cert.claimedAt === null) {
        estado = "pendente";
      } else {
        estado = "valido";
      }

      return {
        id: `cert-${cert.id}`,
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

    const pending = await getPendingClaims();
    const pendingMapped = pending.map((claim) => ({
      id: `claim-${claim.token}`,
      tokenId: null,
      txHash: null,
      recipientName: claim.recipientName,
      courseTitle: claim.courseTitle,
      issuedAt: new Date(claim.createdAt).toISOString(),
      revokedAt: null,
      claimedAt: null,
      claimedBy: null,
      ownerAddress: null,
      ipfsCid: claim.ipfsCid,
      estado: "pendente" as CertificateEstado,
    }));

    const result = [...minted, ...pendingMapped].sort(
      (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
    );

    res.json(result);
  } catch (err: unknown) {
    const e = err as { message?: string };
    res.status(500).json({ error: e.message ?? "Failed to fetch certificates" });
  }
});

export default router;
