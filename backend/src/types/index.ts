export interface MintRequest {
  studentWallet: string;
  courseName: string;
  studentId: string;
  issuedAt: string;
  courseId: string;
}

export interface MintResult {
  tokenId: string;
  txHash: string;
  ipfsCid: string;
}

export interface RevokeRequest {
  tokenId: number;
}

export interface RevokeResult {
  txHash: string;
  tokenId: number;
}

export interface CertificateInfo {
  tokenId: string;
  owner: string;
  isRevoked: boolean;
  isLocked: boolean;
  tokenURI: string | null;
  metadata: Record<string, unknown> | null;
}

export interface EvidenceItem {
  type: string;
  title: string;
  url: string;
  hash?: string;
  mimeType?: string;
}

export interface CertificateMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{ trait_type: string; value: string }>;
  evidence?: EvidenceItem[];
}

export interface ClaimRecord {
  token: string;
  recipientName: string;
  recipientEmail: string;
  courseTitle: string;
  courseId: string;
  studentIdHash: string;
  issueDate: string;
  ects: number;
  eqfLevel: number;
  assessmentType: string;
  participationMode: string;
  learningOutcomes: string;
  evidences: EvidenceItem[];
  ipfsCid?: string;
  walletAddress: string | null;
  claimed: boolean;
  tokenId?: string;
  txHash?: string;
  expiresAt: number;
  createdAt: number;
}
