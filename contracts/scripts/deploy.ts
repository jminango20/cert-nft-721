import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying CertificateNFT with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MATIC");

  // The deployer receives ADMIN_ROLE and ISSUER_ROLE by default.
  // Pass a multisig address here in production.
  const adminAddress = process.env.ADMIN_ADDRESS ?? deployer.address;
  const collectionName   = process.env.NFT_NAME   ?? "EduCert Certificate";
  const collectionSymbol = process.env.NFT_SYMBOL ?? "EDUCERT";

  const CertificateNFT = await ethers.getContractFactory("CertificateNFT");
  const contract = await CertificateNFT.deploy(
    collectionName,
    collectionSymbol,
    adminAddress
  );
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("CertificateNFT deployed to:", address);
  console.log("Name:", collectionName, "| Symbol:", collectionSymbol);
  console.log("Admin / Issuer:", adminAddress);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
