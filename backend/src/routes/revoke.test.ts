/**
 * Unit / integration tests for POST /revoke
 *
 * Strategy:
 *  - vi.mock stubs revokeCertificate so no blockchain connection is needed.
 *  - The requireApiKey middleware reads process.env.API_KEY; we set it to a
 *    known value ("test-key") via vi.stubEnv (or directly on process.env).
 *  - supertest drives the Express router in-process.
 *
 * Route contract (revoke.ts):
 *  - Input  : { tokenId: number (integer, positive) }
 *  - Auth   : x-api-key header must match process.env.API_KEY
 *  - Output : 200 { txHash, tokenId } on success
 *             400 { error, details } on validation failure
 *             401 { error } when API key is missing / wrong
 *             5xx / custom status when revokeCertificate throws
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";

// --- mock the blockchain service BEFORE importing the router ---
vi.mock("../services/blockchain", () => ({
  revokeCertificate: vi.fn(),
}));

vi.mock("../services/CertificateRepository", () => ({
  certificateRepository: { markRevoked: vi.fn() },
}));

import { revokeCertificate } from "../services/blockchain";
import revokeRouter from "./revoke";

const mockedRevoke = revokeCertificate as ReturnType<typeof vi.fn>;

const TEST_API_KEY = "test-api-key-123";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/revoke", revokeRouter);
  return app;
}

describe("POST /revoke", () => {
  beforeEach(() => {
    process.env.API_KEY = TEST_API_KEY;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.API_KEY;
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  it("returns 200 with txHash and tokenId when revoke succeeds", async () => {
    mockedRevoke.mockResolvedValueOnce({ txHash: "0xabc123" });

    const res = await request(buildApp())
      .post("/revoke")
      .set("x-api-key", TEST_API_KEY)
      .send({ tokenId: 42 });

    expect(res.status).toBe(200);
    expect(res.body.txHash).toBe("0xabc123");
    expect(res.body.tokenId).toBe(42);
    expect(mockedRevoke).toHaveBeenCalledOnce();
    expect(mockedRevoke).toHaveBeenCalledWith(42);
  });

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  it("returns 401 when x-api-key header is missing", async () => {
    const res = await request(buildApp())
      .post("/revoke")
      .send({ tokenId: 1 });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(mockedRevoke).not.toHaveBeenCalled();
  });

  it("returns 401 when x-api-key is wrong", async () => {
    const res = await request(buildApp())
      .post("/revoke")
      .set("x-api-key", "wrong-key")
      .send({ tokenId: 1 });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(mockedRevoke).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Input validation — invalid tokenId values
  // ---------------------------------------------------------------------------

  it("returns 400 when tokenId is a string (non-numeric)", async () => {
    const res = await request(buildApp())
      .post("/revoke")
      .set("x-api-key", TEST_API_KEY)
      .send({ tokenId: "abc" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockedRevoke).not.toHaveBeenCalled();
  });

  it("returns 400 when tokenId is zero", async () => {
    const res = await request(buildApp())
      .post("/revoke")
      .set("x-api-key", TEST_API_KEY)
      .send({ tokenId: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockedRevoke).not.toHaveBeenCalled();
  });

  it("returns 400 when tokenId is negative", async () => {
    const res = await request(buildApp())
      .post("/revoke")
      .set("x-api-key", TEST_API_KEY)
      .send({ tokenId: -5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockedRevoke).not.toHaveBeenCalled();
  });

  it("returns 400 when tokenId is a float", async () => {
    const res = await request(buildApp())
      .post("/revoke")
      .set("x-api-key", TEST_API_KEY)
      .send({ tokenId: 1.5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockedRevoke).not.toHaveBeenCalled();
  });

  it("returns 400 when tokenId is missing from body", async () => {
    const res = await request(buildApp())
      .post("/revoke")
      .set("x-api-key", TEST_API_KEY)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockedRevoke).not.toHaveBeenCalled();
  });

  it("returns 400 when body is empty", async () => {
    const res = await request(buildApp())
      .post("/revoke")
      .set("x-api-key", TEST_API_KEY);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockedRevoke).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Contract error propagation
  // ---------------------------------------------------------------------------

  it("propagates a 403 status when contract throws 'not owner'", async () => {
    mockedRevoke.mockRejectedValueOnce(
      Object.assign(new Error("caller is not the owner"), { status: 403 })
    );

    const res = await request(buildApp())
      .post("/revoke")
      .set("x-api-key", TEST_API_KEY)
      .send({ tokenId: 7 });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Revoke failed");
  });

  it("propagates a 409 status when contract throws 'already revoked'", async () => {
    mockedRevoke.mockRejectedValueOnce(
      Object.assign(new Error("Certificate already revoked"), { status: 409 })
    );

    const res = await request(buildApp())
      .post("/revoke")
      .set("x-api-key", TEST_API_KEY)
      .send({ tokenId: 3 });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Revoke failed");
  });

  it("returns 404 when contract throws token-not-found error", async () => {
    mockedRevoke.mockRejectedValueOnce(
      Object.assign(new Error("Token does not exist"), { status: 404 })
    );

    const res = await request(buildApp())
      .post("/revoke")
      .set("x-api-key", TEST_API_KEY)
      .send({ tokenId: 999 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Revoke failed");
  });

  it("returns 500 with default message when contract throws a plain Error", async () => {
    mockedRevoke.mockRejectedValueOnce(new Error("unexpected RPC error"));

    const res = await request(buildApp())
      .post("/revoke")
      .set("x-api-key", TEST_API_KEY)
      .send({ tokenId: 1 });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Blockchain operation failed");
  });

  it("returns 500 with fallback message when contract throws a non-Error object", async () => {
    // Some libraries throw plain objects without a message property
    mockedRevoke.mockRejectedValueOnce({ code: "NETWORK_ERROR" });

    const res = await request(buildApp())
      .post("/revoke")
      .set("x-api-key", TEST_API_KEY)
      .send({ tokenId: 1 });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Blockchain operation failed");
  });
});
