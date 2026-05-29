import { Router, Request, Response } from "express";
import multer from "multer";
import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import rateLimit from "express-rate-limit";
import { requireApiKey } from "../middleware/auth";
import { uploadMetadata, uploadBufferToIPFS } from "../services/ipfs";
import { mintCertificate } from "../services/blockchain";
import { saveClaim, makeExpiry } from "../services/claims";
import { sendClaimEmail } from "../services/email";
import { CertificateMetadata, EvidenceItem, ClaimRecord } from "../types";

const router = Router();

const mintLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// multer: memory storage, accept PDF + images only, max 10MB per file
const ALLOWED_MIMETYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

/**
 * POST /api/mint
 * Accepts multipart/form-data.
 *
 * Fields:
 *   recipientName, recipientEmail, courseTitle, courseId,
 *   studentIdHash, issueDate, ects, eqfLevel (1-8),
 *   assessmentType, participationMode, learningOutcomes
 *   evidenceTitles[] (one per file, JSON array or repeated field)
 *   evidenceTypes[]  (one per file)
 *   walletAddress    (optional — if omitted, claim-by-email flow is used)
 *
 * Files:
 *   evidences[]  (PDF / image files)
 */
router.post(
  "/",
  mintLimiter,
  requireApiKey,
  upload.array("evidences", 10),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // --- Parse and validate body fields ---
      const {
        recipientName,
        recipientEmail,
        courseTitle,
        courseId,
        studentIdHash,
        issueDate,
        ects,
        eqfLevel,
        assessmentType,
        participationMode,
        learningOutcomes,
        walletAddress,
      } = req.body as Record<string, string>;

      if (!recipientName || !courseTitle || !courseId || !studentIdHash || !issueDate) {
        res.status(400).json({ error: "Missing required fields: recipientName, courseTitle, courseId, studentIdHash, issueDate" });
        return;
      }

      const ectsNum = Number(ects);
      const eqfNum = Number(eqfLevel);
      if (isNaN(ectsNum) || ectsNum < 0) {
        res.status(400).json({ error: "ects must be a non-negative number" });
        return;
      }
      if (isNaN(eqfNum) || eqfNum < 1 || eqfNum > 8) {
        res.status(400).json({ error: "eqfLevel must be 1-8" });
        return;
      }

      // --- Parse evidence titles and types ---
      let evidenceTitles: string[] = [];
      let evidenceTypes: string[] = [];

      const rawTitles = req.body["evidenceTitles"];
      const rawTypes = req.body["evidenceTypes"];

      if (Array.isArray(rawTitles)) {
        evidenceTitles = rawTitles as string[];
      } else if (typeof rawTitles === "string") {
        try { evidenceTitles = JSON.parse(rawTitles); } catch { evidenceTitles = [rawTitles]; }
      }

      if (Array.isArray(rawTypes)) {
        evidenceTypes = rawTypes as string[];
      } else if (typeof rawTypes === "string") {
        try { evidenceTypes = JSON.parse(rawTypes); } catch { evidenceTypes = [rawTypes]; }
      }

      // --- Upload evidence files to Pinata ---
      const files = (req.files ?? []) as Express.Multer.File[];
      const resolvedEvidences: EvidenceItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const title = evidenceTitles[i] ?? file.originalname;
        const type = evidenceTypes[i] ?? (file.mimetype === "application/pdf" ? "PDF" : "Imagen");
        const fileHash = createHash("sha256").update(file.buffer).digest("hex");

        const uploaded = await uploadBufferToIPFS(file.buffer, file.originalname, file.mimetype);

        resolvedEvidences.push({
          type,
          title,
          url: uploaded ? uploaded.ipfsUri : "",
          hash: fileHash,
          mimeType: file.mimetype,
        });
      }

      // --- Build IPFS metadata (NO personal data on-chain / IPFS) ---
      const metadata: CertificateMetadata = {
        name: `EduCert — ${courseTitle}`,
        description: `Microcredencial emitida pela plataforma EduCert / ISTER.`,
        image: "ipfs://QmEduCertPlaceholderImageCID000000000000000000000",
        attributes: [
          { trait_type: "Microcredencial", value: courseTitle },
          { trait_type: "Course ID", value: courseId },
          { trait_type: "Student ID (hash)", value: studentIdHash },
          { trait_type: "Fecha de emisión", value: issueDate },
          { trait_type: "Créditos ECTS", value: String(ectsNum) },
          { trait_type: "Nivel EQF", value: String(eqfNum) },
          { trait_type: "Tipo de Evaluación", value: assessmentType ?? "" },
          { trait_type: "Modalidad", value: participationMode ?? "" },
          { trait_type: "Resultados de Aprendizaje", value: learningOutcomes ?? "" },
          { trait_type: "Rede", value: "Sepolia" },
          { trait_type: "Tipo", value: "Soulbound" },
        ],
        ...(resolvedEvidences.length > 0 ? { evidence: resolvedEvidences } : {}),
      };

      const ipfsUri = await uploadMetadata(metadata);
      const ipfsCid = ipfsUri.replace("ipfs://", "");

      // --- Claim-by-email flow ---
      if (!walletAddress) {
        if (!recipientEmail) {
          res.status(400).json({ error: "walletAddress or recipientEmail required" });
          return;
        }

        const claimToken = uuidv4();
        const record: ClaimRecord = {
          token: claimToken,
          recipientName,
          recipientEmail,
          courseTitle,
          courseId,
          studentIdHash,
          issueDate,
          ects: ectsNum,
          eqfLevel: eqfNum,
          assessmentType: assessmentType ?? "",
          participationMode: participationMode ?? "",
          learningOutcomes: learningOutcomes ?? "",
          evidences: resolvedEvidences,
          ipfsCid,
          expiresAt: makeExpiry(),
          createdAt: Date.now(),
        };

        saveClaim(record);

        // Send email — non-fatal if Resend not configured
        try {
          await sendClaimEmail({
            recipientName,
            recipientEmail,
            courseTitle,
            claimToken,
          });
        } catch (emailErr) {
          console.warn("[mint] email send failed (non-fatal):", emailErr);
        }

        res.status(201).json({ claimToken, ipfsCid, flow: "claim-by-email" });
        return;
      }

      // --- Direct wallet mint ---
      if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
        res.status(400).json({ error: "Invalid walletAddress" });
        return;
      }

      const { tokenId, txHash } = await mintCertificate(walletAddress, ipfsUri);

      res.status(201).json({ tokenId, txHash, ipfsCid, flow: "direct-mint" });
    } catch (err: unknown) {
      console.error("[mint error]", err);
      const message = err instanceof Error ? err.message : "Mint failed";
      res.status(500).json({ error: message });
    }
  }
);

export default router;
