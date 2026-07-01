import { PinataSDK } from "pinata";
import { CertificateMetadata } from "../types";

// Module-level singleton — created once and reused for all calls
const _jwt = process.env.PINATA_JWT;
if (!_jwt) throw new Error("PINATA_JWT not set");
const pinata = new PinataSDK({ pinataJwt: _jwt });

export async function uploadMetadata(
  metadata: CertificateMetadata
): Promise<string> {
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

/**
 * Uploads a Buffer (from multer memory storage) to IPFS via Pinata.
 * Returns { cid, ipfsUri } on success, or null on failure.
 */
export async function uploadBufferToIPFS(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ cid: string; ipfsUri: string } | null> {
  try {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "evidence";
    const file = new File([new Uint8Array(buffer)], safeName, { type: mimeType });
    const result = await pinata.upload.public
      .file(file)
      .name(`educert-evidence-${Date.now()}-${safeName}`);
    return { cid: result.cid, ipfsUri: `ipfs://${result.cid}` };
  } catch (err) {
    console.error(`[ipfs] uploadBufferToIPFS failed for "${filename}":`, err);
    return null;
  }
}
