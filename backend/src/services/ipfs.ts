import { PinataSDK } from "pinata";
import { CertificateMetadata } from "../types";

function getClient(): PinataSDK {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT not set");
  return new PinataSDK({ pinataJwt: jwt });
}

export async function uploadMetadata(
  metadata: CertificateMetadata
): Promise<string> {
  const pinata = getClient();
  const result = await pinata.upload.public
    .json(metadata)
    .name(`educert-${Date.now()}`);
  return `ipfs://${result.cid}`;
}

/**
 * Fetches a file from `url` and pins it to IPFS via Pinata.
 * Returns the ipfs:// URI on success, or `null` if the upload fails.
 */
export async function uploadEvidenceFile(
  url: string,
  title: string
): Promise<string | null> {
  try {
    const pinata = getClient();

    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = title.replace(/[^a-zA-Z0-9._-]/g, "_") || "evidence";
    const contentType =
      response.headers.get("content-type") ?? "application/octet-stream";

    const file = new File([buffer], safeName, { type: contentType });
    const result = await pinata.upload.public
      .file(file)
      .name(`educert-evidence-${Date.now()}-${title}`);

    return `ipfs://${result.cid}`;
  } catch (err) {
    console.error(`[ipfs] uploadEvidenceFile failed for "${url}":`, err);
    return null;
  }
}
