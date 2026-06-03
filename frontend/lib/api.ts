const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

// Authenticated mutations route through Next.js server-side handlers so that
// the API key is never included in the client bundle.
async function postLocal<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

export interface MintPayload {
  studentWallet: string;
  courseName: string;
  studentIdHash: string;
  issuedAt: string;
  courseId: string;
}

export interface MintResult {
  tokenId?: string;
  txHash?: string;
  ipfsCid: string;
  claimToken?: string;
  flow: "direct-mint" | "claim-by-email";
}

export interface CertificateInfo {
  tokenId: string;
  owner: string;
  isRevoked: boolean;
  isLocked: boolean;
  tokenURI: string | null;
  txHash: string | null;
  metadata: Record<string, unknown> | null;
}

export interface ClaimPreview {
  courseTitle: string;
  courseId: string;
  issueDate: string;
  ects: number;
  eqfLevel: number;
  assessmentType: string;
  participationMode: string;
  learningOutcomes: string;
  evidences: EvidenceItem[];
  ipfsCid?: string;
  alreadyClaimed: boolean;
  tokenId?: string;
}

export interface EvidenceItem {
  type: string;
  title: string;
  url: string;
  hash?: string;
  mimeType?: string;
}

export interface OwnedCertificate {
  tokenId: string;
  metadata: Record<string, unknown> | null;
  isRevoked: boolean;
  txHash: string | null;
  recipientName: string | null;
}

export const api = {
  // Calls the local Next.js route handler — API key stays server-side only.
  mint: (payload: MintPayload) => postLocal<MintResult>("/api/mint", payload),
  revoke: (tokenId: number) =>
    postLocal<{ txHash: string; tokenId: number }>("/api/revoke", { tokenId }),
  // Public read — goes directly to backend, no secret needed.
  verify: (tokenId: string | number) => get<CertificateInfo>(`/api/verify/${tokenId}`),
  // Claim flow
  getClaim: (token: string) => get<ClaimPreview>(`/api/claim/${token}`),
  // Wallet-based certificate listing
  getCertificatesByOwner: (owner: string) =>
    get<OwnedCertificate[]>(`/api/certificates?owner=${encodeURIComponent(owner)}`),
};
