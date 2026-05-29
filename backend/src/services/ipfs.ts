import { Readable } from "stream";
import PinataClient from "@pinata/sdk";
import { CertificateMetadata } from "../types";

function getClient(): PinataClient {
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;
  if (!apiKey || !secretKey) throw new Error("Pinata credentials not set");
  return new PinataClient(apiKey, secretKey);
}

export async function uploadMetadata(
  metadata: CertificateMetadata
): Promise<string> {
  const pinata = getClient();
  const result = await pinata.pinJSONToIPFS(metadata, {
    pinataMetadata: { name: `educert-${Date.now()}` },
  });
  return `ipfs://${result.IpfsHash}`;
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
    const readable = Readable.from(buffer);

    // pinFileToIPFS requires the stream to have a `path` property so Pinata
    // can derive the filename used in the multipart upload.
    (readable as unknown as { path: string }).path =
      title.replace(/[^a-zA-Z0-9._-]/g, "_") || "evidence";

    const result = await pinata.pinFileToIPFS(readable, {
      pinataMetadata: { name: `educert-evidence-${Date.now()}-${title}` },
    });

    return `ipfs://${result.IpfsHash}`;
  } catch (err) {
    console.error(`[ipfs] uploadEvidenceFile failed for "${url}":`, err);
    return null;
  }
}
