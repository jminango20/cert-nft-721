import { Certificate } from "@prisma/client";
import { prisma } from "./prismaClient";
import { getTx } from "./TxIndex";

export interface CreateCertificateData {
  tokenId: number;
  txHash: string;
  recipientName: string;
  recipientEmail?: string | null;
  courseTitle: string;
  claimToken?: string | null;
  claimExpiresAt?: Date | null;
  claimedAt?: Date | null;
  claimedBy?: string | null;
  ipfsCid: string;
  ownerAddress?: string | null;
}

class CertificateRepository {
  private readonly prisma = prisma;

  async save(data: CreateCertificateData): Promise<Certificate> {
    return this.prisma.certificate.create({
      data: {
        tokenId: data.tokenId,
        txHash: data.txHash,
        recipientName: data.recipientName,
        recipientEmail: data.recipientEmail ?? null,
        courseTitle: data.courseTitle,
        claimToken: data.claimToken ?? null,
        claimExpiresAt: data.claimExpiresAt ?? null,
        claimedAt: data.claimedAt ?? null,
        claimedBy: data.claimedBy ?? null,
        ipfsCid: data.ipfsCid,
        ownerAddress: data.ownerAddress ?? null,
      },
    });
  }

  async findByTokenId(tokenId: number): Promise<Certificate | null> {
    return this.prisma.certificate.findUnique({
      where: { tokenId },
    });
  }

  async findAll(): Promise<Certificate[]> {
    return this.prisma.certificate.findMany({
      orderBy: { issuedAt: "desc" },
    });
  }

  async markRevoked(tokenId: number): Promise<void> {
    const existingTxHash = await getTx(tokenId.toString());
    await this.prisma.certificate.upsert({
      where: { tokenId },
      update: { revokedAt: new Date() },
      create: {
        tokenId,
        txHash: existingTxHash ?? "legacy",
        recipientName: "legacy",
        courseTitle: "legacy",
        ipfsCid: "legacy",
        revokedAt: new Date(),
      },
    });
  }

  async markClaimed(
    token: string,
    wallet: string,
    tokenId?: number,
    txHash?: string
  ): Promise<void> {
    await this.prisma.certificate.update({
      where: { claimToken: token },
      data: {
        claimedAt: new Date(),
        claimedBy: wallet,
        ownerAddress: wallet,
        ...(tokenId !== undefined ? { tokenId } : {}),
        ...(txHash !== undefined ? { txHash } : {}),
      },
    });
  }

  async findByClaimToken(token: string): Promise<Certificate | null> {
    return this.prisma.certificate.findUnique({
      where: { claimToken: token },
    });
  }
}

export const certificateRepository = new CertificateRepository();
