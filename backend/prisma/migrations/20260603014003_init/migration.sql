-- CreateTable
CREATE TABLE "Certificate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tokenId" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "courseTitle" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    "claimToken" TEXT,
    "claimExpiresAt" DATETIME,
    "claimedAt" DATETIME,
    "claimedBy" TEXT,
    "ipfsCid" TEXT NOT NULL,
    "ownerAddress" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_tokenId_key" ON "Certificate"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_claimToken_key" ON "Certificate"("claimToken");
