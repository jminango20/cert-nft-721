import { Prisma } from "@prisma/client";
import { prisma } from "./prismaClient";
import { ClaimRecord, EvidenceItem } from "../types";

const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

function toClaimRecord(row: {
  token: string;
  recipientName: string;
  courseTitle: string;
  courseId: string;
  studentIdHash: string;
  issueDate: string;
  ects: number;
  eqfLevel: number;
  assessmentType: string;
  participationMode: string;
  learningOutcomes: string;
  evidences: Prisma.JsonValue;
  ipfsCid: string | null;
  walletAddress: string | null;
  claimed: boolean;
  tokenId: string | null;
  txHash: string | null;
  expiresAt: Date;
  createdAt: Date;
}): ClaimRecord {
  return {
    token: row.token,
    recipientName: row.recipientName,
    courseTitle: row.courseTitle,
    courseId: row.courseId,
    studentIdHash: row.studentIdHash,
    issueDate: row.issueDate,
    ects: row.ects,
    eqfLevel: row.eqfLevel,
    assessmentType: row.assessmentType,
    participationMode: row.participationMode,
    learningOutcomes: row.learningOutcomes,
    evidences: (row.evidences ?? []) as unknown as EvidenceItem[],
    ipfsCid: row.ipfsCid ?? undefined,
    walletAddress: row.walletAddress,
    claimed: row.claimed,
    tokenId: row.tokenId ?? undefined,
    txHash: row.txHash ?? undefined,
    expiresAt: row.expiresAt.getTime(),
    createdAt: row.createdAt.getTime(),
  };
}

export async function saveClaim(record: ClaimRecord): Promise<void> {
  await prisma.claim.upsert({
    where: { token: record.token },
    update: {
      recipientName: record.recipientName,
      courseTitle: record.courseTitle,
      courseId: record.courseId,
      studentIdHash: record.studentIdHash,
      issueDate: record.issueDate,
      ects: record.ects,
      eqfLevel: record.eqfLevel,
      assessmentType: record.assessmentType,
      participationMode: record.participationMode,
      learningOutcomes: record.learningOutcomes,
      evidences: record.evidences as unknown as Prisma.InputJsonValue,
      ipfsCid: record.ipfsCid ?? null,
      walletAddress: record.walletAddress,
      claimed: record.claimed,
      tokenId: record.tokenId ?? null,
      txHash: record.txHash ?? null,
      expiresAt: new Date(record.expiresAt),
    },
    create: {
      token: record.token,
      recipientName: record.recipientName,
      courseTitle: record.courseTitle,
      courseId: record.courseId,
      studentIdHash: record.studentIdHash,
      issueDate: record.issueDate,
      ects: record.ects,
      eqfLevel: record.eqfLevel,
      assessmentType: record.assessmentType,
      participationMode: record.participationMode,
      learningOutcomes: record.learningOutcomes,
      evidences: record.evidences as unknown as Prisma.InputJsonValue,
      ipfsCid: record.ipfsCid ?? null,
      walletAddress: record.walletAddress,
      claimed: record.claimed,
      tokenId: record.tokenId ?? null,
      txHash: record.txHash ?? null,
      expiresAt: new Date(record.expiresAt),
      createdAt: new Date(record.createdAt),
    },
  });
}

export async function getPendingClaims(): Promise<ClaimRecord[]> {
  const rows = await prisma.claim.findMany({
    where: { claimed: false, expiresAt: { gte: new Date() } },
  });
  return rows.map(toClaimRecord);
}

export async function getClaim(token: string): Promise<ClaimRecord | null> {
  const row = await prisma.claim.findUnique({ where: { token } });
  if (!row) return null;
  if (Date.now() > row.expiresAt.getTime()) return null;
  return toClaimRecord(row);
}

export async function associateWallet(
  token: string,
  walletAddress: string,
  tokenId?: string,
  txHash?: string
): Promise<ClaimRecord | null> {
  const row = await prisma.claim.findUnique({ where: { token } });
  if (!row) return null;
  if (Date.now() > row.expiresAt.getTime()) return null;

  const updated = await prisma.claim.update({
    where: { token },
    data: {
      walletAddress,
      claimed: true,
      ...(tokenId ? { tokenId } : {}),
      ...(txHash ? { txHash } : {}),
    },
  });

  return toClaimRecord(updated);
}

export function makeExpiry(): number {
  return Date.now() + TTL_MS;
}
