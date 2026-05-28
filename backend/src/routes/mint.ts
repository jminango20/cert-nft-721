import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireApiKey } from "../middleware/auth";
import { uploadMetadata } from "../services/ipfs";
import { mintCertificate } from "../services/blockchain";
import { CertificateMetadata } from "../types";

const router = Router();

const MintSchema = z.object({
  studentWallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Invalid wallet address"),
  courseName: z.string().min(1).max(200),
  studentIdHash: z.string().min(1),
  issuedAt: z.string().datetime(),
  courseId: z.string().min(1).max(100),
});

router.post("/", requireApiKey, validate(MintSchema), async (req, res) => {
  try {
    const { studentWallet, courseName, studentIdHash, issuedAt, courseId } = req.body;

    const metadata: CertificateMetadata = {
      name: `EduCert — ${courseName}`,
      description: `Certificado de conclusão emitido pela plataforma EduCert.`,
      image: "ipfs://QmEduCertPlaceholderImageCID000000000000000000000",
      attributes: [
        { trait_type: "Curso", value: courseName },
        { trait_type: "Course ID", value: courseId },
        { trait_type: "Student ID (hashed)", value: studentIdHash },
        { trait_type: "Emitido em", value: issuedAt },
        { trait_type: "Rede", value: "Polygon Amoy" },
        { trait_type: "Tipo", value: "Soulbound" },
      ],
    };

    const ipfsUri = await uploadMetadata(metadata);
    const { tokenId, txHash } = await mintCertificate(studentWallet, ipfsUri);
    const ipfsCid = ipfsUri.replace("ipfs://", "");

    res.status(201).json({ tokenId, txHash, ipfsCid });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Mint failed";
    res.status(500).json({ error: message });
  }
});

export default router;
