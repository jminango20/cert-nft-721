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
