/**
 * Unit / integration tests for GET and POST /api/claim/:token
 *
 * Strategy:
 *  - vi.mock stubs claims service and blockchain service.
 *  - supertest drives the Express router in-process.
 *  - No filesystem or blockchain interactions occur.
 *
 * Route contract (claim.ts):
 *  - GET  /:token → 200 { courseTitle, courseId, … } (no email, no studentIdHash)
 *                 → 404 when token not found or expired
 *  - POST /:token → 201 { tokenId, txHash, ipfsCid } on success
 *                 → 400 when walletAddress is invalid
 *                 → 404 when token not found
 *                 → 409 when certificate already claimed
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";

// --- mock service modules BEFORE importing the router ---
vi.mock("../services/claims", () => ({
  getClaim: vi.fn(),
  associateWallet: vi.fn(),
}));

vi.mock("../services/blockchain", () => ({
  mintCertificate: vi.fn(),
}));

import { getClaim, associateWallet } from "../services/claims";
import { mintCertificate } from "../services/blockchain";
import claimRouter from "./claim";

const mockedGetClaim = getClaim as ReturnType<typeof vi.fn>;
const mockedAssociateWallet = associateWallet as ReturnType<typeof vi.fn>;
const mockedMintCertificate = mintCertificate as ReturnType<typeof vi.fn>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/claim", claimRouter);
  return app;
}

/** A typical claim record returned by getClaim */
const fakeClaimRecord = {
  token: "valid-claim-token-uuid",
  recipientName: "Ana Silva",
  recipientEmail: "ana@example.com",
  courseTitle: "Blockchain Fundamentals",
  courseId: "BC-101",
  studentIdHash: "0xdeadbeef000000000000000000000000000000000000000000000000deadbeef",
  issueDate: "2024-01-15",
  ects: 6,
  eqfLevel: 6,
  assessmentType: "Examen",
  participationMode: "Online",
  learningOutcomes: "Understand distributed ledgers",
  evidences: [],
  ipfsCid: "QmFakeCID000000000000000000000000000000000000000",
  walletAddress: null,
  claimed: false,
  expiresAt: Date.now() + 48 * 60 * 60 * 1000,
  createdAt: Date.now(),
};

describe("GET /claim/:token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 404 when claim token does not exist", async () => {
    mockedGetClaim.mockReturnValueOnce(null);

    const res = await request(buildApp()).get("/claim/nonexistent-token");

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(mockedGetClaim).toHaveBeenCalledWith("nonexistent-token");
  });

  it("returns 200 with certificate data when token is valid", async () => {
    mockedGetClaim.mockReturnValueOnce(fakeClaimRecord);

    const res = await request(buildApp()).get("/claim/valid-claim-token-uuid");

    expect(res.status).toBe(200);
    expect(res.body.courseTitle).toBe("Blockchain Fundamentals");
    expect(res.body.courseId).toBe("BC-101");
    expect(res.body.issueDate).toBe("2024-01-15");
    expect(res.body.ects).toBe(6);
    expect(res.body.eqfLevel).toBe(6);
    expect(res.body.ipfsCid).toBe("QmFakeCID000000000000000000000000000000000000000");
  });

  it("does NOT expose recipientEmail in GET response", async () => {
    mockedGetClaim.mockReturnValueOnce(fakeClaimRecord);

    const res = await request(buildApp()).get("/claim/valid-claim-token-uuid");

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("recipientEmail");
    expect(res.body).not.toHaveProperty("email");
  });

  it("does NOT expose studentIdHash in GET response", async () => {
    mockedGetClaim.mockReturnValueOnce(fakeClaimRecord);

    const res = await request(buildApp()).get("/claim/valid-claim-token-uuid");

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("studentIdHash");
  });

  it("includes alreadyClaimed: false for unclaimed token", async () => {
    mockedGetClaim.mockReturnValueOnce({ ...fakeClaimRecord, claimed: false });

    const res = await request(buildApp()).get("/claim/valid-claim-token-uuid");

    expect(res.status).toBe(200);
    expect(res.body.alreadyClaimed).toBe(false);
  });

  it("includes alreadyClaimed: true for already claimed token", async () => {
    mockedGetClaim.mockReturnValueOnce({
      ...fakeClaimRecord,
      claimed: true,
      walletAddress: "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12",
      tokenId: "10",
    });

    const res = await request(buildApp()).get("/claim/valid-claim-token-uuid");

    expect(res.status).toBe(200);
    expect(res.body.alreadyClaimed).toBe(true);
  });
});

describe("POST /claim/:token", () => {
  const VALID_WALLET = "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12";

  beforeEach(() => {
    vi.clearAllMocks();
    mockedMintCertificate.mockResolvedValue({ tokenId: "42", txHash: "0xcafebabe" });
    mockedAssociateWallet.mockReturnValue({
      ...fakeClaimRecord,
      walletAddress: VALID_WALLET,
      claimed: true,
      tokenId: "42",
      txHash: "0xcafebabe",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Input validation — invalid walletAddress
  // ---------------------------------------------------------------------------

  it("returns 400 when walletAddress is missing from body", async () => {
    const res = await request(buildApp())
      .post("/claim/valid-claim-token-uuid")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockedMintCertificate).not.toHaveBeenCalled();
  });

  it("returns 400 when walletAddress is not a valid Ethereum address", async () => {
    const res = await request(buildApp())
      .post("/claim/valid-claim-token-uuid")
      .send({ walletAddress: "not-a-wallet" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockedMintCertificate).not.toHaveBeenCalled();
  });

  it("returns 400 when walletAddress is too short (not 42 chars)", async () => {
    const res = await request(buildApp())
      .post("/claim/valid-claim-token-uuid")
      .send({ walletAddress: "0x1234abcd" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockedMintCertificate).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Token not found
  // ---------------------------------------------------------------------------

  it("returns 404 when claim token does not exist", async () => {
    mockedGetClaim.mockReturnValueOnce(null);

    const res = await request(buildApp())
      .post("/claim/nonexistent-token")
      .send({ walletAddress: VALID_WALLET });

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(mockedMintCertificate).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Already claimed
  // ---------------------------------------------------------------------------

  it("returns 409 when certificate has already been claimed", async () => {
    mockedGetClaim.mockReturnValueOnce({
      ...fakeClaimRecord,
      claimed: true,
      walletAddress: "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12",
      tokenId: "10",
    });

    const res = await request(buildApp())
      .post("/claim/valid-claim-token-uuid")
      .send({ walletAddress: VALID_WALLET });

    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
    expect(mockedMintCertificate).not.toHaveBeenCalled();
  });

  it("returns 409 when walletAddress is already associated (claimed=false but walletAddress set)", async () => {
    mockedGetClaim.mockReturnValueOnce({
      ...fakeClaimRecord,
      claimed: false,
      walletAddress: "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12",
    });

    const res = await request(buildApp())
      .post("/claim/valid-claim-token-uuid")
      .send({ walletAddress: VALID_WALLET });

    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
    expect(mockedMintCertificate).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  it("returns 201 with tokenId, txHash, and ipfsCid on successful claim", async () => {
    mockedGetClaim.mockReturnValueOnce(fakeClaimRecord);
    mockedMintCertificate.mockResolvedValueOnce({ tokenId: "42", txHash: "0xcafebabe" });

    const res = await request(buildApp())
      .post("/claim/valid-claim-token-uuid")
      .send({ walletAddress: VALID_WALLET });

    expect(res.status).toBe(201);
    expect(res.body.tokenId).toBe("42");
    expect(res.body.txHash).toBe("0xcafebabe");
    expect(res.body.ipfsCid).toBe("QmFakeCID000000000000000000000000000000000000000");
    expect(mockedMintCertificate).toHaveBeenCalledOnce();
    expect(mockedMintCertificate).toHaveBeenCalledWith(
      VALID_WALLET,
      `ipfs://${fakeClaimRecord.ipfsCid}`
    );
    expect(mockedAssociateWallet).toHaveBeenCalledOnce();
    expect(mockedAssociateWallet).toHaveBeenCalledWith(
      "valid-claim-token-uuid",
      VALID_WALLET,
      "42",
      "0xcafebabe"
    );
  });

  it("returns 500 when mintCertificate throws an error", async () => {
    mockedGetClaim.mockReturnValueOnce(fakeClaimRecord);
    mockedMintCertificate.mockRejectedValueOnce(new Error("RPC timeout"));

    const res = await request(buildApp())
      .post("/claim/valid-claim-token-uuid")
      .send({ walletAddress: VALID_WALLET });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("RPC timeout");
    expect(mockedAssociateWallet).not.toHaveBeenCalled();
  });
});
