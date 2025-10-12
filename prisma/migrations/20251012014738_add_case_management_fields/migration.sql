-- AlterTable
ALTER TABLE "Case" ADD COLUMN "closedAt" DATETIME;
ALTER TABLE "Case" ADD COLUMN "closedBy" TEXT;
ALTER TABLE "Case" ADD COLUMN "forwardedAt" DATETIME;
ALTER TABLE "Case" ADD COLUMN "forwardedBy" TEXT;
ALTER TABLE "Case" ADD COLUMN "riskLevel" TEXT;
ALTER TABLE "Case" ADD COLUMN "riskScore" INTEGER;

-- CreateIndex
CREATE INDEX "Case_riskLevel_idx" ON "Case"("riskLevel");

-- CreateIndex
CREATE INDEX "Case_priority_idx" ON "Case"("priority");
