import fs from "fs";
import path from "path";
import { ClaimRecord } from "../types";

const CLAIMS_FILE = path.resolve(process.cwd(), "claims.json");
const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

function readAll(): Record<string, ClaimRecord> {
  if (!fs.existsSync(CLAIMS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CLAIMS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, ClaimRecord>): void {
  fs.writeFileSync(CLAIMS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function saveClaim(record: ClaimRecord): void {
  const all = readAll();
  all[record.token] = record;
  writeAll(all);
}

export function getClaim(token: string): ClaimRecord | null {
  const all = readAll();
  const record = all[token];
  if (!record) return null;
  if (Date.now() > record.expiresAt) return null;
  return record;
}

export function associateWallet(token: string, walletAddress: string, tokenId?: string, txHash?: string): ClaimRecord | null {
  const all = readAll();
  const record = all[token];
  if (!record) return null;
  if (Date.now() > record.expiresAt) return null;
  record.walletAddress = walletAddress;
  record.claimed = true;
  if (tokenId) record.tokenId = tokenId;
  if (txHash) record.txHash = txHash;
  all[token] = record;
  writeAll(all);
  return record;
}

export function makeExpiry(): number {
  return Date.now() + TTL_MS;
}
