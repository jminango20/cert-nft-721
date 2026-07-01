import { prisma } from "./prismaClient";

export async function saveTx(tokenId: string, txHash: string): Promise<void> {
  await prisma.txIndexEntry.upsert({
    where: { tokenId },
    update: { txHash },
    create: { tokenId, txHash },
  });
}

export async function getTx(tokenId: string): Promise<string | null> {
  const entry = await prisma.txIndexEntry.findUnique({ where: { tokenId } });
  return entry?.txHash ?? null;
}

// Exported for certificates.ts to list all token IDs
export async function getAllTx(): Promise<Record<string, string>> {
  const entries = await prisma.txIndexEntry.findMany();
  const result: Record<string, string> = {};
  for (const entry of entries) {
    result[entry.tokenId] = entry.txHash;
  }
  return result;
}
