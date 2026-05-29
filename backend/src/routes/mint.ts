import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate";
import { requireApiKey } from "../middleware/auth";
import { uploadMetadata, uploadEvidenceFile } from "../services/ipfs";
import { mintCertificate } from "../services/blockchain";
import { CertificateMetadata, EvidenceItem } from "../types";

const router = Router();

const mintLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const EvidenceItemSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  hash: z.string().optional(),
  mimeType: z.string().optional(),
});

const MintSchema = z.object({
  studentWallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Invalid wallet address"),
  courseName: z.string().min(1).max(200),
  studentIdHash: z.string().min(1),
  issuedAt: z.string().datetime(),
  courseId: z.string().min(1).max(100),
  evidence: z.array(EvidenceItemSchema).optional(),
});

router.post("/", mintLimiter, requireApiKey, validate(MintSchema), async (req, res) => {
  try {
    const { studentWallet, courseName, studentIdHash, issuedAt, courseId, evidence } = req.body as {
      studentWallet: string;
      courseName: string;
      studentIdHash: string;
      issuedAt: string;
      courseId: string;
      evidence?: EvidenceItem[];
    };

    // Upload each evidence file to IPFS. Failures are non-fatal: the original
    // URL is kept as a fallback so the mint is not aborted.
    let resolvedEvidence: EvidenceItem[] | undefined;
    if (evidence && evidence.length > 0) {
      resolvedEvidence = await Promise.all(
        evidence.map(async (item) => {
          const ipfsUrl = await uploadEvidenceFile(item.url, item.title);
          return ipfsUrl ? { ...item, url: ipfsUrl } : item;
        })
      );
    }

    const metadata: CertificateMetadata = {
      name: `EduCert — ${courseName}`,
      description: `Certificado de conclusão emitido pela plataforma EduCert.`,
      image: "ipfs://QmEduCertPlaceholderImageCID000000000000000000000",
      attributes: [
        { trait_type: "Curso", value: courseName },
        { trait_type: "Course ID", value: courseId },
        { trait_type: "Student ID (hashed)", value: studentIdHash },
        { trait_type: "Emitido em", value: issuedAt },
        { trait_type: "Rede", value: "Sepolia" },
        { trait_type: "Tipo", value: "Soulbound" },
      ],
      ...(resolvedEvidence && resolvedEvidence.length > 0 ? { evidence: resolvedEvidence } : {}),
    };

    const ipfsUri = await uploadMetadata(metadata);
    const { tokenId, txHash } = await mintCertificate(studentWallet, ipfsUri);
    const ipfsCid = ipfsUri.replace("ipfs://", "");

    res.status(201).json({ tokenId, txHash, ipfsCid });
  } catch (err: unknown) {
    console.error("[mint error]", err);
    const message = err instanceof Error ? err.message : "Mint failed";
    res.status(500).json({ error: message });
  }
});

export default router;
