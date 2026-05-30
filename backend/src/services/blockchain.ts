import { ethers } from "ethers";
import { CertificateInfo } from "../types";
import { getTx } from "./TxIndex";

const ABI = [
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

function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL not set");
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getSigner(): ethers.Wallet {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("PRIVATE_KEY not set");
  return new ethers.Wallet(privateKey, getProvider());
}

function getContract(withSigner = false): ethers.Contract {
  const address = process.env.CONTRACT_ADDRESS;
  if (!address) throw new Error("CONTRACT_ADDRESS not set");
  const runner = withSigner ? getSigner() : getProvider();
  return new ethers.Contract(address, ABI, runner);
}

export async function mintCertificate(
  studentWallet: string,
  ipfsUri: string
): Promise<{ tokenId: string; txHash: string }> {
  const contract = getContract(true);
  const tx = await contract.mint(studentWallet, ipfsUri);
  const receipt = await tx.wait();

  const iface = new ethers.Interface(ABI);
  let tokenId = "0";
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

  return { tokenId, txHash: receipt.hash };
}

export async function revokeCertificate(
  tokenId: number
): Promise<{ txHash: string }> {
  const contract = getContract(true);
  const tx = await contract.revoke(tokenId);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

export async function getCertificateInfo(
  tokenId: number
): Promise<CertificateInfo> {
  const contract = getContract(false);

  const [owner, isRevoked] = await Promise.all([
    contract.ownerOf(tokenId).catch(() => null),
    contract.isRevoked(tokenId).catch(() => false),
  ]);

  if (!owner) {
    throw Object.assign(new Error("Token does not exist"), { status: 404 });
  }

  let tokenURI: string | null = null;
  let isLocked = true;
  let txHash: string | null = null;

  if (!isRevoked) {
    [tokenURI] = await Promise.all([
      contract.tokenURI(tokenId).catch(() => null),
    ]);
  }

  txHash = getTx(tokenId.toString());

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
