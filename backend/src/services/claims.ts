import fs from "fs";
import path from "path";
import { ClaimRecord } from "../types";

const CLAIMS_FILE = path.resolve(__dirname, "../../claims.json");
const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

// C2: All file I/O is async to avoid blocking the event loop
async function readAll(): Promise<Record<string, ClaimRecord>> {
  try {
    const content = await fs.promises.readFile(CLAIMS_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function writeAll(data: Record<string, ClaimRecord>): Promise<void> {
  await fs.promises.writeFile(CLAIMS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function saveClaim(record: ClaimRecord): Promise<void> {
  const all = await readAll();
  all[record.token] = record;
  await writeAll(all);
}

export async function getPendingClaims(): Promise<ClaimRecord[]> {
  const all = await readAll();
  return Object.values(all).filter(
    (record) => !record.claimed && Date.now() <= record.expiresAt
  );
}

export async function getClaim(token: string): Promise<ClaimRecord | null> {
  const all = await readAll();
  const record = all[token];
  if (!record) return null;
  if (Date.now() > record.expiresAt) return null;
  return record;
}

export async function associateWallet(
  token: string,
  walletAddress: string,
  tokenId?: string,
  txHash?: string
): Promise<ClaimRecord | null> {
  const all = await readAll();
  const record = all[token];
  if (!record) return null;
  if (Date.now() > record.expiresAt) return null;
  record.walletAddress = walletAddress;
  record.claimed = true;
  if (tokenId) record.tokenId = tokenId;
  if (txHash) record.txHash = txHash;
  all[token] = record;
  await writeAll(all);
  return record;
}

export function makeExpiry(): number {
  return Date.now() + TTL_MS;
}
