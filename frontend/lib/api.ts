const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

async function post<T>(path: string, body: unknown, auth = false): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers["x-api-key"] = API_KEY;

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers,
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
  tokenId: string;
  txHash: string;
  ipfsCid: string;
}

export interface CertificateInfo {
  tokenId: string;
  owner: string;
  isRevoked: boolean;
  isLocked: boolean;
  tokenURI: string | null;
  metadata: Record<string, unknown> | null;
}

export const api = {
  mint: (payload: MintPayload) => post<MintResult>("/api/mint", payload, true),
  revoke: (tokenId: number) => post<{ txHash: string; tokenId: number }>("/api/revoke", { tokenId }, true),
  verify: (tokenId: string | number) => get<CertificateInfo>(`/api/verify/${tokenId}`),
};
