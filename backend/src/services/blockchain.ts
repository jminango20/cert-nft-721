import { ethers } from "ethers";
import { CertificateInfo } from "../types";
import { getTx, saveTx } from "./TxIndex";

export const ABI = [
  "function mint(address to, string calldata uri) external returns (uint256)",
  "function revoke(uint256 tokenId) external",
  "function isRevoked(uint256 tokenId) public view returns (bool)",
  "function tokenURI(uint256 tokenId) public view returns (string memory)",
  "function locked(uint256 tokenId) external view returns (bool)",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "event CertificateMinted(address indexed to, uint256 indexed tokenId, string uri)",
  "event CertificateRevoked(uint256 indexed tokenId)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

// H1: Module-level singletons — created once, reused on every request
let _provider: ethers.JsonRpcProvider | null = null;
let _signer: ethers.Wallet | null = null;

export function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) throw new Error("RPC_URL not set");
    _provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return _provider;
}

export function getSigner(): ethers.Wallet {
  if (!_signer) {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY not set");
    _signer = new ethers.Wallet(privateKey, getProvider());
  }
  return _signer;
}

// H2: Exported read-only contract for use in other route files
export function getReadContract(): ethers.Contract {
  const address = process.env.CONTRACT_ADDRESS;
  if (!address) throw new Error("CONTRACT_ADDRESS not set");
  return new ethers.Contract(address, ABI, getProvider());
}

function getWriteContract(): ethers.Contract {
  const address = process.env.CONTRACT_ADDRESS;
  if (!address) throw new Error("CONTRACT_ADDRESS not set");
  return new ethers.Contract(address, ABI, getSigner());
}

export async function mintCertificate(
  studentWallet: string,
  ipfsUri: string
): Promise<{ tokenId: string; txHash: string }> {
  const contract = getWriteContract();
  const tx = await contract.mint(studentWallet, ipfsUri);
  const receipt = await tx.wait();

  const iface = new ethers.Interface(ABI);
  let tokenId: string | null = null;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "CertificateMinted") {
        tokenId = parsed.args.tokenId.toString();
        break;
      }
    } catch {
      // not our event
    }
  }

  // H4: Throw descriptive error instead of silently returning "0"
  if (tokenId === null) {
    throw new Error(
      "CertificateMinted event not found in transaction receipt — possible ABI mismatch"
    );
  }

  // H5: Persist tx hash so it can be retrieved later
  await saveTx(tokenId, receipt.hash);

  return { tokenId, txHash: receipt.hash };
}

export async function revokeCertificate(
  tokenId: number
): Promise<{ txHash: string }> {
  const contract = getWriteContract();
  const tx = await contract.revoke(tokenId);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

export async function getCertificateInfo(
  tokenId: number
): Promise<CertificateInfo> {
  const contract = getReadContract();

  const [owner, isRevoked, isLocked] = await Promise.all([
    contract.ownerOf(tokenId).catch(() => null),
    contract.isRevoked(tokenId).catch(() => false),
    contract.locked(tokenId).catch(() => true),
  ]);

  if (!owner) {
    throw Object.assign(new Error("Token does not exist"), { status: 404 });
  }

  let tokenURI: string | null = null;

  if (!isRevoked) {
    tokenURI = await contract.tokenURI(tokenId).catch(() => null);
  }

  // C2: getTx is now async
  const txHash = await getTx(tokenId.toString());

  return {
    tokenId: tokenId.toString(),
    owner,
    isRevoked,
    isLocked,
    tokenURI,
    txHash,
    metadata: null,
  };
}
