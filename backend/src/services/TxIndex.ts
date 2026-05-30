import fs from "fs";
import path from "path";

const TX_FILE = path.resolve(process.cwd(), "tx-index.json");

export function readAll(): Record<string, string> {
  if (!fs.existsSync(TX_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(TX_FILE, "utf-8"));
  } catch {
    return {};
  }
}

export function saveTx(tokenId: string, txHash: string): void {
  const all = readAll();
  all[tokenId] = txHash;
  fs.writeFileSync(TX_FILE, JSON.stringify(all, null, 2), "utf-8");
}

export function getTx(tokenId: string): string | null {
  return readAll()[tokenId] ?? null;
}
