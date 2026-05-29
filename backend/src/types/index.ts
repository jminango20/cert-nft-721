export interface MintRequest {
  studentWallet: string;
  courseName: string;
  studentIdHash: string;
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
