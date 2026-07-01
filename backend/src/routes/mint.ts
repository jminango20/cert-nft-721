import { Router, Request, Response } from "express";
import multer from "multer";
import { keccak256, toUtf8Bytes } from "ethers";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { requireApiKey } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { uploadMetadata, uploadBufferToIPFS } from "../services/ipfs";
import { mintCertificate } from "../services/blockchain";
import { saveClaim, makeExpiry } from "../services/claims";
import { sendClaimEmail } from "../services/email";
import { certificateRepository } from "../services/CertificateRepository";
import { CertificateMetadata, EvidenceItem, ClaimRecord } from "../types";

const MintSchema = z
  .object({
    recipientName: z.string().trim().min(1, "recipientName is required"),
    recipientEmail: z
      .string()
      .trim()
      .email("Invalid email")
      .optional()
      .or(z.literal("")),
    courseTitle: z.string().trim().min(1, "courseTitle is required"),
    courseId: z.string().trim().min(1, "courseId is required"),
    studentId: z.string().trim().min(1, "studentId is required"),
    issueDate: z
      .string()
      .trim()
      .min(1, "issueDate is required")
      .refine((val) => !isNaN(Date.parse(val)), { message: "issueDate must be a valid date string" }),
    ects: z
      .union([
        z.number().min(0),
        z
          .string()
          .regex(/^\d+(\.\d+)?$/, "ects must be a non-negative number")
          .transform(Number),
      ])
      .refine((n) => !isNaN(n) && n >= 0, {
        message: "ects must be a non-negative number",
      }),
    eqfLevel: z
      .union([
        z.number().int(),
        z.string().regex(/^\d+$/).transform(Number),
      ])
      .refine((n) => Number.isInteger(n) && n >= 1 && n <= 8, {
        message: "eqfLevel must be 1-8",
      }),
    assessmentType: z.string().trim().optional().default(""),
    participationMode: z.string().trim().optional().default(""),
    learningOutcomes: z.string().trim().optional().default(""),
    walletAddress: z
      .string()
      .trim()
      .regex(/^0x[0-9a-fA-F]{40}$/, "Invalid walletAddress")
      .optional(),
  })
  .passthrough();

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
 *   studentId, issueDate, ects, eqfLevel (1-8),
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
  validate(MintSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // --- Fields are validated and coerced by the Zod schema above ---
      const {
        recipientName,
        recipientEmail,
        courseTitle,
        courseId,
        studentId,
        issueDate,
        ects: ectsNum,
        eqfLevel: eqfNum,
        assessmentType,
        participationMode,
        learningOutcomes,
        walletAddress,
      } = req.body as {
        recipientName: string;
        recipientEmail?: string;
        courseTitle: string;
        courseId: string;
        studentId: string;
        issueDate: string;
        ects: number;
        eqfLevel: number;
        assessmentType: string;
        participationMode: string;
        learningOutcomes: string;
        walletAddress?: string;
      };

      // Compute hash internally — plain studentId never leaves this function
      const studentIdHash = keccak256(toUtf8Bytes(studentId));

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
        const fileHash = keccak256(file.buffer);

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
        const expiresAt = makeExpiry();
        const record: ClaimRecord = {
          token: claimToken,
          recipientName,
          // recipientEmail is NOT stored in claims.json (GDPR — personal data stays in SQLite only)
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
          walletAddress: null,
          claimed: false,
          expiresAt,
          createdAt: Date.now(),
        };

        await saveClaim(record);

        // Send email using recipientEmail from request body (not from claims.json — GDPR)
        try {
          await sendClaimEmail({
            recipientName,
            recipientEmail: recipientEmail!,
            courseTitle,
            claimToken,
          });
        } catch (emailErr) {
          console.warn("[mint] email send failed (non-fatal):", emailErr);
        }

        res.status(201).json({ claimToken, ipfsCid, flow: "claim-by-email" });
        return;
      }

      // --- Direct wallet mint (walletAddress already validated by Zod schema) ---

      const { tokenId, txHash } = await mintCertificate(walletAddress, ipfsUri);

      // Persist to SQLite
      try {
        await certificateRepository.save({
          tokenId: Number(tokenId),
          txHash,
          recipientName,
          recipientEmail: recipientEmail ?? null,
          courseTitle,
          claimToken: null,
          claimExpiresAt: null,
          ipfsCid,
          ownerAddress: walletAddress,
        });
      } catch (dbErr) {
        console.warn("[mint] DB save failed (non-fatal):", dbErr);
      }

      res.status(201).json({ tokenId, txHash, ipfsCid, flow: "direct-mint" });
    } catch (err: unknown) {
      console.error("[mint error]", err);
      const message = err instanceof Error ? err.message : "Mint failed";
      res.status(500).json({ error: message });
    }
  }
);

export default router;
