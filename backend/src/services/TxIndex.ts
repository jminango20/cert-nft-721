import fs from "fs";
import path from "path";

const TX_FILE = path.resolve(__dirname, "../../tx-index.json");

// C2: All file I/O is async to avoid blocking the event loop
async function readAll(): Promise<Record<string, string>> {
  try {
    const content = await fs.promises.readFile(TX_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export async function saveTx(tokenId: string, txHash: string): Promise<void> {
  const all = await readAll();
  all[tokenId] = txHash;
  await fs.promises.writeFile(TX_FILE, JSON.stringify(all, null, 2), "utf-8");
}

export async function getTx(tokenId: string): Promise<string | null> {
  const all = await readAll();
  return all[tokenId] ?? null;
}

// Exported for certificates.ts to list all token IDs
export async function getAllTx(): Promise<Record<string, string>> {
  return readAll();
}
