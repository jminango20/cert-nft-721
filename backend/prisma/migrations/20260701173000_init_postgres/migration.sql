-- CreateTable
CREATE TABLE "Certificate" (
    "id" SERIAL NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "courseTitle" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "claimToken" TEXT,
    "claimExpiresAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "claimedBy" TEXT,
    "ipfsCid" TEXT NOT NULL,
    "ownerAddress" TEXT,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "token" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "courseTitle" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentIdHash" TEXT NOT NULL,
    "issueDate" TEXT NOT NULL,
    "ects" DOUBLE PRECISION NOT NULL,
    "eqfLevel" INTEGER NOT NULL,
    "assessmentType" TEXT NOT NULL,
    "participationMode" TEXT NOT NULL,
    "learningOutcomes" TEXT NOT NULL,
    "evidences" JSONB NOT NULL,
    "ipfsCid" TEXT,
    "walletAddress" TEXT,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "tokenId" TEXT,
    "txHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "TxIndexEntry" (
    "tokenId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,

    CONSTRAINT "TxIndexEntry_pkey" PRIMARY KEY ("tokenId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_tokenId_key" ON "Certificate"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_claimToken_key" ON "Certificate"("claimToken");
