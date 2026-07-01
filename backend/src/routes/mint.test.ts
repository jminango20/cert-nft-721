/**
 * Unit / integration tests for POST /api/mint
 *
 * Strategy:
 *  - vi.mock stubs the service layer so no real blockchain or IPFS calls happen.
 *  - The requireApiKey middleware reads process.env.API_KEY.
 *  - supertest drives the Express router in-process.
 *  - Multipart fields are sent via supertest's .field() helper.
 *
 * Route contract (mint.ts):
 *  - Auth   : x-api-key header must match process.env.API_KEY
 *  - Input  : multipart/form-data with required fields
 *             recipientName, courseTitle, courseId, studentId, issueDate
 *             ects (non-negative number), eqfLevel (1-8)
 *             walletAddress (optional — if absent, recipientEmail required)
 *  - Output : 201 { tokenId, txHash, ipfsCid, flow: "direct-mint" } on direct mint
 *             201 { claimToken, ipfsCid, flow: "claim-by-email" } on email flow
 *             400 on validation failure
 *             401 when API key is missing / wrong
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";

// --- mock rate-limiter so tests never hit 429 ---
vi.mock("express-rate-limit", () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  rateLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// --- mock service modules BEFORE importing the router ---
vi.mock("../services/ipfs", () => ({
  uploadMetadata: vi.fn(),
  uploadBufferToIPFS: vi.fn(),
}));

vi.mock("../services/blockchain", () => ({
  mintCertificate: vi.fn(),
}));

vi.mock("../services/claims", () => ({
  saveClaim: vi.fn(),
  makeExpiry: vi.fn(() => Date.now() + 48 * 60 * 60 * 1000),
}));

vi.mock("../services/email", () => ({
  sendClaimEmail: vi.fn(),
}));

vi.mock("../services/CertificateRepository", () => ({
  certificateRepository: { save: vi.fn() },
}));

import { uploadMetadata } from "../services/ipfs";
import { mintCertificate } from "../services/blockchain";
import { saveClaim } from "../services/claims";
import { sendClaimEmail } from "../services/email";
import mintRouter from "./mint";

const mockedUploadMetadata = uploadMetadata as ReturnType<typeof vi.fn>;
const mockedMintCertificate = mintCertificate as ReturnType<typeof vi.fn>;
const mockedSaveClaim = saveClaim as ReturnType<typeof vi.fn>;
const mockedSendClaimEmail = sendClaimEmail as ReturnType<typeof vi.fn>;

const TEST_API_KEY = "test-api-key-mint-123";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/mint", mintRouter);
  return app;
}

/** Minimal valid direct-mint fields */
const validDirectMintFields = {
  recipientName: "Ana Silva",
  courseTitle: "Blockchain Fundamentals",
  courseId: "BC-101",
  studentId: "student-abc-001",
  issueDate: "2024-01-15",
  ects: "6",
  eqfLevel: "6",
  walletAddress: "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12",
};

/** Minimal valid claim-by-email fields (no walletAddress) */
const validClaimEmailFields = {
  recipientName: "Ana Silva",
  recipientEmail: "ana@example.com",
  courseTitle: "Blockchain Fundamentals",
  courseId: "BC-101",
  studentId: "student-abc-001",
  issueDate: "2024-01-15",
  ects: "6",
  eqfLevel: "6",
};

describe("POST /mint", () => {
  beforeEach(() => {
    process.env.API_KEY = TEST_API_KEY;
    vi.clearAllMocks();

    // Default happy-path stubs
    mockedUploadMetadata.mockResolvedValue("ipfs://QmFakeCID000000000000000");
    mockedMintCertificate.mockResolvedValue({ tokenId: "42", txHash: "0xdeadbeef" });
    mockedSaveClaim.mockReturnValue(undefined);
    mockedSendClaimEmail.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.API_KEY;
  });

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  it("returns 401 when x-api-key header is missing", async () => {
    const res = await request(buildApp())
      .post("/mint")
      .field("recipientName", "Ana Silva")
      .field("courseTitle", "BC")
      .field("courseId", "BC-101")
      .field("studentId", "s1")
      .field("issueDate", "2024-01-01")
      .field("ects", "6")
      .field("eqfLevel", "6")
      .field("walletAddress", "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12");

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(mockedMintCertificate).not.toHaveBeenCalled();
  });

  it("returns 401 when x-api-key is wrong", async () => {
    const res = await request(buildApp())
      .post("/mint")
      .set("x-api-key", "wrong-key")
      .field("recipientName", "Ana Silva")
      .field("courseTitle", "BC")
      .field("courseId", "BC-101")
      .field("studentId", "s1")
      .field("issueDate", "2024-01-01")
      .field("ects", "6")
      .field("eqfLevel", "6")
      .field("walletAddress", "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12");

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(mockedMintCertificate).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Input validation — missing required fields
  // ---------------------------------------------------------------------------

  it("returns 400 when recipientName is missing", async () => {
    const res = await request(buildApp())
      .post("/mint")
      .set("x-api-key", TEST_API_KEY)
      .field("courseTitle", "BC")
      .field("courseId", "BC-101")
      .field("studentId", "s1")
      .field("issueDate", "2024-01-01")
      .field("ects", "6")
      .field("eqfLevel", "6")
      .field("walletAddress", "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12");

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when courseTitle is missing", async () => {
    const res = await request(buildApp())
      .post("/mint")
      .set("x-api-key", TEST_API_KEY)
      .field("recipientName", "Ana Silva")
      .field("courseId", "BC-101")
      .field("studentId", "s1")
      .field("issueDate", "2024-01-01")
      .field("ects", "6")
      .field("eqfLevel", "6")
      .field("walletAddress", "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12");

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when courseId is missing", async () => {
    const res = await request(buildApp())
      .post("/mint")
      .set("x-api-key", TEST_API_KEY)
      .field("recipientName", "Ana Silva")
      .field("courseTitle", "BC")
      .field("studentId", "s1")
      .field("issueDate", "2024-01-01")
      .field("ects", "6")
      .field("eqfLevel", "6")
      .field("walletAddress", "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12");

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when studentId is missing", async () => {
    const res = await request(buildApp())
      .post("/mint")
      .set("x-api-key", TEST_API_KEY)
      .field("recipientName", "Ana Silva")
      .field("courseTitle", "BC")
      .field("courseId", "BC-101")
      .field("issueDate", "2024-01-01")
      .field("ects", "6")
      .field("eqfLevel", "6")
      .field("walletAddress", "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12");

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when issueDate is missing", async () => {
    const res = await request(buildApp())
      .post("/mint")
      .set("x-api-key", TEST_API_KEY)
      .field("recipientName", "Ana Silva")
      .field("courseTitle", "BC")
      .field("courseId", "BC-101")
      .field("studentId", "s1")
      .field("ects", "6")
      .field("eqfLevel", "6")
      .field("walletAddress", "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12");

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Input validation — invalid ects / eqfLevel
  // ---------------------------------------------------------------------------

  it("returns 400 when ects is not a number", async () => {
    const res = await request(buildApp())
      .post("/mint")
      .set("x-api-key", TEST_API_KEY)
      .field("recipientName", "Ana Silva")
      .field("courseTitle", "BC")
      .field("courseId", "BC-101")
      .field("studentId", "s1")
      .field("issueDate", "2024-01-01")
      .field("ects", "invalid")
      .field("eqfLevel", "6")
      .field("walletAddress", "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12");

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when ects is negative", async () => {
    const res = await request(buildApp())
      .post("/mint")
      .set("x-api-key", TEST_API_KEY)
      .field("recipientName", "Ana Silva")
      .field("courseTitle", "BC")
      .field("courseId", "BC-101")
      .field("studentId", "s1")
      .field("issueDate", "2024-01-01")
      .field("ects", "-1")
      .field("eqfLevel", "6")
      .field("walletAddress", "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12");

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when eqfLevel is 0 (below valid range)", async () => {
    const res = await request(buildApp())
      .post("/mint")
      .set("x-api-key", TEST_API_KEY)
      .field("recipientName", "Ana Silva")
      .field("courseTitle", "BC")
      .field("courseId", "BC-101")
      .field("studentId", "s1")
      .field("issueDate", "2024-01-01")
      .field("ects", "6")
      .field("eqfLevel", "0")
      .field("walletAddress", "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12");

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when eqfLevel is 9 (above valid range)", async () => {
    const res = await request(buildApp())
      .post("/mint")
      .set("x-api-key", TEST_API_KEY)
      .field("recipientName", "Ana Silva")
      .field("courseTitle", "BC")
      .field("courseId", "BC-101")
      .field("studentId", "s1")
      .field("issueDate", "2024-01-01")
      .field("ects", "6")
      .field("eqfLevel", "9")
      .field("walletAddress", "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12");

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when eqfLevel is not a number", async () => {
    const res = await request(buildApp())
      .post("/mint")
      .set("x-api-key", TEST_API_KEY)
      .field("recipientName", "Ana Silva")
      .field("courseTitle", "BC")
      .field("courseId", "BC-101")
      .field("studentId", "s1")
      .field("issueDate", "2024-01-01")
      .field("ects", "6")
      .field("eqfLevel", "abc")
      .field("walletAddress", "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12");

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Input validation — invalid walletAddress
  // ---------------------------------------------------------------------------

  it("returns 400 when walletAddress is not a valid Ethereum address", async () => {
    const res = await request(buildApp())
      .post("/mint")
      .set("x-api-key", TEST_API_KEY)
      .field("recipientName", "Ana Silva")
      .field("courseTitle", "BC")
      .field("courseId", "BC-101")
      .field("studentId", "s1")
      .field("issueDate", "2024-01-01")
      .field("ects", "6")
      .field("eqfLevel", "6")
      .field("walletAddress", "not-a-wallet");

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockedMintCertificate).not.toHaveBeenCalled();
  });

  it("returns 400 when walletAddress is too short", async () => {
    const res = await request(buildApp())
      .post("/mint")
      .set("x-api-key", TEST_API_KEY)
      .field("recipientName", "Ana Silva")
      .field("courseTitle", "BC")
      .field("courseId", "BC-101")
      .field("studentId", "s1")
      .field("issueDate", "2024-01-01")
      .field("ects", "6")
      .field("eqfLevel", "6")
      .field("walletAddress", "0x1234");

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockedMintCertificate).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Claim-by-email flow — missing email when walletAddress is absent
  // ---------------------------------------------------------------------------

  it("returns 400 when walletAddress is absent and recipientEmail is also absent", async () => {
    const res = await request(buildApp())
      .post("/mint")
      .set("x-api-key", TEST_API_KEY)
      .field("recipientName", "Ana Silva")
      .field("courseTitle", "BC")
      .field("courseId", "BC-101")
      .field("studentId", "s1")
      .field("issueDate", "2024-01-01")
      .field("ects", "6")
      .field("eqfLevel", "6");
    // no walletAddress, no recipientEmail

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockedMintCertificate).not.toHaveBeenCalled();
    expect(mockedSaveClaim).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Happy path — direct wallet mint
  // ---------------------------------------------------------------------------

  it("returns 201 with tokenId, txHash, and ipfsCid on direct mint", async () => {
    mockedUploadMetadata.mockResolvedValueOnce("ipfs://QmSuccessCID0000000000");
    mockedMintCertificate.mockResolvedValueOnce({ tokenId: "7", txHash: "0xcafebabe" });

    const res = await request(buildApp())
      .post("/mint")
      .set("x-api-key", TEST_API_KEY)
      .field("recipientName", validDirectMintFields.recipientName)
      .field("courseTitle", validDirectMintFields.courseTitle)
      .field("courseId", validDirectMintFields.courseId)
      .field("studentId", validDirectMintFields.studentId)
      .field("issueDate", validDirectMintFields.issueDate)
      .field("ects", validDirectMintFields.ects)
      .field("eqfLevel", validDirectMintFields.eqfLevel)
      .field("walletAddress", validDirectMintFields.walletAddress);

    expect(res.status).toBe(201);
    expect(res.body.tokenId).toBe("7");
    expect(res.body.txHash).toBe("0xcafebabe");
    expect(res.body.ipfsCid).toBe("QmSuccessCID0000000000");
    expect(res.body.flow).toBe("direct-mint");
    expect(mockedUploadMetadata).toHaveBeenCalledOnce();
    expect(mockedMintCertificate).toHaveBeenCalledOnce();
    expect(mockedMintCertificate).toHaveBeenCalledWith(
      validDirectMintFields.walletAddress,
      "ipfs://QmSuccessCID0000000000"
    );
  });

  // ---------------------------------------------------------------------------
  // Happy path — claim-by-email flow
  // ---------------------------------------------------------------------------

  it("returns 201 with claimToken and flow:claim-by-email when walletAddress is absent", async () => {
    mockedUploadMetadata.mockResolvedValueOnce("ipfs://QmClaimCID00000000000");

    const res = await request(buildApp())
      .post("/mint")
      .set("x-api-key", TEST_API_KEY)
      .field("recipientName", validClaimEmailFields.recipientName)
      .field("recipientEmail", validClaimEmailFields.recipientEmail)
      .field("courseTitle", validClaimEmailFields.courseTitle)
      .field("courseId", validClaimEmailFields.courseId)
      .field("studentId", validClaimEmailFields.studentId)
      .field("issueDate", validClaimEmailFields.issueDate)
      .field("ects", validClaimEmailFields.ects)
      .field("eqfLevel", validClaimEmailFields.eqfLevel);

    expect(res.status).toBe(201);
    expect(res.body.claimToken).toBeDefined();
    expect(typeof res.body.claimToken).toBe("string");
    expect(res.body.ipfsCid).toBe("QmClaimCID00000000000");
    expect(res.body.flow).toBe("claim-by-email");
    expect(mockedMintCertificate).not.toHaveBeenCalled();
    expect(mockedSaveClaim).toHaveBeenCalledOnce();
  });
});
