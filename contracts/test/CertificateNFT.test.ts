import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { CertificateNFT, CertificateNFT__factory } from "../typechain-types";

const ISSUER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ISSUER_ROLE"));
const SAMPLE_URI  = "ipfs://QmSampleCIDforEduCertTest000000000000000000000";

describe("CertificateNFT", function () {
  let contract: CertificateNFT;
  let admin: SignerWithAddress;
  let issuer: SignerWithAddress;
  let student: SignerWithAddress;
  let other: SignerWithAddress;

  beforeEach(async function () {
    [admin, issuer, student, other] = await ethers.getSigners();

    contract = await new CertificateNFT__factory(admin).deploy(
      "EduCert Certificate",
      "EDUCERT",
      admin.address
    );
    await contract.waitForDeployment();

    // Grant ISSUER_ROLE to the dedicated issuer account
    await contract.connect(admin).grantRole(ISSUER_ROLE, issuer.address);
  });

  // ================================================================ mint
  describe("mint", function () {
    it("issuer can mint — tokenURI matches and owner is correct", async function () {
      const tx = await contract.connect(issuer).mint(student.address, SAMPLE_URI);
      const receipt = await tx.wait();

      // Retrieve the tokenId returned from the mint call via events
      const mintedEvent = receipt?.logs
        .map((log) => {
          try { return contract.interface.parseLog(log); } catch { return null; }
        })
        .find((e) => e?.name === "CertificateMinted");

      expect(mintedEvent).to.not.be.undefined;
      const tokenId = mintedEvent!.args.tokenId as bigint;

      expect(await contract.ownerOf(tokenId)).to.equal(student.address);
      expect(await contract.tokenURI(tokenId)).to.equal(SAMPLE_URI);
    });

    it("mint emits CertificateMinted and Locked events", async function () {
      await expect(contract.connect(issuer).mint(student.address, SAMPLE_URI))
        .to.emit(contract, "CertificateMinted")
        .withArgs(student.address, 1n, SAMPLE_URI)
        .and.to.emit(contract, "Locked")
        .withArgs(1n);
    });

    it("token IDs auto-increment starting at 1", async function () {
      await contract.connect(issuer).mint(student.address, SAMPLE_URI);
      await contract.connect(issuer).mint(student.address, SAMPLE_URI);

      // First token is 1, second is 2
      expect(await contract.ownerOf(1n)).to.equal(student.address);
      expect(await contract.ownerOf(2n)).to.equal(student.address);
    });

    it("non-issuer cannot mint — reverts with AccessControlUnauthorizedAccount", async function () {
      await expect(
        contract.connect(other).mint(student.address, SAMPLE_URI)
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });
  });

  // ================================================================ revoke
  describe("revoke", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      const tx = await contract.connect(issuer).mint(student.address, SAMPLE_URI);
      const receipt = await tx.wait();
      const mintedEvent = receipt?.logs
        .map((log) => {
          try { return contract.interface.parseLog(log); } catch { return null; }
        })
        .find((e) => e?.name === "CertificateMinted");
      tokenId = mintedEvent!.args.tokenId as bigint;
    });

    it("issuer can revoke — isRevoked returns true", async function () {
      await expect(contract.connect(issuer).revoke(tokenId))
        .to.emit(contract, "CertificateRevoked")
        .withArgs(tokenId);

      expect(await contract.isRevoked(tokenId)).to.be.true;
      expect(await contract.revoked(tokenId)).to.be.true;
    });

    it("non-issuer cannot revoke — reverts with AccessControlUnauthorizedAccount", async function () {
      await expect(
        contract.connect(other).revoke(tokenId)
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });

    it("revoking a non-existent token reverts with TokenDoesNotExist", async function () {
      await expect(
        contract.connect(issuer).revoke(999n)
      ).to.be.revertedWithCustomError(contract, "TokenDoesNotExist");
    });

    it("revoking an already-revoked token reverts with TokenAlreadyRevoked", async function () {
      await contract.connect(issuer).revoke(tokenId);
      await expect(
        contract.connect(issuer).revoke(tokenId)
      ).to.be.revertedWithCustomError(contract, "TokenAlreadyRevoked");
    });
  });

  // ================================================================ soulbound / transfer
  describe("soulbound — transfers must revert", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      const tx = await contract.connect(issuer).mint(student.address, SAMPLE_URI);
      const receipt = await tx.wait();
      const mintedEvent = receipt?.logs
        .map((log) => {
          try { return contract.interface.parseLog(log); } catch { return null; }
        })
        .find((e) => e?.name === "CertificateMinted");
      tokenId = mintedEvent!.args.tokenId as bigint;
    });

    it("transferFrom reverts with SoulboundTransferNotAllowed", async function () {
      await expect(
        contract
          .connect(student)
          .transferFrom(student.address, other.address, tokenId)
      ).to.be.revertedWithCustomError(contract, "SoulboundTransferNotAllowed");
    });

    it("safeTransferFrom reverts with SoulboundTransferNotAllowed", async function () {
      await expect(
        contract
          .connect(student)
          ["safeTransferFrom(address,address,uint256)"](
            student.address,
            other.address,
            tokenId
          )
      ).to.be.revertedWithCustomError(contract, "SoulboundTransferNotAllowed");
    });

    it("transfer from admin also reverts (soulbound ignores roles)", async function () {
      await expect(
        contract
          .connect(admin)
          .transferFrom(student.address, other.address, tokenId)
      ).to.be.revertedWithCustomError(contract, "SoulboundTransferNotAllowed");
    });
  });

  // ================================================================ tokenURI
  describe("tokenURI", function () {
    it("returns the correct IPFS URI set at mint", async function () {
      await contract.connect(issuer).mint(student.address, SAMPLE_URI);
      expect(await contract.tokenURI(1n)).to.equal(SAMPLE_URI);
    });

    it("reverts for a revoked token", async function () {
      await contract.connect(issuer).mint(student.address, SAMPLE_URI);
      await contract.connect(issuer).revoke(1n);
      await expect(
        contract.tokenURI(1n)
      ).to.be.revertedWithCustomError(contract, "TokenAlreadyRevoked");
    });

    it("reverts for a non-existent token", async function () {
      await expect(
        contract.tokenURI(999n)
      ).to.be.revertedWithCustomError(contract, "TokenDoesNotExist");
    });
  });

  // ================================================================ EIP-5192
  describe("EIP-5192 locked()", function () {
    it("returns true for a minted token", async function () {
      await contract.connect(issuer).mint(student.address, SAMPLE_URI);
      expect(await contract.locked(1n)).to.be.true;
    });

    it("reverts for a non-existent token", async function () {
      await expect(
        contract.locked(999n)
      ).to.be.revertedWithCustomError(contract, "TokenDoesNotExist");
    });
  });

  // ================================================================ supportsInterface
  describe("supportsInterface", function () {
    it("supports EIP-5192 interface (0xb45a3c0e)", async function () {
      expect(await contract.supportsInterface("0xb45a3c0e")).to.be.true;
    });

    it("supports ERC-721 interface (0x80ac58cd)", async function () {
      expect(await contract.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("supports IAccessControl interface (0x7965db0b)", async function () {
      expect(await contract.supportsInterface("0x7965db0b")).to.be.true;
    });

    it("does not support a random unknown interface", async function () {
      expect(await contract.supportsInterface("0xdeadbeef")).to.be.false;
    });
  });
});
