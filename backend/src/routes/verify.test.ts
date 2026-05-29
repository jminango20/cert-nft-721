/**
 * Unit / integration tests for GET /verify/:tokenId
 *
 * Strategy:
 *  - vi.mock stubs getCertificateInfo so no blockchain connection is needed.
 *  - vi.stubGlobal replaces the global fetch so no live IPFS request is made.
 *  - supertest drives the Express router in-process.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";

// --- mock the blockchain service BEFORE importing the router ---
vi.mock("../services/blockchain", () => ({
  getCertificateInfo: vi.fn(),
}));

import { getCertificateInfo } from "../services/blockchain";
import verifyRouter from "./verify";

const mockedGetCertificateInfo = getCertificateInfo as ReturnType<typeof vi.fn>;

function buildApp() {
  const app = express();
  app.use("/verify", verifyRouter);
  return app;
}

describe("ipfsToHttp conversion inside GET /verify/:tokenId", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("converts ipfs:// URI to Pinata gateway URL and populates metadata", async () => {
    const fakeMetadata = { name: "Test", description: "Cert" };

    mockedGetCertificateInfo.mockResolvedValueOnce({
      tokenId: "1",
      owner: "0xABCD",
      isRevoked: false,
      isLocked: true,
      tokenURI: "ipfs://QmFakeHash123",
      metadata: null,
    });

    // Stub global fetch — must return a Response-like object
    const fetchStub = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => fakeMetadata,
    } as unknown as Response);

    vi.stubGlobal("fetch", fetchStub);

    const res = await request(buildApp()).get("/verify/1");

    expect(res.status).toBe(200);

    // metadata must not be null
    expect(res.body.metadata).not.toBeNull();
    expect(res.body.metadata).toEqual(fakeMetadata);

    // fetch was called with the Pinata gateway URL, not the ipfs:// URI
    expect(fetchStub).toHaveBeenCalledOnce();
    const calledUrl: string = fetchStub.mock.calls[0][0] as string;
    expect(calledUrl).toBe(
      "https://gateway.pinata.cloud/ipfs/QmFakeHash123"
    );
    expect(calledUrl).not.toMatch(/^ipfs:\/\//);
  });

  it("does NOT modify an https:// URI and still populates metadata", async () => {
    const fakeMetadata = { name: "HTTPS Test", description: "Direct cert" };

    mockedGetCertificateInfo.mockResolvedValueOnce({
      tokenId: "2",
      owner: "0xDEAD",
      isRevoked: false,
      isLocked: true,
      tokenURI: "https://example.com/meta/2.json",
      metadata: null,
    });

    const fetchStub = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => fakeMetadata,
    } as unknown as Response);

    vi.stubGlobal("fetch", fetchStub);

    const res = await request(buildApp()).get("/verify/2");

    expect(res.status).toBe(200);
    expect(res.body.metadata).toEqual(fakeMetadata);

    // URL passed to fetch must be unchanged
    const calledUrl: string = fetchStub.mock.calls[0][0] as string;
    expect(calledUrl).toBe("https://example.com/meta/2.json");
  });

  it("returns metadata: null when the fetch call fails (best-effort)", async () => {
    mockedGetCertificateInfo.mockResolvedValueOnce({
      tokenId: "3",
      owner: "0xBEEF",
      isRevoked: false,
      isLocked: true,
      tokenURI: "ipfs://QmBrokenHash",
      metadata: null,
    });

    // fetch throws a network error
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("Network error")));

    const res = await request(buildApp()).get("/verify/3");

    expect(res.status).toBe(200);
    // metadata stays null — best-effort catch in the route
    expect(res.body.metadata).toBeNull();
  });

  it("returns 400 for non-numeric tokenId", async () => {
    const res = await request(buildApp()).get("/verify/abc");
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 for tokenId = 0", async () => {
    const res = await request(buildApp()).get("/verify/0");
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 404 when getCertificateInfo throws a 404 error", async () => {
    mockedGetCertificateInfo.mockRejectedValueOnce(
      Object.assign(new Error("Token does not exist"), { status: 404 })
    );

    const res = await request(buildApp()).get("/verify/999");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Token does not exist");
  });
});
